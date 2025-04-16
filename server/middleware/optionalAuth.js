import User from "../models/user.model.js";
import { AuthService } from "../services/auth.service.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Middleware kiểm tra xác thực không bắt buộc
 * Nếu có token hợp lệ, gán req.user
 * Nếu không có token hoặc token không hợp lệ, tiếp tục xử lý request mà không trả về lỗi
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = AuthService.getTokenFromHeader(req);
    if (!token) {
      return next(); // Không có token, tiếp tục xử lý request
    }

    const { valid, decoded, error } = AuthService.verifyAccessToken(token);
    if (!valid) {
      return next(); // Token không hợp lệ, tiếp tục xử lý request
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user || user.status === "banned") {
      return next(); // Không tìm thấy user hoặc bị cấm, tiếp tục xử lý request
    }

    // Gán user vào request nếu xác thực thành công
    req.user = user;
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Có lỗi, tiếp tục xử lý request
  }
};

export default optionalAuth;
