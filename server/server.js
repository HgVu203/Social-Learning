import express from "express";
import mongoose from "mongoose";
import passport from "passport";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { initSocketServer } from "./socket.js";
import authRouter from "./routers/auth.router.js";
import postRouter from "./routers/post.router.js";
import friendshipRouter from "./routers/friendship.router.js";
import messageRouter from "./routers/message.router.js";
import userRouter from "./routers/user.router.js";
import groupRouter from "./routers/group.router.js";

import "./config/passport.js";

dotenv.config();

// Nhận đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer(app);

// Validate required environment variables
const requiredEnvVars = [
  "CLIENT_URL",
  "SESSION_SECRET",
  "MONGODB_URL",
  "JWT_SECRET",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Enhanced CORS configuration
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Không cần phục vụ tệp tĩnh nữa vì đã dùng Cloudinary
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);
app.use("/api/friendship", friendshipRouter);
app.use("/api/message", messageRouter);
app.use("/api/user", userRouter);
app.use("/api/group", groupRouter);

app.get("/", (req, res) => {
  res.send("Hello World");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("Connected to MongoDB");

    // Start HTTP server instead of Express app directly
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);

      // Initialize Socket.io server
      const io = initSocketServer(server);
      console.log("Socket.io server initialized");
    });
  })
  .catch((error) => {
    console.error("Connection error", error);
  });
