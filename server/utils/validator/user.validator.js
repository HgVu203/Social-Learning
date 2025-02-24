import Joi from "joi";

export const userValidationSchema = {
    updateProfile: Joi.object({
        fullname: Joi.string()
            .min(3)
            .max(50)
            .messages({
                "string.min": "Fullname must be at least 3 characters",
                "string.max": "Fullname cannot exceed 50 characters"
            }),
        phone: Joi.string()
            .pattern(/^[0-9]{10}$/)
            .messages({
                "string.pattern.base": "Phone must be 10 digits"
            }),
        address: Joi.string()
            .max(200),
        avatar: Joi.string()
    }),
    
    updatePoints: Joi.object({
        points: Joi.number()
            .min(0)
            .required()
            .messages({
                "number.min": "Points cannot be negative"
            }),
        badge: Joi.string()
            .optional()
    })
};