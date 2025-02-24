import User from '../models/user.model.js';
import { AuthService } from '../services/auth.service.js';
import dotenv from 'dotenv';
dotenv.config();

const protectedRouter = async (req, res, next) => {
    try {
        const token = AuthService.getTokenFromHeader(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            });
        }

        const { valid, decoded, error } = AuthService.verifyAccessToken(token);
        if (!valid) {
            return res.status(401).json({
                success: false,
                error: error || 'Invalid access token'
            });
        }

        const user = await User.findById(decoded.userId)
            .select('-password');

        if (!user || user.status === 'banned') {
            return res.status(401).json({
                success: false,
                error: 'User not found or banned'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

export default protectedRouter;