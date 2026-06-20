import { Request, Response, NextFunction } from "express";
import {
  addNameSchema,
  AddtyreAndGetCardImagesSchema,
  getbrandNamesSchema,
  getSizeSchema,
  GettyreCardImagesSchema,
  postEmailToAdminSchema,
} from "./tyre_details.validator";
import TyreDetailsRepository from "./tyre_details.utiils";
import sendSuccessResponse, {
  sendErrorResponse,
} from "../../middleware/success.handle";
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
  static async addTyreCardImageWithAllFields(
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
        await AddtyreAndGetCardImagesSchema.validateAsync(req.body, {
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

  // add image in cloudinary and save url in database
  static async addImageInCloudinary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // 1. Ensure file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Image file is required. Send it as multipart/form-data with field name 'image'.",
        });
      }

      // 2. Validate body
      const { manufacturerName, modelName, size } =
        await AddtyreAndGetCardImagesSchema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });

      // 3. Cloudinary folder
      const folder = [
        "tyres",
        slugify(manufacturerName),
        // slugify(brandName),
        slugify(modelName),
      ].join("/");

      const publicId = slugify(size);

      // 4. Upload image to cloudinary
      const uploaded = await uploadBufferToCloudinary(
        req.file.buffer,
        folder,
        publicId,
      );

      // 5. Find tyre id from database
      const tyreId = await TyreDetailsRepository.findId(
        manufacturerName,
        // brandName,
        modelName,
        size,
      );

      if (!tyreId) {
        sendErrorResponse(req, res, {
          message: "Tyre details not found for the provided fields",
        });
        return;
      }

      // 6. ave image url in database
      const addImageUrlInDatabase =
        await TyreDetailsRepository.addImageUrlInDatabase(
          tyreId,
          uploaded.secureUrl,
        );

      if (!addImageUrlInDatabase) {
        sendErrorResponse(req, res, {
          message: "Failed to add image url in database",
        });
        return;
      }

      // 7. Success response
      sendSuccessResponse(req, res, {
        message: "Tyre image uploaded successfully",
        data: {
          tyreId,
          imageUrl: uploaded.secureUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  //get all manufacturers api
  static async getManufacturers(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await TyreDetailsRepository.getManufacturers();
      sendSuccessResponse(req, res, {
        message: "Manufacturers retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  //get all modelNames api
  static async getModelNames(req: Request, res: Response, next: NextFunction) {
    try {
      const { manufacturerName } =
        await AddtyreAndGetCardImagesSchema.validateAsync(req.query);
      const data = await TyreDetailsRepository.getModelNames(manufacturerName);
      sendSuccessResponse(req, res, {
        message: "Model names retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  //get all size api
  static async getSize(req: Request, res: Response, next: NextFunction) {
    try {
      const { manufacturerName, modelName } = await getSizeSchema.validateAsync(
        req.query,
      );
      const data = await TyreDetailsRepository.getSize(
        manufacturerName,
        modelName,
      );
      sendSuccessResponse(req, res, {
        message: "Sizes retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getbrandNames(req: Request, res: Response, next: NextFunction) {
    try {
      const { manufacturerName } = await getbrandNamesSchema.validateAsync(
        req.query,
      );
      const data = await TyreDetailsRepository.getbrandNames(manufacturerName);
      sendSuccessResponse(req, res, {
        message: "Brand names retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTyreCardImagesWithFilters(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { manufacturerName, modelName, size, brandName, category } =
        await GettyreCardImagesSchema.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });

      const data = await TyreDetailsRepository.getTyreCardImage(
        manufacturerName,
        modelName,
        size,
        brandName,
        category,
      );

      sendSuccessResponse(req, res, {
        message: "Tyre card image retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async postUserDetailsToAdminEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { contactNo } = await postEmailToAdminSchema.validateAsync(
        req.body,
        {
          abortEarly: false,
          stripUnknown: true,
        },
      );

      // Send email to admin with customer contact details
      const emailSent = await TyreDetailsRepository.sendEmailToAdmin(contactNo);

      if (!emailSent) {
        return sendErrorResponse(req, res, {
          message:
            "Failed to send inquiry. Please try again later or contact support.",
        });
      }

      sendSuccessResponse(req, res, {
        message:
          "Thank you for providing your contact details! Our team will reach out to you shortly.",
        data: {
          status: "submitted",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
