import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authValidationSchema } from "../utils/validator/auth.validator.js";
import rateLimit from 'express-rate-limit';
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000,
    message: { success: false, error: 'Too many login attempts, please try again later' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, error: 'Too many attempts, please try again later' }
});

// Public routes
router.post("/signup",
    validateRequest(authValidationSchema.signup),
    AuthController.signup
);

router.post("/login",
    loginLimiter,
    validateRequest(authValidationSchema.login),
    AuthController.login
);

router.post("/forgot-password",
    authLimiter,
    validateRequest(authValidationSchema.forgotPassword),
    AuthController.forgotPassword
);

router.post("/reset-password",
    authLimiter,
    validateRequest(authValidationSchema.resetPassword),
    AuthController.resetPassword
);

router.post("/refresh-token", AuthController.refreshToken);

// OAuth routes
router.get("/google", AuthController.googleLogin);
router.get("/google/callback", AuthController.googleCallback);
router.get("/facebook", AuthController.facebookLogin);
router.get("/facebook/callback", AuthController.facebookCallback);
router.get("/verify-email/:token", AuthController.verifyEmail);


// Protected routes
router.use(protectedRouter);

router.post("/logout", AuthController.logout);

router.post("/set-password/:id",
    validateRequest(authValidationSchema.setPassword),
    AuthController.setPassword
);


export default router;
