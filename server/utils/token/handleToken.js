import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

export const signToken = (user, secret, time) => {
  // Check if it's a user object with _id or a custom payload
  const payload = user.userId ? user : { userId: user._id };
  
  return jwt.sign(payload, secret, {
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
