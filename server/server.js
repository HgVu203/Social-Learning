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
import RecommendationService from "./services/recommendation.service.js";
import authRouter from "./routers/auth.router.js";
import postRouter from "./routers/post.router.js";
import friendshipRouter from "./routers/friendship.router.js";
import messageRouter from "./routers/message.router.js";
import userRouter from "./routers/user.router.js";
import groupRouter from "./routers/group.router.js";
import uploadRouter from "./routers/upload.router.js";
import adminRouter from "./routers/admin.router.js";
import notificationRouter from "./routers/notification.router.js";
import Post from "./models/post.model.js";
import compression from "express-compression";
import rateLimit from "express-rate-limit";

import "./config/passport.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Create HTTP server
const server = http.createServer(app);

// Tối ưu timeout settings giống với các API admin
server.timeout = 30000; // Giảm từ 60 xuống 30 giây
server.keepAliveTimeout = 15000; // Giảm từ 30 xuống 15 giây
server.headersTimeout = 20000; // Thêm headers timeout

// Tối ưu Node.js event loop
process.env.UV_THREADPOOL_SIZE = 8; // Tăng số luồng xử lý

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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "x-priority",
      "Origin",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Tối ưu kích thước JSON cho phép
app.use(express.json({ limit: "10mb" })); // Giảm từ 50mb xuống 10mb
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Giảm từ 50mb xuống 10mb
app.use(cookieParser());

// Thêm middleware để nén dữ liệu
app.use(
  compression({
    level: 6, // Mức độ nén tối ưu giữa tốc độ và kích thước
  })
);

// Thêm middleware để giới hạn request rate
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100000, // Giới hạn 100 request trên mỗi IP
  standardHeaders: true,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});
app.use("/api/", apiLimiter);

// Không cần phục vụ tệp tĩnh nữa vì đã dùng Cloudinary
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "none" : "lax",
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
app.use("/api/users", userRouter);
app.use("/api/group", groupRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationRouter);

app.get("/", (req, res) => {
  res.send("Hello World");
});

// CRITICAL FIX: Cấu hình Socket.io với độ trễ thấp
const io = initSocketServer(server);

// Cấu hình thêm cho Socket.io để giảm độ trễ
if (io) {
  // Giảm thời gian polling và tăng tần suất ping
  io.engine.pingInterval = 5000; // Giảm từ 10s xuống 5s
  io.engine.pingTimeout = 3000; // Giảm từ 5s xuống 3s

  // Ưu tiên WebSocket hơn polling
  io.engine.transports = ["websocket", "polling"];

  // Thêm giới hạn kết nối và buffer
  io.engine.maxHttpBufferSize = 1e6; // 1MB

  // Tối ưu hóa cấu hình window size và buffer
  io.sockets.setMaxListeners(20);

  // Ghi log khi có kết nối mới - Sửa để tránh lỗi
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Gửi ping ngay lập tức để kiểm tra kết nối
    socket.emit("ping_test");
  });
}

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URL, {
    // Thêm cấu hình tối ưu cho MongoDB
    maxPoolSize: 50, // Tăng kết nối pool
    minPoolSize: 5, // Duy trì ít nhất 5 kết nối
    maxIdleTimeMS: 30000, // Đóng kết nối không sử dụng sau 30s
    connectTimeoutMS: 10000, // Timeout kết nối 10s
    socketTimeoutMS: 15000, // Socket timeout 15s
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    // Initialize recommendation service
    try {
      await RecommendationService.initialize();
      console.log("Recommendation service initialized successfully");

      // Check for existing posts
      const postsCount = await Post.countDocuments();
      console.log(`Total posts: ${postsCount}`);

      if (postsCount > 0) {
        console.log("Starting vector indexing for existing posts...");
        // Index 100 most recent posts if not already indexed
        const recentPosts = await Post.find({ deleted: false })
          .sort({ createdAt: -1 })
          .limit(100);

        for (const post of recentPosts) {
          await RecommendationService.indexPost(post);
        }
        console.log("Completed indexing for existing posts");
      }
    } catch (error) {
      console.error("Error initializing recommendation service:", error);
    }

    // Start HTTP server instead of Express app directly
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Connection error", error);
  });
