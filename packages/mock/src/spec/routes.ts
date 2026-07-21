export interface OperacaoSpec {
  method: "get" | "post" | "patch" | "delete" | "put";
  /** Caminho no template OAS, ex.: /api/v1/{arranjo}/segregacao/{idInfSegr}/lotes */
  path: string;
  temBody: boolean;
}

const METODOS = ["get", "post", "patch", "delete", "put"] as const;

interface SpecDoc {
  paths: Record<string, Record<string, { requestBody?: unknown }>>;
}

export function listarOperacoes(spec: unknown): OperacaoSpec[] {
  const doc = spec as SpecDoc;
  const ops: OperacaoSpec[] = [];
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of METODOS) {
      const op = item[method];
      if (op) ops.push({ method, path, temBody: op.requestBody !== undefined });
    }
  }
  return ops;
}

/** Converte template OAS ({param}) para a sintaxe de rota do Fastify (:param). */
export function paraRotaFastify(oasPath: string): string {
  return oasPath.replaceAll(/\{([^}]+)\}/g, ":$1");
}

/** Escapa um segmento para JSON Pointer (RFC 6901). */
export function escaparPointer(segmento: string): string {
  return segmento.replaceAll("~", "~0").replaceAll("/", "~1");
}
