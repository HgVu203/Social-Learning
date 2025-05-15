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
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
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
        "Grandmaster",
        "Legend",
      ],
      default: "Rookie",
    },
    badge: {
      name: {
        type: String,
        enum: [
          "gold",
          "silver",
          "bronze",
          "star",
          "expert",
          "contributor",
          "influencer",
          "teacher",
          "innovator",
          "veteran",
        ],
      },
      earnedAt: {
        type: Date,
      },
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
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

UserSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
  match: { deleted: false },
  options: { sort: { createdAt: -1 } },
});

UserSchema.virtual("activityCount", {
  ref: "UserActivity",
  localField: "_id",
  foreignField: "userId",
  count: true,
});

// Thêm virtual cho followers - những người theo dõi user này
UserSchema.virtual("followers", {
  ref: "Follow",
  localField: "_id",
  foreignField: "following",
  justOne: false,
});

// Thêm virtual cho following - những người mà user này theo dõi
UserSchema.virtual("following", {
  ref: "Follow",
  localField: "_id",
  foreignField: "follower",
  justOne: false,
});

// Thêm virtual đếm số followers
UserSchema.virtual("followersCount", {
  ref: "Follow",
  localField: "_id",
  foreignField: "following",
  count: true,
});

// Thêm virtual đếm số following
UserSchema.virtual("followingCount", {
  ref: "Follow",
  localField: "_id",
  foreignField: "follower",
  count: true,
});

// Add indexes for fields often used in queries and sorting
// UserSchema.index({ username: 1 }, { unique: true, background: true });
// UserSchema.index({ email: 1 }, { unique: true, background: true });
UserSchema.index({ status: 1 }, { background: true, name: "idx_status" });
UserSchema.index({ rank: 1 }, { background: true, name: "idx_rank" });
UserSchema.index(
  { createdAt: -1 },
  { background: true, name: "idx_createdAt" }
);
UserSchema.index(
  { lastLogin: -1 },
  { background: true, name: "idx_lastLogin" }
);
UserSchema.index(
  { fullname: "text", username: "text", bio: "text" },
  {
    name: "idx_user_search",
    background: true,
    weights: { fullname: 3, username: 2, bio: 1 },
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
