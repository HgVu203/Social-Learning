import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Environment configuration
export const env = {
  // General
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || "localhost",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  // Database
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/devconnect",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Email
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || "gmail",
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@devconnect.com",

  // AI Search
  AI_API_ENDPOINT: process.env.AI_API_ENDPOINT || "",
  AI_API_KEY: process.env.AI_API_KEY || "",
  AI_MODEL_NAME: process.env.AI_MODEL_NAME || "text-embedding-ada-002",
  USE_LOCAL_FALLBACK: process.env.USE_LOCAL_FALLBACK || "true",

  // Features
  ENABLE_AI_SEARCH: process.env.ENABLE_AI_SEARCH === "true" || true,
};

export default env;
