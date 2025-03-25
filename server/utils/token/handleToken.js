import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

export const signToken = (user, secret, time) => {
  return jwt.sign({ userId: user._id }, secret, {
    expiresIn: time,
  });
};

export const verifyToken = (token, secret) => {
  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};
