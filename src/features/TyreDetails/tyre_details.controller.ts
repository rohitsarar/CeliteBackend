import { Request, Response, NextFunction } from "express";
import {
  addNameSchema,
  AddtyreCardImagesSchema,
} from "./tyre_details.validator";
import TyreDetailsRepository from "./tyre_details.utiils";
import sendSuccessResponse from "../../middleware/success.handle";
import { send } from "node:process";
import { uploadBufferToCloudinary } from "../../service/cloudinary.service";

/** Converts "Apollo Tyres" → "apollo_tyres" (safe for Cloudinary paths). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default class TyreController {
  static async addName(req: Request, res: Response, next: NextFunction) {
    try {
      const { TyreType, name } = await addNameSchema.validateAsync(req.body);

      const result = await TyreDetailsRepository.create(TyreType, name);

      sendSuccessResponse(req, res, {
        message: `${TyreType} added successfully`,
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addTyreCardImageWithName(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // ── 1. Ensure a file was attached ────────────────────────────────────
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Image file is required. Send it as multipart/form-data with field name 'image'.",
        });
      }

      const { manufacturerName, brandName, modelName, size } =
        await AddtyreCardImagesSchema.validateAsync(req.body, {
          abortEarly: false, // collect ALL validation errors at once
          stripUnknown: true,
        });

      const folder = [
        "tyres",
        slugify(manufacturerName),
        slugify(brandName),
        slugify(modelName),
      ].join("/");

      const publicId = slugify(size);

      // ── 4. Upload buffer → Cloudinary ────────────────────────────────────
      const uploaded = await uploadBufferToCloudinary(
        req.file.buffer,
        folder,
        publicId,
      );

      const result = await TyreDetailsRepository.createTyreCardImageWithName(
        manufacturerName,
        brandName,
        modelName,
        size,
        uploaded.secureUrl,
      );

      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Failed to add tyre details",
        });
      }

      // ── 6. Respond ───────────────────────────────────────────────────────
      sendSuccessResponse(req, res, {
        message: "Tyre card image uploaded and details saved successfully.",
        result: {
          ...result,
          image: {
            url: uploaded.secureUrl,
            publicId: uploaded.publicId,
            width: uploaded.width,
            height: uploaded.height,
            format: uploaded.format,
            sizeBytes: uploaded.bytes,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
