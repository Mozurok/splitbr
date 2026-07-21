import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { verificarSpec } from "./gate.js";
import { escaparPointer, listarOperacoes, type OperacaoSpec } from "./routes.js";

export interface OperacaoCompilada extends OperacaoSpec {
  /** Validador do corpo application/json; ausente quando a operacao nao tem body. */
  validarBody?: ValidateFunction;
}

export interface RegistroSpec {
  operacoes: OperacaoCompilada[];
  totalPaths: number;
  spec: Record<string, unknown>;
}

// Em dev este modulo vive em src/spec/ (data/ a dois niveis); no pacote
// buildado o bundle vive em dist/ (data/ a um nivel). Resolve o primeiro
// candidato existente em vez de fixar a profundidade.
const SPEC_EMBARCADO = ["../../data/spec/openapi-v0_0_10.json", "../data/spec/openapi-v0_0_10.json"]
  .map((rel) => fileURLToPath(new URL(rel, import.meta.url)))
  .find((p) => existsSync(p)) ?? "data/spec/openapi-v0_0_10.json";

/**
 * Carrega o contrato oficial atras da trava de hash (D-2) e compila um
 * validador Ajv2020 (dialeto nativo do OAS 3.1) por corpo de requisicao.
 * Qualquer schema incompilavel falha o boot na hora, nunca em silencio.
 */
export function carregarSpec(specPath: string = SPEC_EMBARCADO): RegistroSpec {
  const bytes = readFileSync(specPath);
  verificarSpec(bytes);
  const spec = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;

  // multipleOfPrecision evita o bug classico de float com multipleOf 0.01
  // (10.02/0.01 = 1001.9999...): sem ele ~13,6% dos centavos validos seriam 400.
  const ajv = new Ajv2020({ strict: false, allErrors: true, multipleOfPrecision: 2 });
  addFormats(ajv);
  ajv.addSchema(spec, "spec");

  const operacoes: OperacaoCompilada[] = listarOperacoes(spec).map((op) => {
    if (!op.temBody) return op;
    const pointer =
      `spec#/paths/${escaparPointer(op.path)}/${op.method}` +
      `/requestBody/content/${escaparPointer("application/json")}/schema`;
    const validarBody = ajv.getSchema(pointer);
    if (!validarBody) {
      throw new Error(
        `Schema do corpo nao compilou para ${op.method.toUpperCase()} ${op.path} (${pointer})`,
      );
    }
    return { ...op, validarBody };
  });

  return {
    operacoes,
    totalPaths: Object.keys(spec["paths"] as object).length,
    spec,
  };
}
