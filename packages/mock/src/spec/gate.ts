import { createHash } from "node:crypto";

/**
 * Hash pinado do contrato oficial (OAS v1.1.1), identico ao pinado em
 * vendor/MANIFEST.md. O mock recusa boot quando a copia embarcada divergir
 * (D-2; mesmo padrao do codegen do @splitbr/client). Um teste de repositorio
 * garante que a copia em data/spec/ e o vendor nao driftam entre si.
 */
export const PINNED_SPEC_SHA256 =
  "739f955c994791ea0fdbbe96cd554df33459ebf4356d6a8adc7c5a9a359dc1b8";

export class SpecGateError extends Error {
  constructor(actual: string) {
    super(
      `Spec recusado: SHA-256 ${actual} difere do pinado ${PINNED_SPEC_SHA256}. ` +
        "O contrato embarcado foi alterado; sincronize com vendor/MANIFEST.md antes de subir o mock.",
    );
    this.name = "SpecGateError";
  }
}

export function verificarSpec(bytes: Uint8Array): void {
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== PINNED_SPEC_SHA256) throw new SpecGateError(actual);
}
