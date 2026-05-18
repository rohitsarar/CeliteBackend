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
  "/all-fields-card-image",
  uploadSingle, // ① parse & validate the upload
  TyreController.addTyreCardImageWithAllFields, // ② business logic
);

route.post(
  "/add-image-in-cloudinary",
  uploadSingle, // ① parse & validate the upload
  TyreController.addImageInCloudinary, // ② business logic
);

route.get(
  "/get-card-images-details",
  TyreController.getTyreCardImagesWithFilters, // ② business logic
);

route.get(
  "/get-manufacturers",
  TyreController.getManufacturers, // ② business logic
);

route.get(
  "/get-models",
  TyreController.getModelNames, // ② business logic
);

route.get(
  "/get-sizes",
  TyreController.getSize, // ② business logic
);

route.get(
  "/get-brands",
  TyreController.getbrandNames, // ② business logic
);

export default route;
