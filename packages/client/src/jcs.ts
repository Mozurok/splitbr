/**
 * JSON Canonicalization Scheme (JCS), RFC 8785.
 *
 * O contrato v1.1.0 exige que o corpo seja canonicalizado ANTES de assinar
 * (Manual de Integração v1.1.0, capítulo 8). Sem isso, dois JSON com o mesmo
 * conteúdo e ordem de chaves diferente produzem assinaturas diferentes, e a
 * plataforma rejeita.
 *
 * A implementação é curta porque o JavaScript já faz a maior parte do trabalho
 * certo, e vale registrar por quê, senão a próxima pessoa "melhora" isto:
 *
 * - **Ordenação**: a RFC manda ordenar os nomes de propriedade por unidades de
 *   código UTF-16, e é exatamente assim que o `<` de JavaScript compara
 *   strings. Então `Object.keys(x).sort()`, sem comparador, é a ordenação
 *   pedida. Passar um comparador com `localeCompare` quebraria: ele ordena por
 *   convenção de idioma, não por code unit.
 * - **Números**: a RFC adota o algoritmo `Number::toString` do ECMAScript, que
 *   é o mesmo que `JSON.stringify` já usa. Daí `1e+30` sair como `1e+30`.
 * - **Strings**: o escaping da RFC é o do JSON (RFC 8259), que
 *   `JSON.stringify` produz, inclusive `\uXXXX` para caracteres de controle.
 *
 * O que sobra para nós é ordenar as chaves e recusar o que a RFC não admite.
 */

/** Erro de canonicalização: o valor não tem representação JCS. */
export class ErroDeCanonicalizacao extends Error {
  readonly caminho: string;

  constructor(mensagem: string, caminho: string) {
    super(`${mensagem} (em ${caminho})`);
    this.name = "ErroDeCanonicalizacao";
    this.caminho = caminho;
  }
}

function serializar(valor: unknown, caminho: string): string {
  if (valor === null) return "null";

  switch (typeof valor) {
    case "boolean":
      return valor ? "true" : "false";

    case "number": {
      if (!Number.isFinite(valor)) {
        // NaN e Infinity não existem em JSON, e um assinante que os aceitasse
        // produziria bytes que o outro lado não consegue reproduzir.
        throw new ErroDeCanonicalizacao(`número não finito (${valor})`, caminho);
      }
      // -0 e 0 são o mesmo número em JSON; JSON.stringify(-0) daria "0", mas
      // ser explícito deixa a intenção clara para quem lê.
      return JSON.stringify(Object.is(valor, -0) ? 0 : valor);
    }

    case "string":
      return JSON.stringify(valor);

    case "object": {
      if (Array.isArray(valor)) {
        // Em array a ordem é conteúdo, não apresentação: preservada. E buraco
        // de array vira null, como manda o JSON.
        const itens = valor.map((item, i) =>
          item === undefined ? "null" : serializar(item, `${caminho}[${i}]`),
        );
        return `[${itens.join(",")}]`;
      }

      const registro = valor as Record<string, unknown>;
      // undefined some, igual ao JSON.stringify: é ausência de campo, não valor.
      const chaves = Object.keys(registro)
        .filter((k) => registro[k] !== undefined)
        .sort();

      const pares = chaves.map(
        (k) => `${JSON.stringify(k)}:${serializar(registro[k], `${caminho}.${k}`)}`,
      );
      return `{${pares.join(",")}}`;
    }

    default:
      // undefined, function, symbol, bigint: nenhum tem forma JSON.
      throw new ErroDeCanonicalizacao(`tipo ${typeof valor} não é serializável em JSON`, caminho);
  }
}

/**
 * Canonicaliza um valor conforme a RFC 8785 e devolve a string resultante.
 *
 * Lança `ErroDeCanonicalizacao` para valores sem forma JSON (NaN, Infinity,
 * function, symbol, bigint), sempre nomeando o caminho do campo culpado.
 */
export function canonicalizarJcs(valor: unknown): string {
  return serializar(valor, "$");
}

/**
 * O mesmo que `canonicalizarJcs`, em bytes UTF-8.
 *
 * É esta forma que entra na assinatura: o `b64: false` do contrato significa
 * que o payload é assinado cru, não em Base64URL, então quem assina precisa
 * exatamente destes bytes.
 */
export function canonicalizarJcsBytes(valor: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalizarJcs(valor));
}
