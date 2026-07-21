import { gerarCorrelationId, gerarTimestampSplit } from "@splitbr/client";

export function headersValidos(): Record<string, string> {
  return {
    messageId: crypto.randomUUID(),
    correlationId: gerarCorrelationId(),
    tenantId: "12345678000199",
    timestamp: gerarTimestampSplit(),
  };
}

export function itemBoletoIniciada(n: number): Record<string, unknown> {
  // Valores monetarios no contrato oficial sao decimais em reais
  // (type number, multipleOf 0.01), nao centavos.
  return {
    index: n,
    idDda: `DDA${n}`,
    numCtrlOrig: `CTRL${String(n).padStart(6, "0")}`,
    numCodBarras: `8366000${n}`,
    vlInf: 1000.0,
    vlCbsInf: 9.0,
    vlIbsInf: 1.0,
    cnpjRaizPspRecDir: "12345678",
    cnpjRec: "12345678000199",
    cnpjCpfPagOrig: "98765432000188",
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
