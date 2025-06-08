// Import mô-đun phát hiện nội dung nhạy cảm và model
const {
  getOffensiveContentGroups,
} = require("../utils/offensiveContentDetector");
const Post = require("../models/Post");

/**
 * Lấy danh sách bài viết cho admin có hỗ trợ phát hiện nội dung nhạy cảm
 */
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status || "";
    const searchTerm = req.query.searchTerm || "";
    const searchField = req.query.searchField || "all";

    // Tham số cho phát hiện bài viết trùng lặp
    const findDuplicates = req.query.findDuplicates === "true";

    let query = {};

    // Xây dựng query theo status
    if (status) {
      query.status = status;
    }

    // Xây dựng query theo searchField và searchTerm
    if (searchTerm) {
      if (searchField === "all") {
        query.$or = [
          { content: { $regex: searchTerm, $options: "i" } },
          { "author.username": { $regex: searchTerm, $options: "i" } },
          { "author.fullname": { $regex: searchTerm, $options: "i" } },
        ];
      } else if (searchField === "content") {
        query.content = { $regex: searchTerm, $options: "i" };
      } else if (searchField === "author") {
        query.$or = [
          { "author.username": { $regex: searchTerm, $options: "i" } },
          { "author.fullname": { $regex: searchTerm, $options: "i" } },
        ];
      }
      // ... (other search fields)
    }

    // Thực hiện truy vấn cơ sở dữ liệu
    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);

    let posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Phát hiện bài viết trùng lặp nếu được yêu cầu
    let duplicateGroups = [];
    if (findDuplicates) {
      console.log("[Admin API] Detecting duplicate posts...");

      // Lấy thêm bài viết để so sánh (tối đa 100 bài gần nhất)
      const allPosts = await Post.find({}).sort({ createdAt: -1 }).limit(100);

      console.log(
        `[Admin API] Found ${allPosts.length} posts to compare for duplicates`
      );

      // Lọc bài viết có nội dung trên 50 ký tự
      const validPosts = allPosts.filter(
        (post) => post.content && post.content.length > 50
      );
      console.log(
        `[Admin API] ${validPosts.length} posts have content longer than 50 characters`
      );

      // Import các hàm từ mô-đun AI
      const aiUtils = await import("../utils/ai.js");
      const { createEmbedding, cosineSimilarity } = aiUtils;

      // Kiểm tra mô-đun đã được import thành công hay chưa
      if (!createEmbedding || !cosineSimilarity) {
        console.error("[Admin API] Failed to import AI utilities");
        return res.status(500).json({
          success: false,
          error: "Failed to load AI utilities module",
        });
      }

      // Tạo embedding cho mỗi bài viết
      const postsWithEmbeddings = [];
      for (const post of validPosts) {
        try {
          const embedding = await createEmbedding(post.content);
          postsWithEmbeddings.push({
            id: post._id.toString(),
            content: post.content,
            embedding: embedding,
          });
        } catch (error) {
          console.error(
            `[Admin API] Error creating embedding for post ${post._id}:`,
            error.message
          );
        }
      }

      // Ngưỡng cho phần phát hiện trùng lặp
      const SIMILARITY_THRESHOLD = 0.85; // Độ tương tự tối thiểu để coi là trùng lặp

      // Tạo các nhóm bài viết trùng lặp
      const groupedPosts = [];
      const processedPosts = new Set();

      // So sánh từng cặp bài viết
      for (let i = 0; i < postsWithEmbeddings.length; i++) {
        if (processedPosts.has(postsWithEmbeddings[i].id)) {
          continue; // Bỏ qua bài viết đã được xử lý
        }

        const currentGroup = [];
        currentGroup.push(postsWithEmbeddings[i].id);

        for (let j = 0; j < postsWithEmbeddings.length; j++) {
          if (i === j || processedPosts.has(postsWithEmbeddings[j].id)) {
            continue; // Không so sánh bài viết với chính nó hoặc bài đã xử lý
          }

          const similarity = cosineSimilarity(
            postsWithEmbeddings[i].embedding,
            postsWithEmbeddings[j].embedding
          );

          if (similarity >= SIMILARITY_THRESHOLD) {
            currentGroup.push(postsWithEmbeddings[j].id);
            processedPosts.add(postsWithEmbeddings[j].id);
          }
        }

        // Nếu tìm được nhóm có từ 2 bài viết trở lên, đưa vào kết quả
        if (currentGroup.length > 1) {
          groupedPosts.push(currentGroup);
          processedPosts.add(postsWithEmbeddings[i].id);
        }
      }

      // Chuyển đổi kết quả sang định dạng yêu cầu của frontend
      duplicateGroups = groupedPosts.map((group, index) => {
        return {
          groupId: index + 1,
          postIds: group,
          similarity: "high", // Có thể thay bằng giá trị thực tế nếu cần
        };
      });

      console.log(
        `[Admin API] Found ${duplicateGroups.length} duplicate groups`
      );
    }

    // Chuẩn bị thống kê về nội dung nhạy cảm
    let offensiveContentGroups = [];

    // Lấy thống kê tổng hợp về nội dung nhạy cảm
    const offensiveStats = await Post.aggregate([
      { $match: { offensiveContent: true } },
      {
        $group: {
          _id: "$offensiveSeverity",
          count: { $sum: 1 },
        },
      },
    ]);

    // Chuyển đổi kết quả thành định dạng thống kê
    if (offensiveStats.length > 0) {
      offensiveContentGroups = offensiveStats
        .filter((stat) => stat._id) // Loại bỏ null
        .map((stat) => ({
          severity: stat._id,
          count: stat.count,
        }));
    }

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      duplicateGroups,
      offensiveContentGroups,
    });
  } catch (error) {
    console.error("Error getting admin posts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get posts",
    });
  }
};

/**
 * Phân tích lại nội dung nhạy cảm cho bài viết đã có
 */
exports.analyzePostContent = async (req, res) => {
  try {
    const { postId } = req.params;

    // Tìm bài viết
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Import mô-đun phát hiện nội dung nhạy cảm
    const { analyzeContent } = require("../utils/offensiveContentDetector");

    // Phân tích nội dung
    const result = analyzeContent(post.content);

    // Cập nhật bài viết
    post.offensiveContent = result.offensiveContent;
    post.offensiveSeverity = result.offensiveSeverity;
    post.offensiveWords = result.offensiveWords;

    await post.save();

    return res.json({
      success: true,
      data: {
        postId: post._id,
        offensiveContent: post.offensiveContent,
        offensiveSeverity: post.offensiveSeverity,
        offensiveWords: post.offensiveWords,
      },
    });
  } catch (error) {
    console.error("Error analyzing post content:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to analyze post content",
    });
  }
};

/**
 * Phân tích lại nội dung nhạy cảm cho tất cả bài viết
 */
exports.analyzeAllPostsContent = async (req, res) => {
  try {
    console.log("[Admin API] Starting content analysis of all posts");

    // Tìm tất cả bài viết hoặc lọc theo query (nếu cần)
    const query = req.query.status ? { status: req.query.status } : {};
    console.log("[Admin API] Query filter:", query);

    const posts = await Post.find(query);
    console.log(`[Admin API] Found ${posts?.length || 0} posts to analyze`);

    if (!posts || posts.length === 0) {
      console.log("[Admin API] No posts found for analysis");
      return res.status(200).json({
        success: true,
        message: "No posts found for analysis",
        stats: {
          totalPosts: 0,
          updatedPosts: 0,
          offensivePosts: 0,
          severityDistribution: { high: 0, medium: 0, low: 0 },
        },
      });
    }

    // Import mô-đun phát hiện nội dung nhạy cảm
    const { analyzeContent } = require("../utils/offensiveContentDetector");
    if (!analyzeContent) {
      console.error("[Admin API] analyzeContent function not found");
      return res.status(500).json({
        success: false,
        error: "Content analysis module not available",
      });
    }

    let updatedCount = 0;
    let offensiveCount = 0;
    let errorCount = 0;

    console.log(`[Admin API] Starting analysis of ${posts.length} posts`);

    // Phân tích từng bài viết
    for (let post of posts) {
      try {
        if (!post || !post._id) {
          console.log("[Admin API] Invalid post object, skipping");
          errorCount++;
          continue;
        }

        if (!post.content) {
          console.log(`[Admin API] Skipping post ${post._id} - no content`);
          continue;
        }

        const result = analyzeContent(post.content);
        if (!result) {
          console.log(`[Admin API] No analysis result for post ${post._id}`);
          continue;
        }

        // Chỉ cập nhật nếu có thay đổi
        if (
          post.offensiveContent !== result.offensiveContent ||
          post.offensiveSeverity !== result.offensiveSeverity
        ) {
          post.offensiveContent = result.offensiveContent;
          post.offensiveSeverity = result.offensiveSeverity;
          post.offensiveWords = result.offensiveWords;

          try {
            await post.save();
            updatedCount++;

            if (result.offensiveContent) {
              offensiveCount++;
            }
          } catch (saveError) {
            console.error(
              `[Admin API] Error saving post ${post._id}:`,
              saveError
            );
            errorCount++;
          }
        }
      } catch (postError) {
        errorCount++;
        console.error(
          `[Admin API] Error analyzing post ${post?._id || "unknown"}:`,
          postError
        );
        // Tiếp tục với bài viết tiếp theo
      }
    }

    // Phân loại các bài viết sau khi phân tích
    const analyzeStats = {
      totalPosts: posts.length,
      updatedPosts: updatedCount,
      offensivePosts: offensiveCount,
      errorCount: errorCount,
      severityDistribution: {
        high: posts.filter((p) => p.offensiveSeverity === "high").length,
        medium: posts.filter((p) => p.offensiveSeverity === "medium").length,
        low: posts.filter((p) => p.offensiveSeverity === "low").length,
      },
    };

    console.log("[Admin API] Content analysis completed:", analyzeStats);

    return res.status(200).json({
      success: true,
      message: `Analyzed ${posts.length} posts, updated ${updatedCount}, found ${offensiveCount} with offensive content, errors: ${errorCount}`,
      stats: analyzeStats,
    });
  } catch (error) {
    console.error("[Admin API] Error analyzing all posts:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to analyze posts content: ${
        error.message || "Unknown error"
      }`,
    });
  }
};

/**
 * Phân tích tất cả bài viết để tìm nội dung trùng lặp
 */
exports.analyzeDuplicateContent = async (req, res) => {
  try {
    console.log("[Admin API] Starting duplicate content analysis");

    // Tìm tất cả bài viết có nội dung đủ dài
    const query = req.query.status ? { status: req.query.status } : {};
    const allPosts = await Post.find(query).sort({ createdAt: -1 }).limit(200);

    console.log(`[Admin API] Found ${allPosts.length} posts to analyze`);

    // Lọc bài viết có nội dung trên 50 ký tự
    const validPosts = allPosts.filter(
      (post) => post.content && post.content.length > 50
    );
    console.log(
      `[Admin API] ${validPosts.length} posts have content longer than 50 characters`
    );

    if (validPosts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No valid posts found for duplicate analysis",
        stats: {
          totalPosts: allPosts.length,
          validPosts: 0,
          duplicateGroups: 0,
        },
      });
    }

    // Import các hàm từ mô-đun AI
    const aiUtils = await import("../utils/ai.js");
    const { createEmbedding, cosineSimilarity } = aiUtils;

    // Kiểm tra mô-đun đã được import thành công hay chưa
    if (!createEmbedding || !cosineSimilarity) {
      console.error("[Admin API] Failed to import AI utilities");
      return res.status(500).json({
        success: false,
        error: "Failed to load AI utilities module",
      });
    }

    // Tạo embedding cho mỗi bài viết
    const postsWithEmbeddings = [];
    console.log(
      `[Admin API] Generating embeddings for ${validPosts.length} posts`
    );

    for (const post of validPosts) {
      try {
        const embedding = await createEmbedding(post.content);
        postsWithEmbeddings.push({
          id: post._id.toString(),
          content: post.content,
          title: post.title || "",
          author: post.author,
          embedding: embedding,
        });
      } catch (error) {
        console.error(
          `[Admin API] Error creating embedding for post ${post._id}:`,
          error.message
        );
      }
    }

    console.log(
      `[Admin API] Generated embeddings for ${postsWithEmbeddings.length} posts`
    );

    // Ngưỡng cho phần phát hiện trùng lặp
    const SIMILARITY_THRESHOLD = 0.85; // Độ tương tự tối thiểu để coi là trùng lặp

    // Tạo các nhóm bài viết trùng lặp
    const groupedPosts = [];
    const processedPosts = new Set();

    // So sánh từng cặp bài viết
    for (let i = 0; i < postsWithEmbeddings.length; i++) {
      if (processedPosts.has(postsWithEmbeddings[i].id)) {
        continue; // Bỏ qua bài viết đã được xử lý
      }

      const currentGroup = [];
      currentGroup.push(postsWithEmbeddings[i].id);

      for (let j = 0; j < postsWithEmbeddings.length; j++) {
        if (i === j || processedPosts.has(postsWithEmbeddings[j].id)) {
          continue; // Không so sánh bài viết với chính nó hoặc bài đã xử lý
        }

        const similarity = cosineSimilarity(
          postsWithEmbeddings[i].embedding,
          postsWithEmbeddings[j].embedding
        );

        if (similarity >= SIMILARITY_THRESHOLD) {
          currentGroup.push(postsWithEmbeddings[j].id);
          processedPosts.add(postsWithEmbeddings[j].id);
        }
      }

      // Nếu tìm được nhóm có từ 2 bài viết trở lên, đưa vào kết quả
      if (currentGroup.length > 1) {
        groupedPosts.push(currentGroup);
        processedPosts.add(postsWithEmbeddings[i].id);
      }
    }

    // Chuyển đổi kết quả sang định dạng yêu cầu của frontend
    const duplicateGroups = groupedPosts.map((group, index) => {
      return {
        groupId: index + 1,
        postIds: group,
        similarity: "high", // Có thể thay bằng giá trị thực tế nếu cần
      };
    });

    console.log(`[Admin API] Found ${duplicateGroups.length} duplicate groups`);

    // Tìm danh sách ID của tất cả bài viết trùng lặp
    const allDuplicatePostIds = new Set();
    duplicateGroups.forEach((group) => {
      group.postIds.forEach((id) => {
        allDuplicatePostIds.add(id);
      });
    });

    const stats = {
      totalPosts: allPosts.length,
      validPosts: validPosts.length,
      duplicateGroups: duplicateGroups.length,
      duplicatePosts: allDuplicatePostIds.size,
    };

    console.log("[Admin API] Duplicate content analysis completed:", stats);

    return res.status(200).json({
      success: true,
      message: `Analyzed ${validPosts.length} posts, found ${duplicateGroups.length} duplicate groups with ${allDuplicatePostIds.size} posts`,
      stats: stats,
      duplicateGroups: duplicateGroups,
    });
  } catch (error) {
    console.error("[Admin API] Error analyzing duplicate content:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to analyze duplicate content: ${
        error.message || "Unknown error"
      }`,
    });
  }
};
