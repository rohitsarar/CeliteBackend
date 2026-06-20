import Joi from "joi";
import { join } from "path/win32";

export const addNameSchema = Joi.object({
  TyreType: Joi.string().valid("manufacturer", "brand", "model").required(),
  name: Joi.string().trim().min(2).required(),
});

export const AddtyreAndGetCardImagesSchema = Joi.object({
  manufacturerName: Joi.string().required(),
  brandName: Joi.string().optional(),
  modelName: Joi.string().optional(),
  size: Joi.string().optional(),
  // imageUrl: Joi.string().uri().required(),
});

export const getSizeSchema = Joi.object({
  manufacturerName: Joi.string().required(),
  modelName: Joi.string().required(),
});

export const getbrandNamesSchema = Joi.object({
  manufacturerName: Joi.string().optional(),
});

export const GettyreCardImagesSchema = Joi.object({
  manufacturerName: Joi.string().optional(),
  modelName: Joi.string().optional(),
  size: Joi.string().optional(),
  category: Joi.string().optional(),
  // imageUrl: Joi.string().uri().required(),
});

export const postEmailToAdminSchema = Joi.object({
  contactNo: Joi.string()
    .trim()
    .required()
    .pattern(/^[0-9\s\-\+\(\)]{7,}$/)
    .messages({
      "string.pattern.base":
        "Invalid phone number format. Please provide a valid contact number.",
      "any.required": "Contact number is required.",
    }),
});
