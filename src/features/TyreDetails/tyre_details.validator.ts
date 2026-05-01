import Joi from "joi";

export const addNameSchema = Joi.object({
  TyreType: Joi.string().valid("manufacturer", "brand", "model").required(),
  name: Joi.string().trim().min(2).required(),
});

export const AddtyreCardImagesSchema = Joi.object({
  manufacturerName: Joi.string().required(),
  brandName: Joi.string().required(),
  modelName: Joi.string().required(),
  size: Joi.string().required(),
  imageUrl: Joi.string().uri().required(),
});
