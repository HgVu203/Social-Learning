import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    isPasswordSet: {
        type: Boolean,
        default: false
    },
    fullname: String,
    phone: String,
    address: String,
    point: {
        type: Number,
        default: 0
    },
    rank: {
        type: String
    },
    badges: [
        {
            type: String,
            default: []
        },
    ],
    role: {
        type: String,
        default: 'user'
    },
    avatar: String,
    reset_password_token: String,
    reset_password_expires: Date,
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    facebookId: {
        type: String,
        unique: true,
        sparse: true
    }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;