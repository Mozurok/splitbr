// A assinatura é o ponto do contrato v1.1.0 com mais chance de sair quase
// certa: o b64=false da RFC 7797 muda o que entra no cálculo, e uma
// implementação que codifique o payload por hábito produz um header bem
// formado que nunca valida. Estes testes fixam os bytes exatos.
import { describe, expect, it } from "vitest";
import { createSign, generateKeyPairSync } from "node:crypto";
import {
  ErroDeAssinatura,
  assinarRequisicao,
  base64url,
  conferirFormaDoHeader,
  montarEntradaDeAssinatura,
  montarProtectedHeader,
} from "../src/assinatura.js";
import { canonicalizarJcsBytes } from "../src/jcs.js";

const JTI = "9f1f4b7e-6a2c-4d3e-8b5a-1c2d3e4f5a6b";
const IAT = 1_774_000_000;
const fixo = { kid: "chave-01", agora: () => IAT, gerarJti: () => JTI };

// Um assinante determinístico: devolve os próprios bytes de entrada como se
// fossem a assinatura. Não é RS256, mas deixa inspecionar exatamente o que foi
// passado para assinar, que é o que estes testes precisam verificar.
const assinanteEspelho = (bytes: Uint8Array) => bytes;

describe("protected header (manual v1.1.0, capítulo 8)", () => {
  it("traz os sete atributos obrigatórios com os valores fixos", () => {
    const h = montarProtectedHeader({ ...fixo, assinar: assinanteEspelho });
    expect(h).toEqual({
      alg: "RS256",
      typ: "JWS",
      kid: "chave-01",
      jti: JTI,
      iat: IAT,
      b64: false,
      crit: ["b64"],
    });
  });

  it("exige kid, porque sem ele o receptor não sabe qual chave usar", () => {
    expect(() => montarProtectedHeader({ kid: "", assinar: assinanteEspelho })).toThrow(
      ErroDeAssinatura,
    );
  });

  it("gera um jti novo por requisição, senão o anti-replay não serve de nada", () => {
    const a = montarProtectedHeader({ kid: "k", assinar: assinanteEspelho });
    const b = montarProtectedHeader({ kid: "k", assinar: assinanteEspelho });
    expect(a.jti).not.toBe(b.jti);
    expect(a.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("entrada de assinatura (RFC 7797, b64=false)", () => {
  it("o payload entra CRU, não em Base64URL", () => {
    const payload = canonicalizarJcsBytes({ a: 1 });
    const entrada = montarEntradaDeAssinatura("UExBQ0VIT0xERVI", payload);
    const texto = new TextDecoder().decode(entrada);

    expect(texto).toBe('UExBQ0VIT0xERVI.{"a":1}');
    // O erro clássico seria terminar com o payload em Base64URL:
    expect(texto).not.toContain(base64url(payload));
  });

  it("preserva bytes multibyte sem reencode", () => {
    const payload = canonicalizarJcsBytes({ "€": 1 });
    const entrada = montarEntradaDeAssinatura("AA", payload);
    expect(entrada.length).toBe(3 + payload.length);
    expect(new TextDecoder().decode(entrada)).toBe('AA.{"€":1}');
  });
});

describe("assinarRequisicao", () => {
  it("produz o formato detached: protected..signature, com o meio vazio", async () => {
    const r = await assinarRequisicao({ b: 2, a: 1 }, { ...fixo, assinar: assinanteEspelho });
    const partes = r.header.split(".");
    expect(partes).toHaveLength(3);
    expect(partes[1]).toBe("");
    expect(partes[0]).not.toBe("");
    expect(partes[2]).not.toBe("");
  });

  it("assina exatamente os bytes canonicalizados que devolve como corpo", async () => {
    let vistos: Uint8Array | undefined;
    const r = await assinarRequisicao(
      { b: 2, a: 1 },
      {
        ...fixo,
        assinar: (bytes) => {
          vistos = bytes;
          return bytes;
        },
      },
    );

    const [protectedB64 = ""] = r.header.split(".");
    const esperado = montarEntradaDeAssinatura(protectedB64, r.corpoCanonico);
    expect(vistos).toEqual(esperado);
    // E o corpo devolvido é o canônico, com as chaves ordenadas:
    expect(new TextDecoder().decode(r.corpoCanonico)).toBe('{"a":1,"b":2}');
  });

  it("o corpo canônico é o que deve ser enviado, não o objeto original", async () => {
    const original = { vlPago: 10.02, arrj: "BOL" };
    const r = await assinarRequisicao(original, { ...fixo, assinar: assinanteEspelho });

    // JSON.stringify do original preserva a ordem de inserção e divergiria:
    expect(JSON.stringify(original)).not.toBe(new TextDecoder().decode(r.corpoCanonico));
    expect(new TextDecoder().decode(r.corpoCanonico)).toBe('{"arrj":"BOL","vlPago":10.02}');
  });

  it("aceita assinante assíncrono, que é o caso de HSM e KMS", async () => {
    const r = await assinarRequisicao(
      { a: 1 },
      { ...fixo, assinar: async (b) => Promise.resolve(b) },
    );
    expect(r.header).toContain("..");
  });

  it("recusa um assinante que devolve lixo, em vez de mandar header inválido", async () => {
    await expect(
      assinarRequisicao({ a: 1 }, { ...fixo, assinar: () => new Uint8Array(0) }),
    ).rejects.toThrow(ErroDeAssinatura);
    await expect(
      // @ts-expect-error validação de runtime para quem chama de JavaScript
      assinarRequisicao({ a: 1 }, { ...fixo, assinar: () => "nao sou bytes" }),
    ).rejects.toThrow(ErroDeAssinatura);
  });
});

describe("assinatura RS256 de verdade", () => {
  it("um verificador independente valida o que produzimos", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

    const r = await assinarRequisicao(
      { infRequisicao: { dtHrMsg: "2026-03-22T12:00:00-03:00" }, valor: 10.02 },
      {
        ...fixo,
        assinar: (bytes) => {
          const s = createSign("RSA-SHA256");
          s.update(bytes);
          s.end();
          return new Uint8Array(s.sign(privateKey));
        },
      },
    );

    // Reconstrói a entrada do zero, como faria a plataforma ao receber o
    // header e o corpo, e verifica com a chave pública.
    const [protectedB64 = "", vazio, assinaturaB64 = ""] = r.header.split(".");
    expect(vazio).toBe("");

    const entrada = montarEntradaDeAssinatura(protectedB64, r.corpoCanonico);
    const assinatura = Buffer.from(
      assinaturaB64.replaceAll("-", "+").replaceAll("_", "/"),
      "base64",
    );

    const { createVerify } = await import("node:crypto");
    const v = createVerify("RSA-SHA256");
    v.update(entrada);
    v.end();
    expect(v.verify(publicKey, assinatura)).toBe(true);
  });

  it("mexer um byte do corpo invalida a assinatura", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const r = await assinarRequisicao(
      { valor: 10.02 },
      {
        ...fixo,
        assinar: (bytes) => {
          const s = createSign("RSA-SHA256");
          s.update(bytes);
          s.end();
          return new Uint8Array(s.sign(privateKey));
        },
      },
    );

    const [protectedB64 = "", , assinaturaB64 = ""] = r.header.split(".");
    const adulterado = canonicalizarJcsBytes({ valor: 10.03 });
    const entrada = montarEntradaDeAssinatura(protectedB64, adulterado);

    const { createVerify } = await import("node:crypto");
    const v = createVerify("RSA-SHA256");
    v.update(entrada);
    v.end();
    expect(
      v.verify(publicKey, Buffer.from(assinaturaB64.replaceAll("-", "+").replaceAll("_", "/"), "base64")),
    ).toBe(false);
  });
});

describe("conferirFormaDoHeader", () => {
  it("aprova um header que nós mesmos produzimos", async () => {
    const r = await assinarRequisicao({ a: 1 }, { ...fixo, assinar: assinanteEspelho });
    const { problemas, protegido } = conferirFormaDoHeader(r.header);
    expect(problemas).toEqual([]);
    expect(protegido?.kid).toBe("chave-01");
  });

  it("reprova alg errado, que é a tentação de quem usa uma lib genérica", () => {
    const cabecalho = base64url(
      new TextEncoder().encode(
        JSON.stringify({ alg: "HS256", typ: "JWS", kid: "k", jti: JTI, iat: IAT, b64: false, crit: ["b64"] }),
      ),
    );
    const { problemas } = conferirFormaDoHeader(`${cabecalho}..AAAA`);
    expect(problemas).toContain("alg deve ser RS256, veio HS256");
  });

  it("reprova b64 ausente ou true, que muda o que foi assinado", () => {
    const cabecalho = base64url(
      new TextEncoder().encode(
        JSON.stringify({ alg: "RS256", typ: "JWS", kid: "k", jti: JTI, iat: IAT, b64: true, crit: ["b64"] }),
      ),
    );
    expect(conferirFormaDoHeader(`${cabecalho}..AAAA`).problemas).toContain(
      "b64 deve ser false, veio true",
    );
  });

  it("reprova jti que não é UUID v4", () => {
    const cabecalho = base64url(
      new TextEncoder().encode(
        JSON.stringify({ alg: "RS256", typ: "JWS", kid: "k", jti: "123", iat: IAT, b64: false, crit: ["b64"] }),
      ),
    );
    expect(conferirFormaDoHeader(`${cabecalho}..AAAA`).problemas).toContain("jti deve ser UUID v4");
  });

  it("reprova payload presente: detached quer dizer ausente", () => {
    const cabecalho = base64url(
      new TextEncoder().encode(
        JSON.stringify({ alg: "RS256", typ: "JWS", kid: "k", jti: JTI, iat: IAT, b64: false, crit: ["b64"] }),
      ),
    );
    expect(conferirFormaDoHeader(`${cabecalho}.eyJhIjoxfQ.AAAA`).problemas).toContain(
      "o payload deveria estar ausente (formato detached), mas veio preenchido",
    );
  });

  it("reprova o que nem parece um JWS", () => {
    expect(conferirFormaDoHeader("qualquer-coisa").problemas[0]).toMatch(/3 partes/);
    expect(conferirFormaDoHeader("!!..AAAA").problemas).toContain(
      "protected header não é Base64URL de um JSON válido",
    );
  });
});
