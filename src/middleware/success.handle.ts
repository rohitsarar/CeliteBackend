import { Request, Response } from "express";

// Success response utility
function sendSuccessResponse<T>(req: Request, res: Response, data: T) {
  const response = {
    status: 200,
    data: data,
    error: null,
  };

  return res.status(200).json(response);
}

export default sendSuccessResponse;

// Define an error response function
export function sendErrorResponse(req: Request, res: Response, error: any) {
  const response = {
    status: 404,
    data: null,
    error: error?.message || "Internal Server Error",
  };

  return res.status(404).json(response);
}
