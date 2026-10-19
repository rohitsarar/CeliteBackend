import fs from "fs";
import path from "path";
import morgan, { StreamOptions } from "morgan";
import logger, { LOG_DIR } from "../utils/winston";

// Make sure the log folder exists before opening the stream, otherwise a fresh
// deployment (where logs/ is git-ignored) crashes on startup with ENOENT.
fs.mkdirSync(LOG_DIR, { recursive: true });

const accessLogStream = fs.createWriteStream(path.join(LOG_DIR, "access.log"), {
  flags: "a",
});
accessLogStream.on("error", (err) =>
  logger.error(`access.log write failed: ${err.message}`),
);

const accessLogStreamOptions: StreamOptions = {
  write: (message) => {
    accessLogStream.write(message);
  },
};

type MorganReq = Parameters<morgan.FormatFn>[1];

const clientIp = (req: MorganReq) =>
  (req as MorganReq & { ip?: string }).ip || req.socket?.remoteAddress || "-";

// Basic request line → Winston (console + all.log)
const basicLoggerMiddleware = morgan(
  (tokens, req, res) =>
    `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ` +
    `${tokens.res(req, res, "content-length") || "-"} - ${tokens["response-time"](req, res)} ms ` +
    `ip: ${clientIp(req)}`,
  { stream: { write: (message) => logger.http(message.trim()) } },
);

// Detailed request line → logs/access.log.
// Only a few safe headers are logged (never the body or auth headers) so
// customer phone numbers and e-mails do not end up on disk in plain text.
const detailedAccessLoggerMiddleware = morgan(
  (tokens, req, res) =>
    `${tokens.date(req, res, "iso")} ${tokens.method(req, res)} ${tokens.url(req, res)} ` +
    `${tokens.status(req, res)} ${tokens.res(req, res, "content-length") || "-"} - ` +
    `${tokens["response-time"](req, res)} ms ip: ${clientIp(req)} ` +
    `ua: ${JSON.stringify(req.headers["user-agent"] || "-")} ` +
    `referer: ${req.headers.referer || "-"}\n`,
  { stream: accessLogStreamOptions },
);

export { basicLoggerMiddleware, detailedAccessLoggerMiddleware };
