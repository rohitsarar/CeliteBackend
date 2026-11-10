import { Router } from "express";
import TyreController from "./tyre_details.controller";
import TyreAdminController from "./tyre_details.admin";
import { uploadSingle } from "../../middleware/cloudinarry";
import requireAdminKey from "../../middleware/admin-auth";
import { apiLimiter, inquiryLimiter, uploadLimiter } from "../../middleware/rate-limit";

const route = Router();

// ─── Admin (write) endpoints ─────────────────────────────────────────────────
// Require the `x-api-key` header. Order matters: auth runs BEFORE multer so an
// unauthenticated caller cannot make us buffer a 5 MB upload.

/**
 * POST /v1/api/tyres/all-fields-card-image
 * multipart/form-data: image, manufacturerName, modelName, size, [brandName], [category]
 */
route.post(
  "/all-fields-card-image",
  requireAdminKey,
  uploadLimiter,
  uploadSingle,
  TyreController.addTyreCardImageWithAllFields,
);

/**
 * POST /v1/api/tyres/add-image-in-cloudinary
 * multipart/form-data: image, manufacturerName, modelName, size
 */
route.post(
  "/add-image-in-cloudinary",
  requireAdminKey,
  uploadLimiter,
  uploadSingle,
  TyreController.addImageInCloudinary,
);

// ─── Admin panel (catalogue management) ──────────────────────────────────────
// Used by the website's /admin page through its server-side proxy.
route.get("/admin/list", requireAdminKey, TyreAdminController.list);
route.get("/admin/options", requireAdminKey, TyreAdminController.options);
route.post("/admin/generate-content", requireAdminKey, TyreAdminController.generate);
route.get("/admin/:id", requireAdminKey, TyreAdminController.get);
route.post("/admin", requireAdminKey, uploadLimiter, uploadSingle, TyreAdminController.create);
route.put("/admin/:id", requireAdminKey, uploadLimiter, uploadSingle, TyreAdminController.update);
route.delete("/admin/:id", requireAdminKey, TyreAdminController.remove);

// ─── Public (read) endpoints ─────────────────────────────────────────────────
route.get("/get-card-images-details", apiLimiter, TyreController.getTyreCardImagesWithFilters);
route.get("/get-manufacturers", apiLimiter, TyreController.getManufacturers);
route.get("/get-models", apiLimiter, TyreController.getModelNames);
route.get("/get-sizes", apiLimiter, TyreController.getSize);
route.get("/get-brands", apiLimiter, TyreController.getbrandNames);
route.get("/details/:id", apiLimiter, TyreController.getTyreDetails);

// ─── Public (e-mail) endpoint, strictly rate limited ─────────────────────────
route.post("/customer-inquiry", inquiryLimiter, TyreController.postUserDetailsToAdminEmail);

export default route;
