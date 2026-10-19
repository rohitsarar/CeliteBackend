import { Request, Response } from "express";

// Success response utility
function sendSuccessResponse<T>(
  _req: Request,
  res: Response,
  data: T,
  statusCode = 200,
) {
  return res.status(statusCode).json({
    status: statusCode,
    data,
    error: null,
  });
}

export default sendSuccessResponse;

/**
 * Error response utility.
 * Defaults to 400 (bad request). Pass an explicit code for 404 / 409 / 502 etc.
 */
export function sendErrorResponse(
  _req: Request,
  res: Response,
  error: { message?: string } | string | null | undefined,
  statusCode = 400,
) {
  const message =
    typeof error === "string" ? error : error?.message || "Something went wrong";

  return res.status(statusCode).json({
    status: statusCode,
    data: null,
    error: message,
  });
}
