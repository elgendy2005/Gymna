// Receives Content-Security-Policy violation reports while the policy runs in
// Report-Only mode (see next.config.ts), and writes a short line per
// violation to the server log. Nothing is stored.

const MAX_BYTES = 16_000;

type Violation = {
  directive: string;
  blocked: string;
  page: string;
  source?: string;
};

/** Drops the query and fragment, which can carry tokens or personal data. */
function stripUrl(value: unknown): string {
  if (typeof value !== "string" || value === "") return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    // "inline", "eval", "data", ...
    return value.slice(0, 100);
  }
}

function toViolation(body: Record<string, unknown>): Violation {
  return {
    directive: String(body["effective-directive"] ?? body.effectiveDirective ?? body["violated-directive"] ?? ""),
    blocked: stripUrl(body["blocked-uri"] ?? body.blockedURL),
    page: stripUrl(body["document-uri"] ?? body.documentURL),
    source: stripUrl(body["source-file"] ?? body.sourceFile) || undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BYTES) return new Response(null, { status: 413 });

  let violations: Violation[] = [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // Reporting API (`report-to`): a list of { type, body }.
      violations = parsed
        .filter((report) => report?.type === "csp-violation" && report.body)
        .map((report) => toViolation(report.body));
    } else if (parsed && typeof parsed === "object" && "csp-report" in parsed) {
      // Older `report-uri` format.
      violations = [toViolation((parsed as { "csp-report": Record<string, unknown> })["csp-report"])];
    }
  } catch {
    return new Response(null, { status: 400 });
  }

  for (const violation of violations.slice(0, 20)) {
    console.warn("csp-report-only", JSON.stringify(violation));
  }
  return new Response(null, { status: 204 });
}
