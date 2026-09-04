import { createSign, generateKeyPairSync } from "node:crypto";
import {
  base64url,
  canonicalizarJcs,
  montarEntradaDeAssinatura,
  montarProtectedHeader,
} from "@splitbr/client";

// Par de teste, gerado uma vez por processo. Assinar de verdade nos testes vale
// a pena: um header montado a mao passaria pela conferencia de forma do mock e
// esconderia justamente o erro que ela existe para pegar.
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

const assinarRs256 = (bytes: Uint8Array): Uint8Array => {
  const s = createSign("RSA-SHA256");
  s.update(bytes);
  s.end();
  return new Uint8Array(s.sign(privateKey));
};

/**
 * Headers de uma requisicao valida no contrato v1.1.0: so o X-JWS-Signature.
 * Os quatro headers do v0.0.10 sairam do contrato e o mock nao os exige mais.
 *
 * Sincrono de proposito, montado com as mesmas pecas publicas que
 * `assinarRequisicao` usa. A versao async obrigaria `await` em 42 pontos dos
 * testes sem ganhar cobertura nenhuma, ja que o assinante aqui e sincrono.
 */
export function headersValidos(corpo: unknown = ""): Record<string, string> {
  const protegido = montarProtectedHeader({ kid: "teste-01", assinar: assinarRs256 });
  const protectedB64 = base64url(new TextEncoder().encode(JSON.stringify(protegido)));
  const payload = new TextEncoder().encode(canonicalizarJcs(corpo));
  const assinatura = assinarRs256(montarEntradaDeAssinatura(protectedB64, payload));
  return { "X-JWS-Signature": `${protectedB64}..${base64url(assinatura)}` };
}

export function itemBoletoIniciada(n: number): Record<string, unknown> {
  // Valores monetarios no contrato oficial sao decimais em reais
  // (type number, multipleOf 0.01), nao centavos.
  return {
    index: n,
    idDda: `DDA${n}`,
    numCtrlOrig: `CTRL${String(n).padStart(6, "0")}`,
    numCodBarras: `8366${String(n).padStart(40, "0")}`,
    vlInf: 1000.0,
    vlCbsInf: 9.0,
    vlIbsInf: 1.0,
    cnpjRaizPspRecDir: "12345678",
    cnpjRec: "12345678000199",
    cnpjPagOrig: "98765432000188",
    dtHrIni: "2026-07-20T10:00:00-03:00",
    dtVenc: "2026-08-01",
    dtHrLimPgto: "2026-08-01T23:59:59-03:00",
  };
}

export function corpoIniciadaBoleto(qtde: number): Record<string, unknown> {
  return {
    infRequisicao: { dtHrMsg: "2026-07-20T10:00:00-03:00" },
    transacoes: Array.from({ length: qtde }, (_, i) => itemBoletoIniciada(i + 1)),
  };
}
