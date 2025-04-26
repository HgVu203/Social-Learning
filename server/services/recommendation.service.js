import natural from "natural";
const TfIdf = natural.TfIdf;

const RecommendationService = {
  // Calculate similarity between tag sets
  calculateTagSimilarity(userTags, postTags) {
    if (!userTags?.length || !postTags?.length) return 0;

    const set1 = new Set(userTags);
    const set2 = new Set(postTags);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    return intersection.size / Math.sqrt(set1.size * set2.size);
  },

  // Calculate text similarity using TF-IDF
  calculateTextSimilarity(text1, text2) {
    const tfidf = new TfIdf();
    tfidf.addDocument(text1);
    tfidf.addDocument(text2);

    let similarity = 0;
    tfidf.listTerms(0).forEach((term) => {
      similarity += tfidf.tfidf(term.term, 1);
    });

    return similarity;
  },

  // Get text representation of a post
  getPostText(post) {
    return `${post.title} ${post.content} ${post.tags.join(" ")}`.toLowerCase();
  },

  // Calculate interaction weight based on type
  getInteractionWeight(type) {
    const weights = {
      like: 3,
      comment: 2,
      view: 1,
    };
    return weights[type] || 0;
  },

  // Calculate recency weight
  calculateRecencyWeight(date, halfLifeDays = 7) {
    const daysAgo = (Date.now() - new Date(date)) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysAgo / halfLifeDays);
  },

  // Build user profile from activities
  buildUserProfile(activities) {
    const profile = {
      tags: {},
      contentVectors: [],
      interactionScores: {},
    };

    activities.forEach((activity) => {
      if (!activity.postId) return;

      const recencyWeight = this.calculateRecencyWeight(activity.createdAt);
      const interactionWeight = this.getInteractionWeight(activity.type);
      const totalWeight = recencyWeight * interactionWeight;

      // Update tag preferences
      activity.postId.tags.forEach((tag) => {
        profile.tags[tag] = (profile.tags[tag] || 0) + totalWeight;
      });

      // Store content vector
      profile.contentVectors.push(this.getPostText(activity.postId));

      // Store interaction score
      profile.interactionScores[activity.postId._id] = totalWeight;
    });

    return profile;
  },

  // Score a post for recommendation
  scorePost(userProfile, post) {
    // Tag similarity (30%)
    const tagSimilarity = this.calculateTagSimilarity(
      Object.keys(userProfile.tags),
      post.tags
    );

    // Content similarity (30%)
    const contentSimilarity =
      userProfile.contentVectors.reduce((sum, vector) => {
        return (
          sum + this.calculateTextSimilarity(vector, this.getPostText(post))
        );
      }, 0) / Math.max(userProfile.contentVectors.length, 1);

    // Popularity score (20%)
    const views = post.views || 0;
    const likes = post.likeCount || 0;
    const popularityScore = Math.min((views + likes * 2) / 1000, 1);

    // Recency score (20%)
    const recencyScore = this.calculateRecencyWeight(post.createdAt, 30);

    // Calculate final score
    const finalScore =
      tagSimilarity * 0.3 +
      contentSimilarity * 0.3 +
      popularityScore * 0.2 +
      recencyScore * 0.2;

    return {
      tagSimilarity: Math.round(tagSimilarity * 100) / 100,
      contentSimilarity: Math.round(contentSimilarity * 100) / 100,
      popularityScore: Math.round(popularityScore * 100) / 100,
      recencyScore: Math.round(recencyScore * 100) / 100,
      final: Math.round(finalScore * 100) / 100,
    };
  },
};

export default RecommendationService;
