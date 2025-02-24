export const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }
        req.query = value; // Use validated and sanitized values
        next();
    };
};

// Apply to routes
