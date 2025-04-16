import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 255,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
      },
    ],
    images: [
      {
        type: String,
        default: [],
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PostSchema.virtual("likeCount", {
  ref: "Feedback",
  localField: "_id",
  foreignField: "postId",
  count: true,
  match: { type: "like" },
});

PostSchema.virtual("commentCount", {
  ref: "Feedback",
  localField: "_id",
  foreignField: "postId",
  count: true,
});

const Post = mongoose.model("Post", PostSchema);
export default Post;
