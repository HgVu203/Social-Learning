import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    fullname: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      match: /^[0-9]{10}$/, // Validate số điện thoại 10 chữ số
    },
    address: {
      type: String,
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    rank: {
      type: String,
      enum: [
        "Rookie",
        "Bronze",
        "Silver",
        "Gold",
        "Platinum",
        "Diamond",
        "Master",
      ],
      default: "Rookie",
    },
    badges: [
      {
        name: {
          type: String,
          required: true,
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "default-avatar.png", // Ảnh mặc định
    },
    reset_password_token: String,
    reset_password_expires: Date,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual("postCount", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
  count: true,
  match: { deleted: false },
});

UserSchema.virtual("activityCount", {
  ref: "UserActivity",
  localField: "_id",
  foreignField: "userId",
  count: true,
});

const User = mongoose.model("User", UserSchema);
export default User;
