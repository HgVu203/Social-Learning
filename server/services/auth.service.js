import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signToken, verifyToken } from "../utils/token/handleToken.js";
import User from "../models/user.model.js";
import { transporter } from "../utils/sendmail/transport.js";
import { templateResetPassword } from "../utils/template/resetPassword.js";
import { templateVerificationEmail } from "../utils/template/verificationEmail.js";

export const AuthService = {
  async validateUser(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      return { error: "Invalid email or password" };
    }

    if (user.status === "banned") {
      return { error: "Account has been banned" };
    }

    if (!user.emailVerified) {
      if (!user.emailVerificationToken || !user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
        const verificationToken = this.generateVerificationToken();
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();
      }
      await this.sendVerificationEmail(user.email, user.emailVerificationToken);
      return {
        error:
          "Please verify your email first. A new verification email has been sent.",
      };
    }

    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      return { error: "Invalid email or password" };
    }

    return { user };
  },

  getCookieOptions() {
    return {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  },

  generateTokenPair(user) {
    const accessToken = signToken(user, process.env.ACCESS_TOKEN_SECRET);
    const refreshToken = signToken(user, process.env.REFRESH_TOKEN_SECRET);
    return { accessToken, refreshToken };
  },
  generateAccessToken(token) {
    return signToken(token, process.env.ACCESS_TOKEN_SECRET);
  },
  generateRefreshToken(token) {
    return signToken(token, process.env.REFRESH_TOKEN_SECRET);
  },
  verifyAccessToken(token) {
    return verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
  },

  verifyRefreshToken(token) {
    return verifyToken(token, process.env.REFRESH_TOKEN_SECRET);
  },

  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  },

  async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  },

  generateVerificationToken() {
    return crypto.randomBytes(20).toString("hex");
  },

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    await transporter.sendMail({
      to: email,
      subject: "Verify your email",
      html: templateVerificationEmail(verificationUrl),
    });
  },

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await transporter.sendMail({
      to: email,
      subject: "Password Reset",
      html: templateResetPassword(resetUrl),
    });
  },

  getCookieSettings() {
    return {
      httpOnly: true,
      sameSite: process.env.ENV === "production" ? "none" : "strict",
      secure: process.env.ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  },

  getTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    return authHeader?.split(" ")[1];
  },
};
