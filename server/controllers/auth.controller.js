import User from "../models/user.model.js";
import { AuthService } from "../services/auth.service.js";
import passport from "passport";

export const AuthController = {
  signup: async (req, res) => {
    try {
      const { email, password, username, fullname } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: `${
            existingUser.email === email ? "Email" : "Username"
          } already exists`,
        });
      }

      const hashedPassword = await AuthService.hashPassword(password);
      const verificationToken = AuthService.generateVerificationToken();

      const newUser = new User({
        email,
        username,
        password: hashedPassword,
        fullname,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      });

      await newUser.save();
      await AuthService.sendVerificationEmail(email, verificationToken);

      return res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email to verify your account.",
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({
        success: false,
        error: "Registration failed",
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const { user, error: validationError } = await AuthService.validateUser(
        email,
        password
      );
      if (validationError) {
        return res.status(401).json({
          success: false,
          error: validationError,
        });
      }

      

      user.lastLogin = new Date();
      await user.save();

      const { accessToken, refreshToken } = AuthService.generateTokenPair(user);

      res.cookie("refreshToken", refreshToken, AuthService.getCookieSettings());

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          accessToken,
          user: {
            _id: user._id,
            email: user.email,
            username: user.username,
            fullname: user.fullname,
            role: user.role,
            avatar: user.avatar,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        error: "Login failed",
      });
    }
  },

  logout: async (req, res) => {
    try {
      res.clearCookie("refreshToken");
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({
        success: false,
        error: "Logout failed",
      });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: "Refresh token is required",
        });
      }

      const { valid, decoded, error } =
        AuthService.verifyRefreshToken(refreshToken);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: error || "Invalid refresh token",
        });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "User not found",
        });
      }

      const tokens = AuthService.generateTokenPair(user);
      return res.status(200).json({
        success: true,
        data: { accessToken: tokens.accessToken },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      return res.status(500).json({
        success: false,
        error: "Token refresh failed",
      });
    }
  },

  verifyEmail: async (req, res) => {
    try {
      const { token } = req.params;
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired verification token",
        });
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Email verification failed",
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const token = AuthService.generateVerificationToken();
      user.reset_password_token = token;
      user.reset_password_expires = Date.now() + 3600000; // 1 hour
      await user.save();

      await AuthService.sendPasswordResetEmail(email, token);

      return res.status(200).json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send reset email",
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      const user = await User.findOne({
        reset_password_token: token,
        reset_password_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired reset token",
        });
      }

      user.password = await AuthService.hashPassword(password);
      user.reset_password_token = undefined;
      user.reset_password_expires = undefined;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({
        success: false,
        error: "Password reset failed",
      });
    }
  },

  setPassword: async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.params.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const hashedPassword = await AuthService.hashPassword(password);

      user.password = hashedPassword;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password set successfully",
      });
    } catch (error) {
      console.error("Set password error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to set password",
      });
    }
  },

  googleLogin: passport.authenticate("google", {
    scope: ["profile", "email"],
  }),

  googleCallback: (req, res, next) => {
    passport.authenticate("google", (err, user) => {
      if (err || !user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=Google authentication failed`
        );
      }
      handleOAuthSuccess(req, res, user);
    })(req, res, next);
  },

  facebookLogin: passport.authenticate("facebook", {
    scope: ["email"],
  }),

  facebookCallback: (req, res, next) => {
    passport.authenticate("facebook", (err, user) => {
      if (err || !user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=Facebook authentication failed`
        );
      }
      handleOAuthSuccess(req, res, user);
    })(req, res, next);
  },
};

const handleOAuthSuccess = async (req, res, user) => {
  try {
    const { accessToken, refreshToken } = AuthService.generateTokenPair(user);
    res.cookie("refreshToken", refreshToken, AuthService.getCookieSettings());
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          fullname: user.fullname,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error("OAuth success handling error:", error);
    return res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};
