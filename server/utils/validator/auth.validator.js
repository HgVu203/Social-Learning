import Joi from "joi";

export const authValidationSchema = {
  signup: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email is required",
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base":
          "Password must contain uppercase, lowercase and numbers",
      }),
    username: Joi.string().min(3).max(30).required().messages({
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username cannot exceed 30 characters",
    }),
    fullname: Joi.string().min(3).max(50).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email is required",
    }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email is required",
    }),
  }),

  verifyEmail: Joi.object({
    code: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.length": "Verification code must be 6 digits",
        "string.pattern.base": "Verification code must contain only numbers",
        "string.empty": "Verification code is required",
      }),
    userId: Joi.string().messages({
      "string.empty": "User ID cannot be empty if provided",
    }),
    email: Joi.string().email().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email cannot be empty if provided",
    }),
  })
    .or("userId", "email")
    .messages({
      "object.missing": "Either userId or email is required",
    }),

  resendVerification: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email is required",
    }),
  }),

  verifyResetCode: Joi.object({
    code: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.length": "Reset code must be 6 digits",
        "string.pattern.base": "Reset code must contain only numbers",
        "string.empty": "Reset code is required",
      }),
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email is required",
    }),
  }),

  resetPassword: Joi.object({
    code: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.length": "Reset code must be 6 digits",
        "string.pattern.base": "Reset code must contain only numbers",
        "string.empty": "Reset code is required",
      }),
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "string.empty": "Email is required",
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base":
          "Password must contain uppercase, lowercase and numbers",
      }),
  }),

  setPassword: Joi.object({
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base":
          "Password must contain uppercase, lowercase and numbers",
      }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required",
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base":
          "Password must contain uppercase, lowercase and numbers",
        "string.empty": "New password is required",
      }),
  }),
};
