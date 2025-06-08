/**
 * Mô-đun phát hiện và phân loại nội dung nhạy cảm
 */

// Từ điển bad words với mức độ nghiêm trọng
const badWordsDict = {
  // Tiếng Việt - Mức độ cao (3 điểm)
  đụ: 3,
  đm: 3,
  địt: 3,
  đéo: 2,
  cặc: 3,
  lồn: 3,
  buồi: 3,
  đít: 2,
  đĩ: 3,
  cave: 2,

  // Tiếng Việt - Mức độ trung bình (2 điểm)
  "chết mẹ": 2,
  "mẹ mày": 2,
  "con mẹ": 2,
  "đồ chó": 2,
  "ngu như chó": 2,
  "đồ điên": 2,
  "thằng ngu": 2,
  "đầu óc": 2,

  // Tiếng Việt - Mức độ thấp (1 điểm)
  ngu: 1,
  dốt: 1,
  "óc lợn": 1,
  "não tôm": 1,
  sml: 1,
  vcl: 1,
  vl: 1,
  vc: 1,

  // Tiếng Anh - Mức độ cao (3 điểm)
  fuck: 3,
  shit: 2,
  bitch: 2,
  cunt: 3,
  dick: 2,
  asshole: 2,

  // Tiếng Anh - Mức độ trung bình (2 điểm)
  wtf: 2,
  stfu: 2,
  "dumb ass": 2,
  idiot: 1,

  // Tiếng Anh - Mức độ thấp (1 điểm)
  stupid: 1,
  dumb: 1,
  suck: 1,
};

/**
 * Phân tích nội dung để phát hiện từ ngữ nhạy cảm
 * @param {string} content - Nội dung cần kiểm tra
 * @returns {Object} Kết quả phân tích
 */
export const analyzeContent = (content) => {
  if (!content) {
    return {
      offensiveContent: false,
      offensiveSeverity: null,
      offensiveWords: [],
      offensiveScore: 0,
    };
  }

  // Chuyển nội dung về chữ thường để so sánh
  const lowerContent = content.toLowerCase();
  const offensiveWords = [];
  let offensiveScore = 0;

  // Tách nội dung thành các từ để so sánh chính xác hơn
  const words = lowerContent.split(/\s+/);

  // Kiểm tra từng từ trong từ điển
  for (const word in badWordsDict) {
    if (word.includes(" ")) {
      // Nếu là cụm từ, kiểm tra trực tiếp trong nội dung
      if (lowerContent.includes(word)) {
        offensiveWords.push(word);
        offensiveScore += badWordsDict[word];
      }
    } else {
      // Nếu là từ đơn, kiểm tra từ đó có tồn tại trong mảng từ đã tách hay không
      if (words.includes(word)) {
        offensiveWords.push(word);
        offensiveScore += badWordsDict[word];
      }
    }
  }

  // Xác định mức độ nghiêm trọng dựa trên tổng điểm
  let severity = null;
  if (offensiveScore >= 3) {
    severity = "high";
  } else if (offensiveScore >= 2) {
    severity = "medium";
  } else if (offensiveScore >= 1) {
    severity = "low";
  }

  return {
    offensiveContent: offensiveScore > 0,
    offensiveSeverity: severity,
    offensiveWords,
    offensiveScore,
  };
};

/**
 * Chuẩn bị dữ liệu thống kê cho nhóm nội dung nhạy cảm
 * @param {Array} posts - Danh sách bài viết
 * @returns {Array} Thống kê nhóm bài viết có nội dung nhạy cảm theo mức độ
 */
export const getOffensiveContentGroups = (posts) => {
  const groups = [
    { severity: "low", count: 0 },
    { severity: "medium", count: 0 },
    { severity: "high", count: 0 },
  ];

  if (!posts || !posts.length) {
    return groups;
  }

  // Đếm số lượng bài viết theo từng mức độ
  posts.forEach((post) => {
    if (post.offensiveContent && post.offensiveSeverity) {
      const group = groups.find((g) => g.severity === post.offensiveSeverity);
      if (group) {
        group.count++;
      }
    }
  });

  // Trả về các nhóm có số lượng > 0
  return groups.filter((group) => group.count > 0);
};
