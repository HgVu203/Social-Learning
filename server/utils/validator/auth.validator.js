import Joi from "joi";

export const authValidationSchema = {
    signup: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Email must be valid",
                "string.empty": "Email is required"
            }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters",
                "string.pattern.base": "Password must contain uppercase, lowercase and numbers"
            }),
        username: Joi.string()
            .min(3)
            .max(30)
            .required()
            .messages({
                "string.min": "Username must be at least 3 characters",
                "string.max": "Username cannot exceed 30 characters"
            }),
        fullname: Joi.string()
            .min(3)
            .max(50)
            .required()
    }),

    login: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Email must be valid",
                "string.empty": "Email is required"
            }),
        password: Joi.string()
            .required()
            .messages({
                "string.empty": "Password is required"
            })
    }),

    forgotPassword: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Email must be valid",
                "string.empty": "Email is required"
            })
    }),

    resetPassword: Joi.object({
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters",
                "string.pattern.base": "Password must contain uppercase, lowercase and numbers"
            }),
        token: Joi.string().required()
    }),

    setPassword: Joi.object({
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters",
                "string.pattern.base": "Password must contain uppercase, lowercase and numbers"
            })
    })
};