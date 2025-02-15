import express from "express";
import passport from "passport";
import { AuthController } from "../controllers/auth.controller.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/set-password", AuthController.setPassword);

// Google OAuth
router.get("/google", AuthController.googleLogin);
router.get("/google/callback", AuthController.googleCallback);

// Facebook OAuth
router.get("/facebook", AuthController.facebookLogin);
router.get("/facebook/callback", AuthController.facebookCallback);

export default router;
