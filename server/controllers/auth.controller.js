import User from "../models/user.model.js";
import { AuthService } from "../services/auth.service.js";
import passport from "passport";

export const AuthController = {
  signup: async (req, res) => {
    try {
      const { email, password, username, fullname } = req.body;

      // First check for existing verified accounts with the same email or username
      const existingVerifiedUser = await User.findOne({
        $or: [
          { email, emailVerified: true },
          { username, emailVerified: true },
        ],
      });

      if (existingVerifiedUser) {
        return res.status(400).json({
          success: false,
          error: `${
            existingVerifiedUser.email === email ? "Email" : "Username"
          } already exists`,
        });
      }

      // Check for existing unverified accounts with the same email
      const existingUnverifiedUser = await User.findOne({
        email,
        emailVerified: false,
      });

      const hashedPassword = await AuthService.hashPassword(password);
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      let user;

      if (existingUnverifiedUser) {
        // Update existing unverified account
        existingUnverifiedUser.username = username;
        existingUnverifiedUser.password = hashedPassword;
        existingUnverifiedUser.fullname = fullname;
        existingUnverifiedUser.emailVerificationToken = verificationCode;
        existingUnverifiedUser.emailVerificationExpires = Date.now() + 3600000;

        user = await existingUnverifiedUser.save();
      } else {
        // Check if username already exists in another unverified account
        const existingUnverifiedUsername = await User.findOne({
          username,
          email: { $ne: email },
          emailVerified: false,
        });

        if (existingUnverifiedUsername) {
          return res.status(400).json({
            success: false,
            error: "Username already exists",
          });
        }

        // Create new user
        const newUser = new User({
          email,
          username,
          password: hashedPassword,
          fullname,
          emailVerified: false,
          emailVerificationToken: verificationCode,
          emailVerificationExpires: Date.now() + 3600000,
        });

        user = await newUser.save();
      }

      await AuthService.sendVerificationEmail(email, verificationCode);

      return res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email.",
        data: {
          verificationData: {
            email,
            userId: user._id,
          },
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({
        success: false,
        error: "Registration failed. Please try again later.",
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      if (user.status === "banned") {
        return res.status(403).json({
          success: false,
          error: "Account has been banned",
        });
      }

      if (!user.emailVerified) {
        if (
          !user.emailVerificationToken ||
          user.emailVerificationExpires < Date.now()
        ) {
          const newCode = Math.floor(
            100000 + Math.random() * 900000
          ).toString();
          user.emailVerificationToken = newCode;
          user.emailVerificationExpires = Date.now() + 3600000;
          await user.save();

          await AuthService.sendVerificationEmail(user.email, newCode);
        }

        return res.status(403).json({
          success: false,
          error: "Email verification required",
          data: {
            requiresVerification: true,
            email: user.email,
            userId: user._id,
          },
        });
      }

      const isValidPassword = await AuthService.comparePassword(
        password,
        user.password
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const { accessToken, refreshToken } = AuthService.generateTokenPair(user);
      res.cookie("refreshToken", refreshToken, AuthService.getCookieSettings());

      return res.status(200).json({
        success: true,
        message: "Login successfully",
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
        error: "Login failed. Please try again later.",
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
      const { code, email, userId } = req.body;

      // Find user by either userId or email, with matching verification code
      const query = {
        emailVerificationToken: code,
        emailVerificationExpires: { $gt: Date.now() },
      };

      // Add either userId or email to the query, depending on what was provided
      if (userId) {
        query._id = userId;
      } else if (email) {
        query.email = email;
      } else {
        return res.status(400).json({
          success: false,
          error: "Email or userId is required",
        });
      }

      const user = await User.findOne(query);

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired verification code",
        });
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      // Generate tokens for auto-login after verification
      const { accessToken, refreshToken } = AuthService.generateTokenPair(user);
      res.cookie("refreshToken", refreshToken, AuthService.getCookieSettings());

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
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
      console.error("Email verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Email verification failed. Please try again later.",
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

      const resetCode = AuthService.generateVerificationToken();
      user.reset_password_token = resetCode;
      user.reset_password_expires = Date.now() + 3600000; // 1 hour
      await user.save();

      await AuthService.sendPasswordResetEmail(email, resetCode);

      return res.status(200).json({
        success: true,
        message: "Password reset code sent to your email",
        data: { email },
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send reset code",
      });
    }
  },

  verifyResetCode: async (req, res) => {
    try {
      const { code, email } = req.body;

      const user = await User.findOne({
        email,
        reset_password_token: code,
        reset_password_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired reset code",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Reset code verified successfully",
      });
    } catch (error) {
      console.error("Verify reset code error:", error);
      return res.status(500).json({
        success: false,
        error: "Code verification failed",
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { code, email, password } = req.body;

      const user = await User.findOne({
        email,
        reset_password_token: code,
        reset_password_expires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired reset code",
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

  changePassword: async (req, res) => {
    try {
      console.log("Change password request:", {
        user: req.user,
        body: req.body,
      });

      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id;

      // Lấy thông tin user từ database
      const user = await User.findById(userId);
      if (!user) {
        console.log("User not found for ID:", userId);
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Kiểm tra xem user có mật khẩu hay không (trường hợp đăng nhập qua social)
      if (!user.password) {
        console.log("User has no password (social login account):", userId);
        return res.status(400).json({
          success: false,
          error:
            "You cannot change password when using a Facebook or Google account.",
        });
      }

      // Kiểm tra mật khẩu hiện tại
      const isPasswordValid = await AuthService.comparePassword(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        console.log("Invalid current password for user:", userId);
        return res.status(400).json({
          success: false,
          error: "Current password is incorrect",
        });
      }

      // Kiểm tra mật khẩu mới không trùng với mật khẩu cũ
      if (currentPassword === newPassword) {
        console.log("New password same as current for user:", userId);
        return res.status(400).json({
          success: false,
          error: "New password cannot be the same as current password",
        });
      }

      // Mã hóa và lưu mật khẩu mới
      const hashedPassword = await AuthService.hashPassword(newPassword);
      user.password = hashedPassword;

      await user.save();

      console.log("Password changed successfully for user:", userId);
      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error details:", {
        message: error.message,
        stack: error.stack,
        user: req.user ? req.user._id : "unknown",
      });
      return res.status(500).json({
        success: false,
        error: "Failed to change password",
      });
    }
  },

  googleLogin: passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    session: false,
  }),

  googleCallback: (req, res, next) => {
    console.log("Google callback reached");
    passport.authenticate("google", { session: false }, (err, user) => {
      if (err) {
        console.error("Google authentication error:", err);
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(
            err.message || "Google authentication failed"
          )}`
        );
      }
      if (!user) {
        console.error("No user returned from Google OAuth");
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=No user data received from Google`
        );
      }
      console.log("Google authentication successful for user:", user.email);
      handleOAuthSuccess(req, res, user);
    })(req, res, next);
  },

  facebookLogin: passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  }),

  facebookCallback: (req, res, next) => {
    console.log("Facebook callback reached");
    passport.authenticate("facebook", { session: false }, (err, user) => {
      if (err) {
        console.error("Facebook authentication error:", err);
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(
            err.message || "Facebook authentication failed"
          )}`
        );
      }
      if (!user) {
        console.error("No user returned from Facebook OAuth");
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=No user data received from Facebook`
        );
      }
      console.log("Facebook authentication successful for user:", user.email);
      handleOAuthSuccess(req, res, user);
    })(req, res, next);
  },

  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      const user = await User.findOne({ email, emailVerified: false });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found or already verified",
        });
      }

      // Generate new verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      // Update user with new code
      user.emailVerificationToken = verificationCode;
      user.emailVerificationExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Send verification email
      await AuthService.sendVerificationEmail(email, verificationCode);

      return res.status(200).json({
        success: true,
        message: "Verification code resent successfully",
        data: {
          email,
        },
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to resend verification code",
      });
    }
  },
};

const handleOAuthSuccess = async (req, res, user) => {
  try {
    // Generate JWT tokens for the user
    const { accessToken, refreshToken } = AuthService.generateTokenPair(user);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set HTTP-only cookie with refresh token
    res.cookie("refreshToken", refreshToken, AuthService.getCookieSettings());

    // Create a temporary token with minimal user data and short expiry
    // This avoids passing too much data in URL parameters
    const tempToken = AuthService.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    // Use minimal URL parameters to avoid header size issues
    const params = new URLSearchParams();
    params.append("token", tempToken);
    params.append("nonce", Date.now().toString());

    console.log("Redirecting with minimal parameters");

    const redirectUrl = `${
      process.env.CLIENT_URL
    }/auth/social-callback?${params.toString()}`;

    console.log("Redirecting to:", redirectUrl);

    // Use 303 See Other to ensure a GET request (prevents token reuse issues)
    res.redirect(303, redirectUrl);
  } catch (error) {
    console.error("OAuth success handler error:", error);
    res.redirect(
      303,
      `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(
        "Failed to complete authentication: " +
          (error.message || "Unknown error")
      )}`
    );
  }
};
