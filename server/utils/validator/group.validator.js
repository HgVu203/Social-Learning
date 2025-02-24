import Joi from "joi";

export const groupValidationSchema = {
    create: Joi.object({
        name: Joi.string()
            .required()
            .min(3)
            .max(100)
            .messages({
                "string.empty": "Group name is required",
                "string.min": "Group name must be at least 3 characters",
                "string.max": "Group name must not exceed 100 characters"
            }),
        description: Joi.string()
            .max(500)
            .optional()
            .messages({
                "string.max": "Description must not exceed 500 characters"
            }),
        isPrivate: Joi.boolean()
            .default(false),
        tags: Joi.array()
            .items(Joi.string().trim())
            .optional()
    }),

    updateMember: Joi.object({
        memberId: Joi.string()
            .required()
            .messages({
                "string.empty": "Member ID is required"
            }),
        role: Joi.string()
            .valid('admin', 'member')
            .required()
            .messages({
                "string.empty": "Role is required",
                "any.only": "Role must be either admin or member"
            })
    })
};