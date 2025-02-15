import Joi from "joi";

export const signupValidationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Email must be a valid email address",
        "string.empty": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "string.empty": "Password is required",
    }),
    username: Joi.string().min(6).required().messages({
        "string.min": "Username must be at least 6 characters long",
        "string.empty": "Username is required",
    }),
    fullname: Joi.string().min(6).required().messages({
        "string.min": "Username must be at least 6 characters long",
        "string.empty": "Username is required",
    }),
});