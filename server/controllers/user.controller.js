import User from "../models/user.model.js";


export const UserController = {
    updatePoints: async (req, res) => {
        try {
            const { points, badge } = req.body;
            const userId = req.user._id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            user.points += points;
            if (user.points >= 1000) user.rank = 'Expert';
            else if (user.points >= 500) user.rank = 'Advanced';
            else if (user.points >= 100) user.rank = 'Intermediate';
            else user.rank = 'Beginner';

            if (badge && !user.badges.includes(badge)) {
                user.badges.push(badge);
            }

            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Points and badges updated successfully',
                data: {
                    points: user.points,
                    rank: user.rank,
                    badges: user.badges
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getLeaderboard: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;

            const users = await User.find()
                .select('username fullname points rank badges') 
                .sort({ points: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await User.countDocuments();

            return res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getUserProfile: async (req, res) => {
        try {
            const userId = req.params.id || req.user._id;
            const user = await User.findById(userId)
                .select('-password -reset_password_token -reset_password_expires');

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const { fullname, phone, address, avatar } = req.body;
            const user = await User.findById(req.user._id);

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            user.fullname = fullname || user.fullname;
            user.phone = phone || user.phone;
            user.address = address || user.address;
            user.avatar = avatar || user.avatar;

            await user.save();

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: user
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};