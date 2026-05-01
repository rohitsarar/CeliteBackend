import { Request, Response, NextFunction } from "express";
import {
  addNameSchema,
  AddtyreCardImagesSchema,
} from "./tyre_details.validator";
import TyreDetailsRepository from "./tyre_details.utiils";
import sendSuccessResponse from "../../middleware/success.handle";
import { send } from "node:process";

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
      const { manufacturerName, brandName, modelName, size, imageUrl } =
        await AddtyreCardImagesSchema.validateAsync(req.body);

      const result = await TyreDetailsRepository.createTyreCardImageWithName(
        manufacturerName,
        brandName,
        modelName,
        size,
        imageUrl,
      );

      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Failed to add tyre details",
        });
      }

      sendSuccessResponse(req, res, {
        message: `Tyre details added successfully`,
        result,
      });
    } catch (error) {
      next(error);
    }
  }
}
