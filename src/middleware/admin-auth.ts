import { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import ApiError from "../utils/api-error";

/**
 * Protects admin-only routes (image uploads, catalogue writes).
 *
 * The client must send the key in the `x-api-key` header
 * (or `Authorization: Bearer <key>`). The expected value comes from
 * ADMIN_API_KEY in the environment. If the variable is missing the route
 * is closed rather than left open.
 */
const extractKey = (req: Request): string | undefined => {
  const headerKey = req.header("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.header("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  return undefined;
};

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

export default function requireAdminKey(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected || expected.length < 16) {
    return next(
      ApiError.customError(
        503,
        "Admin API is not configured on this server (ADMIN_API_KEY missing)",
      ),
    );
  }

  const provided = extractKey(req);
  if (!provided || !safeEqual(provided, expected)) {
    return next(ApiError.unAuthorized());
  }

  return next();
}
