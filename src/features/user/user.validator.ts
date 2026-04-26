import Joi from "joi";

const postUserSchema = Joi.object({
  FullName: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 2 characters",
    "any.required": "Full name is required",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),

  contactNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Contact number must be 10 digits",
      "string.empty": "Contact number is required",
      "any.required": "Contact number is required",
    }),
});

export default postUserSchema;
