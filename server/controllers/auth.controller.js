import User from "../models/user.model.js";
import { signupValidationSchema } from "../utils/signup.validator.js";
import { loginValidationSchema } from "../utils/login.validator.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import passport from "passport";
dotenv.config();

export const AuthController = {
    signup: async (req, res) => {
        try {
            const { error } = signupValidationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, error: error.details[0].message });
            }

            const { email, password, username, fullname } = req.body;

            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ success: false, error: "Email already exists" });
            }

            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ success: false, error: "Username already exists" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ email, password: hashedPassword, username, fullname, isPasswordSet: true });
            await newUser.save();

            return res.status(201).json({
                success: true,
                data: {
                    message: "User registered successfully",
                    user: { _id: newUser._id, email: newUser.email, username: newUser.username },
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error?.message });
        }
    },

    login: async (req, res) => {
        try {
            const { error } = loginValidationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, error: error.details[0].message });
            }

            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ success: false, error: "Invalid email or password" });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, error: "Invalid email or password" });
            }

            const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
            const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                sameSite: process.env.ENV === "production" ? "none" : "strict",
                secure: process.env.ENV === "production",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });

            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    accessToken,
                    user: { _id: user._id, email: user.email, username: user.username, isPasswordSet: user.isPasswordSet }
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error?.message });
        }
    },

    logout: (req, res) => {
        try {
            res.clearCookie("refreshToken");
            return res.status(200).json({
                success: true,
                data: {
                    message: "User logout successfully"
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error?.message });
        }
    },

    refreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return res.status(400).json({ success: false, error: "Refresh token is required" });
            }

            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(403).json({ success: false, error: "Invalid refresh token" });
                }

                const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: "15m",
                });
                return res.status(200).json({
                    success: true,
                    data: {
                        message: "Access token refreshed",
                        accessToken
                    }
                });
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                error: error?.message
            });
        }
    },

    googleLogin: passport.authenticate("google", {
        scope: ["profile", "email"],
    }),

    googleCallback: (req, res, next) => {
        passport.authenticate("google", (err, user, info) => {
            if (err || !user) {
                return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
            }
            req.login(user, (err) => {
                if (err) {
                    return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
                }
                if (user.isPasswordSet === false) {
                    return res.redirect(`${process.env.CLIENT_URL}/set-password?userId=${user._id}`);
                }
                return res.redirect(`${process.env.CLIENT_URL}`);
            });
        })(req, res, next);
    },

    facebookLogin: passport.authenticate("facebook",
        { scope: ["email"] }
    ),

    facebookCallback: (req, res, next) => {
        passport.authenticate("facebook", (err, user, info) => {
            if (err || !user) {
                return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
            }
            req.login(user, (err) => {
                if (err) {
                    return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
                }
                if (!user.isPasswordSet) {
                    return res.redirect(`${process.env.CLIENT_URL}/set-password?userId=${user._id}`);
                }
                return res.redirect(`${process.env.CLIENT_URL}`);
            });
        })(req, res, next);
    },
    setPassword: async (req, res) => {
        try {
            const { userId, password } = req.body;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            user.isPasswordSet = true;
            await user.save();
            return res.status(200).json({ success: true, message: "Password set successfully" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error?.message });
        }
    }
};
