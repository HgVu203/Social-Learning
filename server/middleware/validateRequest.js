export const validateRequest = (schema) => {
  return (req, res, next) => {
    // Tạo bản sao của body request và xóa trường images nếu có
    const bodyToValidate = { ...req.body };

    // Kiểm tra và xóa trường images trước khi validate vì multer đã xử lý files
    if (req.files && bodyToValidate.images) {
      delete bodyToValidate.images;
    }

    const { error } = schema.validate(bodyToValidate);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }
    next();
  };
};
