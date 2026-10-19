import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import multer from "multer";
import { QueryFailedError } from "typeorm";
import logger from "../utils/winston";
import ApiError from "../utils/api-error";
import { IApiErrors } from "../types/error";

type DriverError = { code?: string; sqlMessage?: string };

function errorHandlingMiddleWare(
  err: unknown,
  _req: Request,
  res: Response,
  // Express identifies error middleware by arity, so the 4th param must stay.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  // Known, expected errors (validation, auth, not found) are logged at warn
  // level; anything else is a real error and gets the full stack.
  const isExpected =
    err instanceof ApiError ||
    err instanceof Joi.ValidationError ||
    err instanceof multer.MulterError;
  if (isExpected) {
    logger.warn(err instanceof Error ? err.message : String(err));
  } else {
    logger.error(err);
  }

  // Application errors
  if (err instanceof ApiError) {
    return res
      .status(err.code)
      .json({ status: err.code, data: null, error: err.message });
  }

  // Joi validation errors
  if (err instanceof Joi.ValidationError) {
    const errors = err.details.map((e) => ({
      label: e.path[0],
      msg: e.message,
    }));
    return res.status(422).json({
      status: 422,
      data: null,
      error: { message: "Validation Error", errors },
    });
  }

  // Multer (file upload) errors
  if (err instanceof multer.MulterError) {
    const code = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(code).json({ status: code, data: null, error: err.message });
  }

  // Unsupported file type thrown by our multer fileFilter
  if (err instanceof Error && err.message.startsWith("Unsupported file type")) {
    return res.status(415).json({ status: 415, data: null, error: err.message });
  }

  // ORM errors
  if (err instanceof QueryFailedError) {
    const driverError = err.driverError as DriverError;

    if (driverError.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ status: 409, data: null, error: IApiErrors.DUPLICATE_ENTRY });
    }

    if (driverError.code === "ER_NO_DEFAULT_FOR_FIELD") {
      return res
        .status(400)
        .json({ status: 400, data: null, error: "Missing fields in request" });
    }
  }

  // body-parser errors
  if (typeof err === "object" && err !== null && "type" in err) {
    const { type } = err as { type: string };
    if (type === "entity.too.large") {
      return res
        .status(413)
        .json({ status: 413, data: null, error: IApiErrors.PAYLOAD_TOO_LARGE });
    }
    if (type === "entity.parse.failed") {
      return res
        .status(400)
        .json({ status: 400, data: null, error: "Malformed JSON body" });
    }
  }

  // Anything else: never leak internals to the client
  return res
    .status(500)
    .json({ status: 500, data: null, error: IApiErrors.INTERNAL_SERVER_ERROR });
}

export default errorHandlingMiddleWare;
