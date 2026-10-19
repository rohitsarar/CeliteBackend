import { Request, Response, NextFunction } from "express";
import {
  attachImageSchema,
  createTyreWithImageSchema,
  CustomerInquiry,
  getbrandNamesSchema,
  getModelsSchema,
  getSizeSchema,
  GettyreCardImagesSchema,
  postEmailToAdminSchema,
} from "./tyre_details.validator";
import TyreDetailsRepository from "./tyre_details.utiils";
import sendSuccessResponse, {
  sendErrorResponse,
} from "../../middleware/success.handle";
import { uploadBufferToCloudinary } from "../../service/cloudinary.service";
import ApiError from "../../utils/api-error";

const VALIDATE_OPTS = { abortEarly: false, stripUnknown: true } as const;

/** Converts "Apollo Tyres" → "apollo_tyres" (safe for Cloudinary paths). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const requireFile = (req: Request) => {
  if (!req.file) {
    throw ApiError.customError(
      400,
      "Image file is required. Send it as multipart/form-data with field name 'image'.",
    );
  }
  return req.file;
};

export default class TyreController {
  /** Admin: create a tyre row and upload its card image in one call. */
  static async addTyreCardImageWithAllFields(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const file = requireFile(req);

      const { manufacturerName, brandName, modelName, size, category } =
        await createTyreWithImageSchema.validateAsync(req.body, VALIDATE_OPTS);

      const folder = [
        "tyres",
        slugify(manufacturerName),
        brandName ? slugify(brandName) : null,
        slugify(modelName),
      ]
        .filter(Boolean)
        .join("/");

      const uploaded = await uploadBufferToCloudinary(
        file.buffer,
        folder,
        slugify(size),
      );

      const result = await TyreDetailsRepository.createTyreCardImageWithName({
        manufacturerName,
        brandName: brandName || null,
        modelName,
        size,
        category,
        imageUrl: uploaded.secureUrl,
      });

      return sendSuccessResponse(
        req,
        res,
        {
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
        },
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  /** Admin: upload an image for a tyre row that already exists. */
  static async addImageInCloudinary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const file = requireFile(req);

      const { manufacturerName, modelName, size } =
        await attachImageSchema.validateAsync(req.body, VALIDATE_OPTS);

      // Look the row up first so we do not spend a Cloudinary upload on a miss.
      const tyreId = await TyreDetailsRepository.findId(
        manufacturerName,
        modelName,
        size,
      );

      if (!tyreId) {
        return sendErrorResponse(
          req,
          res,
          "Tyre details not found for the provided fields",
          404,
        );
      }

      const folder = ["tyres", slugify(manufacturerName), slugify(modelName)].join("/");

      const uploaded = await uploadBufferToCloudinary(
        file.buffer,
        folder,
        slugify(size),
      );

      const updated = await TyreDetailsRepository.addImageUrlInDatabase(
        tyreId,
        uploaded.secureUrl,
      );

      if (!updated) {
        return sendErrorResponse(req, res, "Failed to save image URL", 500);
      }

      return sendSuccessResponse(req, res, {
        message: "Tyre image uploaded successfully",
        data: { tyreId, imageUrl: uploaded.secureUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getManufacturers(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await TyreDetailsRepository.getManufacturers();
      return sendSuccessResponse(req, res, {
        message: "Manufacturers retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getModelNames(req: Request, res: Response, next: NextFunction) {
    try {
      const { manufacturerName } = await getModelsSchema.validateAsync(
        req.query,
        VALIDATE_OPTS,
      );
      const data = await TyreDetailsRepository.getModelNames(manufacturerName);
      return sendSuccessResponse(req, res, {
        message: "Model names retrieved successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSize(req: Request, res: Response, next: NextFunction) {
    try {
      const { manufacturerName, modelName } = await getSizeSchema.validateAsync(
        req.query,
        VALIDATE_OPTS,
      );
      const data = await TyreDetailsRepository.getSize(manufacturerName, modelName);
      return sendSuccessResponse(req, res, {
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
        VALIDATE_OPTS,
      );
      const data = await TyreDetailsRepository.getbrandNames(manufacturerName);
      return sendSuccessResponse(req, res, {
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
      const filters = await GettyreCardImagesSchema.validateAsync(
        req.query,
        VALIDATE_OPTS,
      );

      const { rows, total } = await TyreDetailsRepository.getTyreCardImage(filters);

      return sendSuccessResponse(req, res, {
        message: "Tyre card images retrieved successfully",
        data: rows,
        total,
        limit: filters.limit,
        offset: filters.offset,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Public: a customer left their contact details, notify the admin. */
  static async postUserDetailsToAdminEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const inquiry: CustomerInquiry = await postEmailToAdminSchema.validateAsync(
        req.body,
        VALIDATE_OPTS,
      );

      const emailSent = await TyreDetailsRepository.sendEmailToAdmin(inquiry);

      if (!emailSent) {
        return sendErrorResponse(
          req,
          res,
          "Failed to send inquiry. Please try again later or contact us on WhatsApp.",
          502,
        );
      }

      return sendSuccessResponse(req, res, {
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
