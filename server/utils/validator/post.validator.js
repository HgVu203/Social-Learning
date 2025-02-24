import Joi from "joi";

export const postValidationSchema = {
    create: Joi.object({
        title: Joi.string()
            .required()
            .min(3)
            .max(255)
            .messages({
                "string.empty": "Title is required",
                "string.min": "Title must be at least 3 characters",
                "string.max": "Title must not exceed 255 characters"
            }),
        content: Joi.string()
            .required()
            .min(10)
            .messages({
                "string.empty": "Content is required",
                "string.min": "Content must be at least 10 characters"
            }),
        tags: Joi.array()
            .items(Joi.string().trim())
            .optional()
    }),

    update: Joi.object({
        title: Joi.string()
            .min(3)
            .max(255)
            .optional(),
        content: Joi.string()
            .min(10)
            .optional(),
        tags: Joi.array()
            .items(Joi.string().trim())
            .optional()
    }),

    comment: Joi.object({
        comment: Joi.string()
            .required()
            .min(1)
            .max(1000)
            .messages({
                "string.empty": "Comment cannot be empty",
                "string.min": "Comment must be at least 1 character",
                "string.max": "Comment must not exceed 1000 characters"
            })
    })
};