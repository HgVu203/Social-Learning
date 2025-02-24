import Joi from "joi";

const paginationSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'views', 'likes').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
});

export const queryValidationSchema = {
    pagination: paginationSchema,

    search: Joi.object({
        keyword: Joi.string().min(2).max(50).optional(),
        tag: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
        ).optional(),
        author: Joi.string().optional()
    }).concat(paginationSchema)
};