import Joi from "joi";

export const postValidationSchema = {
  create: Joi.object({
    title: Joi.string().required().min(3).max(255).messages({
      "string.empty": "Title is required",
      "string.min": "Title must be at least 3 characters",
      "string.max": "Title must not exceed 255 characters",
    }),
    content: Joi.string().required().min(10).messages({
      "string.empty": "Content is required",
      "string.min": "Content must be at least 10 characters",
    }),
    tags: Joi.alternatives()
      .try(Joi.array().items(Joi.string().trim()), Joi.string())
      .default([]),
    images: Joi.alternatives()
      .try(Joi.array().items(Joi.any()), Joi.object(), Joi.string())
      .optional(),
    groupId: Joi.string().allow(null, "").optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    content: Joi.string().min(10).optional(),
    tags: Joi.alternatives()
      .try(Joi.array().items(Joi.string().trim()), Joi.string())
      .default([]),
    images: Joi.alternatives()
      .try(Joi.array().items(Joi.any()), Joi.object(), Joi.string())
      .optional(),
    groupId: Joi.string().allow(null, "").optional(),
  }),

  comment: Joi.object({
    comment: Joi.string().min(1).max(1000).messages({
      "string.empty": "Comment cannot be empty",
      "string.min": "Comment must be at least 1 character",
      "string.max": "Comment must not exceed 1000 characters",
    }),
    image: Joi.string().uri().allow(null, "").optional(),
    parentId: Joi.string().allow(null).optional(),
  }).or("comment", "image"),

  addComment: Joi.object({
    comment: Joi.string().allow("", null).default(""),
    image: Joi.string().uri().allow(null, "").default(null),
    parentId: Joi.string().allow(null, "").optional(),
  }).custom((obj, helpers) => {
    // Custom validation to ensure at least one of comment or image is provided
    if (
      (!obj.comment || obj.comment.trim() === "") &&
      (!obj.image || obj.image.trim() === "")
    ) {
      return helpers.error("object.min", {
        message: "Either comment text or image is required",
      });
    }
    return obj;
  }),
};
