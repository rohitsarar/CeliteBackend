import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import logger from "../utils/winston";
import {
  basicLoggerMiddleware,
  detailedAccessLoggerMiddleware,
} from "../middleware/morgan";
import routesV1 from "../features/index-router";
import errorHandlingMiddleWare from "../middleware/error-handler";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Build the CORS origin list from env.
 *   CORS_ORIGIN=https://celitetyre.com,https://www.celitetyre.com
 * Falls back to "*" when not set so local development keeps working.
 */
const resolveCorsOrigin = (): cors.CorsOptions["origin"] => {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") return "*";
  const list = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
};

const configureApp = (app: Express) => {
  // ── Sentry (only when a DSN is configured and we are in production) ─────
  const sentryDsn = process.env.SENTRY_DSN;
  const sentryEnabled = Boolean(sentryDsn) && isProduction;

  if (sentryEnabled) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
      ],
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.2,
    });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // ── Behind nginx / a load balancer, trust the first proxy so req.ip and
  //    the rate limiter see the real client address.
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  // ── Security headers ────────────────────────────────────────────────────
  app.use(
    helmet({
      // This API only serves JSON, so CSP is not relevant.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // ── Logging ─────────────────────────────────────────────────────────────
  app.use(basicLoggerMiddleware);
  if (process.env.DETAILED_ACCESS_LOG !== "false") {
    app.use(detailedAccessLoggerMiddleware);
  }

  // ── CORS + body parsing ─────────────────────────────────────────────────
  app.use(
    cors({
      origin: resolveCorsOrigin(),
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    }),
  );
  const bodyLimit = process.env.BODY_LIMIT || "1mb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // ── Health check (for load balancers / uptime monitors) ─────────────────
  app.get("/", (_req: Request, res: Response) => res.send("CELITE Tyre API"));
  app.get("/health", (_req: Request, res: Response) =>
    res.status(200).json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    }),
  );

  // ── Routes ──────────────────────────────────────────────────────────────
  app.use("/v1", routesV1);

  // ── 404 for anything unmatched (must come before the error handler) ─────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ status: 404, data: null, error: "Route not found" });
  });

  // ── Error handlers ──────────────────────────────────────────────────────
  if (sentryEnabled) app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandlingMiddleWare);

  logger.info("Express configured");
};

export default configureApp;
