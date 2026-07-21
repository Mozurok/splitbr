/** RFC 7807 problem+json tipado, com as extensoes operacionais da plataforma. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  /** Segundos sugeridos de espera (429/503/504, header Retry-After). */
  retryAfterSeconds?: number;
  /** Header X-Circuit-Breaker (503). */
  circuitBreaker?: string;
  /** Header X-Retry-Allowed (500/503). */
  retryAllowed?: string;
  /** Header X-Error-Type (400 permanent / 422 business). */
  errorType?: string;
  /** Campos adicionais do corpo problem+json. */
  extensions: Record<string, unknown>;
}

const KNOWN = new Set(["type", "title", "status", "detail", "instance"]);

/** Converte um corpo problem+json (ou ausencia dele) em ProblemDetail tipado. */
export function toProblem(body: unknown, response: Response): ProblemDetail {
  const source = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
  const extensions: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) {
    if (!KNOWN.has(k)) extensions[k] = v;
  }
  const problem: ProblemDetail = {
    status: typeof source["status"] === "number" ? (source["status"] as number) : response.status,
    extensions,
  };
  if (typeof source["type"] === "string") problem.type = source["type"];
  if (typeof source["title"] === "string") problem.title = source["title"];
  if (typeof source["detail"] === "string") problem.detail = source["detail"];

  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter !== null && /^\d+$/.test(retryAfter)) {
    problem.retryAfterSeconds = Number(retryAfter);
  }
  const circuit = response.headers.get("X-Circuit-Breaker");
  if (circuit !== null) problem.circuitBreaker = circuit;
  const retryAllowed = response.headers.get("X-Retry-Allowed");
  if (retryAllowed !== null) problem.retryAllowed = retryAllowed;
  const errorType = response.headers.get("X-Error-Type");
  if (errorType !== null) problem.errorType = errorType;

  return problem;
}
