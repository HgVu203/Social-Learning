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
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "featured", "blocked", "deleted", "active"],
      default: "approved",
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
    offensiveContent: {
      type: Boolean,
      default: false,
      index: true,
    },
    offensiveSeverity: {
      type: String,
      enum: ["low", "medium", "high", null],
      default: null,
    },
    offensiveWords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook để phân tích nội dung nhạy cảm
PostSchema.pre("save", async function (next) {
  if (this.isModified("content")) {
    try {
      // Import và sử dụng hàm phân tích
      const { analyzeContent } = await import(
        "../services/content-moderation.service.js"
      );

      const result = analyzeContent(this.content);

      this.offensiveContent = result.offensiveContent;
      this.offensiveSeverity = result.offensiveSeverity;
      this.offensiveWords = result.offensiveWords;
    } catch (error) {
      console.error("Error analyzing content for offensive language:", error);
    }
  }

  next();
});

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

// Add indexes for fields often used in queries and sorting
PostSchema.index({ author: 1 }, { background: true, name: "idx_author" });
PostSchema.index({ status: 1 }, { background: true, name: "idx_status" });
PostSchema.index(
  { createdAt: -1 },
  { background: true, name: "idx_createdAt" }
);
PostSchema.index({ deleted: 1 }, { background: true, name: "idx_deleted" });
PostSchema.index({ groupId: 1 }, { background: true, name: "idx_groupId" });
PostSchema.index({ tags: 1 }, { background: true, name: "idx_tags" });
PostSchema.index(
  { title: "text", content: "text", tags: "text" },
  {
    name: "idx_post_search",
    background: true,
    weights: { title: 3, content: 2, tags: 1 },
  }
);
PostSchema.index(
  { author: 1, createdAt: -1 },
  { background: true, name: "idx_author_createdAt" }
);
PostSchema.index(
  { deleted: 1, status: 1 },
  { background: true, name: "idx_deleted_status" }
);

const Post = mongoose.model("Post", PostSchema);
export default Post;
