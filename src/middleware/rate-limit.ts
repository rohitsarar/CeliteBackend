import rateLimit from "express-rate-limit";

const jsonMessage = (message: string) => ({
  status: 429,
  data: null,
  error: message,
});

/** Generic limiter for all public read endpoints. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: jsonMessage("Too many requests, please slow down."),
});

/**
 * Strict limiter for endpoints that send e-mail. Each hit costs a Gmail send,
 * so an unthrottled endpoint lets anyone mail-bomb the admin inbox.
 */
export const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.INQUIRY_LIMIT_PER_15_MIN) || 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: jsonMessage(
    "Too many inquiries from this device. Please try again in a few minutes.",
  ),
});

/** Limiter for admin upload endpoints (protects the Cloudinary quota). */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.UPLOAD_LIMIT_PER_MINUTE) || 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: jsonMessage("Upload rate limit reached. Please wait a minute."),
});
