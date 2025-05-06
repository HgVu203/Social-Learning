import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    coverImage: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          index: true,
        },
        role: {
          type: String,
          enum: ["admin", "operator", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    settings: {
      postApproval: {
        type: Boolean,
        default: false,
      },
      memberApproval: {
        type: Boolean,
        default: true,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "featured", "pending", "blocked"],
      default: "active",
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

GroupSchema.virtual("memberCount").get(function () {
  return this.members ? this.members.length : 0;
});

GroupSchema.index({ name: "text", description: "text", tags: "text" });
GroupSchema.index({ isPrivate: 1, status: 1 });
GroupSchema.index({ "members.user": 1, "members.role": 1 });

const Group = mongoose.model("Group", GroupSchema);
export default Group;
