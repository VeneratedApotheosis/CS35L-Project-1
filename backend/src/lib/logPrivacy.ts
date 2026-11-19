// Decode before matching so escaped route characters cannot bypass redaction.
export function safeRequestPath(url: string): string {
  let path = url.split("?")[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    /* Keep malformed paths safe below. */
  }
  return path.replace(
    /(\/shared-habits\/join\/)[^/]*(?:\/.*)?/i,
    "$1[REDACTED]",
  );
}

// pino-http passes its standard serialized request here (not the live request).
export function safeHttpRequest(req: { url?: string; [key: string]: unknown }) {
  return {
    ...req,
    url: safeRequestPath(req.url ?? ""),
    // Express-aware serializers also expose parsed query/route parameters.
    query: undefined,
    params: undefined,
  };
}

export function isInvitePath(url: string): boolean {
  return safeRequestPath(url).includes("[REDACTED]");
}
