/**
 * Assinatura `X-JWS-Signature` do contrato v1.1.0.
 *
 * O Manual de Integração v1.1.0, capítulo 8, exige que toda requisição carregue
 * uma assinatura JWS Compact Detached (RFC 7515) sobre o corpo canonicalizado
 * em JCS (RFC 8785), com sete atributos obrigatórios no protected header.
 *
 * **Este módulo não assina nada.** Ele canonicaliza, monta o protected header,
 * calcula os bytes exatos que devem ser assinados e remonta o resultado no
 * formato detached. A operação RS256 em si sai por um callback que você fornece,
 * então a chave privada nunca entra neste pacote e pode ficar onde deve estar,
 * num HSM ou num KMS.
 *
 * A divisão não é só de segurança, é de correção. O `b64: false` da RFC 7797
 * significa que a assinatura cobre os bytes crus do payload, não uma versão em
 * Base64URL. Se a assinatura viesse pronta de fora, quem assina teria que
 * serializar o corpo por conta própria, e duas serializações do mesmo objeto
 * divergem com facilidade (ordem de chave, formato de número, escaping). O
 * resultado seria uma assinatura válida sobre bytes que não são os enviados,
 * que a plataforma rejeita sem dizer por quê. Aqui só existe uma serialização.
 */
import { canonicalizarJcs } from "./jcs.js";

/** Assina os bytes com RS256 e devolve a assinatura crua (não codificada). */
export type AssinadorRs256 = (dadosParaAssinar: Uint8Array) => Promise<Uint8Array> | Uint8Array;

export interface OpcoesDeAssinatura {
  /** Identificador da chave, vai no `kid` e permite ao receptor selecioná-la. */
  kid: string;
  /** A operação RS256. Recebe os bytes exatos; devolve a assinatura crua. */
  assinar: AssinadorRs256;
  /** Relógio, em segundos epoch. Injetável para teste. */
  agora?: () => number;
  /** Gerador do `jti` (UUID v4). Injetável para teste. */
  gerarJti?: () => string;
}

/** O protected header exigido pelo capítulo 8 do manual. */
export interface ProtectedHeader {
  alg: "RS256";
  typ: "JWS";
  kid: string;
  jti: string;
  iat: number;
  b64: false;
  crit: ["b64"];
}

export class ErroDeAssinatura extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeAssinatura";
  }
}

/** Base64URL sem padding, como manda a RFC 7515. */
export function base64url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/**
 * Monta o protected header. O `iat` é NumericDate (segundos epoch, RFC 7519) e
 * o `jti` é um UUID v4 novo por requisição: o manual usa os dois para garantir
 * unicidade e permitir validação temporal, então reaproveitar um `jti` entre
 * requisições derruba justamente a proteção anti-replay que ele existe para dar.
 */
export function montarProtectedHeader(opcoes: OpcoesDeAssinatura): ProtectedHeader {
  if (!opcoes.kid) throw new ErroDeAssinatura("kid é obrigatório no protected header");
  const agora = opcoes.agora ?? (() => Math.floor(Date.now() / 1000));
  const gerarJti = opcoes.gerarJti ?? (() => crypto.randomUUID());

  return {
    alg: "RS256",
    typ: "JWS",
    kid: opcoes.kid,
    jti: gerarJti(),
    iat: agora(),
    b64: false,
    crit: ["b64"],
  };
}

/**
 * Os bytes que vão para a assinatura.
 *
 * Com `b64: false`, a RFC 7797 define a entrada como
 * `ASCII(BASE64URL(protected) || '.') || payload`, ou seja, o payload entra
 * cru, sem passar por Base64URL. É o ponto em que uma implementação distraída
 * codifica o payload por hábito e produz uma assinatura que nunca valida.
 */
export function montarEntradaDeAssinatura(
  protectedB64: string,
  payloadCanonico: Uint8Array,
): Uint8Array {
  const prefixo = new TextEncoder().encode(`${protectedB64}.`);
  const entrada = new Uint8Array(prefixo.length + payloadCanonico.length);
  entrada.set(prefixo, 0);
  entrada.set(payloadCanonico, prefixo.length);
  return entrada;
}

export interface ResultadoDaAssinatura {
  /** O valor pronto para o header `X-JWS-Signature`. */
  header: string;
  /** Os bytes canonicalizados: é este corpo que precisa ser enviado. */
  corpoCanonico: Uint8Array;
  /**
   * O mesmo corpo, em texto. Passar esta string ao `fetch` produz exatamente os
   * bytes de `corpoCanonico`, porque o `fetch` codifica em UTF-8, e é a forma
   * que `BodyInit` aceita sem conversão.
   */
  corpoCanonicoTexto: string;
  /** O protected header usado, útil para log e diagnóstico. */
  protegido: ProtectedHeader;
}

/**
 * Canonicaliza o corpo, assina e devolve o header no formato Compact Detached.
 *
 * O retorno traz `corpoCanonico` de propósito: **é esse corpo que precisa ir na
 * requisição.** Enviar o objeto original re-serializado invalida a assinatura,
 * porque os bytes seriam outros.
 */
export async function assinarRequisicao(
  corpo: unknown,
  opcoes: OpcoesDeAssinatura,
): Promise<ResultadoDaAssinatura> {
  const protegido = montarProtectedHeader(opcoes);
  const corpoCanonicoTexto = canonicalizarJcs(corpo);
  const corpoCanonico = new TextEncoder().encode(corpoCanonicoTexto);

  const protectedB64 = base64url(new TextEncoder().encode(JSON.stringify(protegido)));
  const entrada = montarEntradaDeAssinatura(protectedB64, corpoCanonico);

  const assinatura = await opcoes.assinar(entrada);
  if (!(assinatura instanceof Uint8Array) || assinatura.length === 0) {
    throw new ErroDeAssinatura(
      "o callback assinar() deve devolver a assinatura RS256 crua, como Uint8Array não vazio",
    );
  }

  // Detached: o payload sai do meio, sobrando `protected..signature`.
  return {
    header: `${protectedB64}..${base64url(assinatura)}`,
    corpoCanonico,
    corpoCanonicoTexto,
    protegido,
  };
}

/**
 * Lê o protected header de um `X-JWS-Signature` e confere os sete atributos.
 *
 * Serve para diagnóstico e para o mock: não verifica a assinatura, só a forma.
 * Devolve a lista de problemas, vazia quando o header está conforme.
 */
export function conferirFormaDoHeader(valor: string): {
  protegido?: ProtectedHeader;
  problemas: string[];
} {
  const problemas: string[] = [];
  const partes = valor.split(".");

  if (partes.length !== 3) {
    return { problemas: [`esperado formato compact com 3 partes, veio ${partes.length}`] };
  }
  const [cabecalhoB64 = "", payload = "", assinaturaB64 = ""] = partes;
  if (payload !== "") {
    problemas.push("o payload deveria estar ausente (formato detached), mas veio preenchido");
  }
  if (!assinaturaB64) problemas.push("assinatura ausente");

  let protegido: ProtectedHeader;
  try {
    const json = atob(cabecalhoB64.replaceAll("-", "+").replaceAll("_", "/"));
    protegido = JSON.parse(json) as ProtectedHeader;
  } catch {
    return { problemas: [...problemas, "protected header não é Base64URL de um JSON válido"] };
  }

  if (protegido.alg !== "RS256") problemas.push(`alg deve ser RS256, veio ${String(protegido.alg)}`);
  if (protegido.typ !== "JWS") problemas.push(`typ deve ser JWS, veio ${String(protegido.typ)}`);
  if (!protegido.kid) problemas.push("kid é obrigatório");
  if (protegido.b64 !== false) problemas.push(`b64 deve ser false, veio ${String(protegido.b64)}`);
  if (!Array.isArray(protegido.crit) || protegido.crit.length !== 1 || protegido.crit[0] !== "b64") {
    problemas.push('crit deve ser ["b64"]');
  }
  if (typeof protegido.iat !== "number" || !Number.isFinite(protegido.iat)) {
    problemas.push("iat deve ser NumericDate (segundos epoch)");
  }
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof protegido.jti !== "string" || !uuidV4.test(protegido.jti)) {
    problemas.push("jti deve ser UUID v4");
  }

  return { protegido, problemas };
}
