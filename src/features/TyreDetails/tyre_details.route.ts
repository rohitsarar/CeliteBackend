// routes/tyre.routes.ts
import { Router } from "express";
import TyreController from "./tyre_details.controller";
import { uploadSingle } from "../../middleware/cloudinarry";

const route = Router();

/**
 * POST /api/tyres/card-image
 *
 * Pipeline:
 *   uploadSingle  →  multer parses multipart, validates mime + size, puts buffer on req.file
 *   TyreController.addTyreCardImage  →  uploads to Cloudinary, saves URL to DB
 */
route.post(
  "/card-image",
  uploadSingle, // ① parse & validate the upload
  TyreController.addTyreCardImageWithName, // ② business logic
);

export default route;
