import Joi from "joi";

/** Categories the storefront filters by. Keep in sync with the frontend. */
export const TYRE_CATEGORIES = [
  "PESSENGER_CAR",
  "TWO",
  "FARM",
  "TRUCKS",
  "OTR",
  "SCV",
  "PICKUP",
  "THREE_WHEELER",
  "ICV",
  "OTHERS",
] as const;

const name = Joi.string().trim().min(1).max(100);
const phone = Joi.string()
  .trim()
  .pattern(/^[0-9\s\-+()]{7,20}$/)
  .messages({
    "string.pattern.base":
      "Invalid phone number format. Please provide a valid contact number.",
  });

/** POST /tyres/all-fields-card-image — create a tyre row with its image. */
export const createTyreWithImageSchema = Joi.object({
  manufacturerName: name.required(),
  modelName: name.required(),
  size: name.required(),
  brandName: name.allow("", null).optional(),
  category: Joi.string()
    .trim()
    .uppercase()
    .valid(...TYRE_CATEGORIES)
    .default("OTHERS"),
});

/** POST /tyres/add-image-in-cloudinary — attach an image to an existing row. */
export const attachImageSchema = Joi.object({
  manufacturerName: name.required(),
  modelName: name.required(),
  size: name.required(),
});

/** GET /tyres/get-models?manufacturerName= */
export const getModelsSchema = Joi.object({
  manufacturerName: name.required(),
});

/** GET /tyres/get-sizes?manufacturerName=&modelName= */
export const getSizeSchema = Joi.object({
  manufacturerName: name.required(),
  modelName: name.required(),
});

/** GET /tyres/get-brands?manufacturerName= */
export const getbrandNamesSchema = Joi.object({
  manufacturerName: name.optional(),
});

/** GET /tyres/get-card-images-details — all filters optional. */
export const GettyreCardImagesSchema = Joi.object({
  manufacturerName: name.optional(),
  modelName: name.optional(),
  size: name.optional(),
  brandName: name.optional(),
  category: Joi.string().trim().uppercase().optional(),
  // The storefront loads a whole category at once, so the default must cover
  // the full catalogue (currently ~400 rows). Raise if the catalogue grows.
  limit: Joi.number().integer().min(1).max(2000).default(1000),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * POST /tyres/customer-inquiry
 * Only contactNo is required; the other fields let the contact form and the
 * product page send richer leads through the same endpoint.
 */
export const postEmailToAdminSchema = Joi.object({
  contactNo: phone.required().messages({
    "any.required": "Contact number is required.",
    "string.empty": "Contact number is required.",
  }),
  fullName: Joi.string().trim().max(100).allow("").optional(),
  email: Joi.string().trim().email().max(150).allow("").optional(),
  tyre: Joi.string().trim().max(200).allow("").optional(),
  message: Joi.string().trim().max(2000).allow("").optional(),
});

export type CustomerInquiry = {
  contactNo: string;
  fullName?: string;
  email?: string;
  tyre?: string;
  message?: string;
};
