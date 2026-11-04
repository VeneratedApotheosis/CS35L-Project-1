// An error with an HTTP status and a short code, safe to show to the client.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (message = "Missing or invalid token") =>
  new AppError(401, "unauthorized", message);

export const notFound = (message = "Not found") =>
  new AppError(404, "not_found", message);

export const validationFailed = (message: string) =>
  new AppError(400, "validation_failed", message);
