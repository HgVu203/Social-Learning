/**
 * Hàm prefetch giúp tải trước các components hoặc tài nguyên cho các trang quan trọng
 * @param {Array} components - Mảng các components React.lazy cần prefetch
 */
export const prefetchComponents = (components) => {
  if (!Array.isArray(components)) {
    components = [components];
  }

  // Chạy prefetch sau khi trang đã tải xong
  if (document.readyState === "complete") {
    _doPrefetch();
  } else {
    window.addEventListener("load", _doPrefetch);
  }

  function _doPrefetch() {
    // Timeout để đảm bảo prefetch xảy ra sau khi các tài nguyên quan trọng đã được tải
    setTimeout(() => {
      components.forEach((component) => {
        // Vì component là một hàm có dạng lazy(() => import(...)),
        // chúng ta cần lấy import promise để prefetch nó
        try {
          // Truy cập thuộc tính _payload của component, chỉ có trong React 18+
          const importChunk = component._payload?._result ?? component;
          if (typeof importChunk === "function") {
            importChunk();
          }
        } catch (e) {
          console.warn("Error prefetching component", e);
        }
      });
    }, 200);
  }
};

/**
 * Prefetch hình ảnh trước để hiển thị nhanh hơn
 * @param {Array|String} imageSources - Mảng các URL hoặc một URL hình ảnh cần prefetch
 * @param {Object} options - Tùy chọn cho prefetch
 * @param {boolean} options.highPriority - Nếu true, sẽ tải ngay lập tức thay vì đợi idle
 * @param {Function} options.onComplete - Callback khi tất cả hình ảnh đã được prefetch
 */
export const prefetchImages = (imageSources, options = {}) => {
  if (!Array.isArray(imageSources)) {
    imageSources = [imageSources];
  }

  const { highPriority = false, onComplete } = options;

  // Hàm thực thi prefetch
  const performPrefetch = () => {
    const imagePromises = imageSources.map((src) => {
      return new Promise((resolve, reject) => {
        if (!src) {
          resolve();
          return;
        }

        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;

        // Đảm bảo ảnh tiếp tục tải ngay cả khi không có event listener
        img.fetchPriority = highPriority ? "high" : "auto";
      });
    });

    // Thực hiện callback khi hoàn thành nếu được cung cấp
    if (onComplete) {
      Promise.allSettled(imagePromises).then(onComplete);
    } else {
      // Không cần đợi tất cả hoàn thành, chỉ prefetch
      Promise.allSettled(imagePromises);
    }
  };

  // Chạy prefetch tùy thuộc vào trạng thái trang và ưu tiên
  if (highPriority) {
    // Nếu là ưu tiên cao, tải ngay lập tức
    performPrefetch();
  } else {
    // Chạy prefetch sau khi trang đã tải xong và khi trình duyệt rảnh
    const doPrefetch = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(performPrefetch);
      } else {
        setTimeout(performPrefetch, 200);
      }
    };

    if (document.readyState === "complete") {
      doPrefetch();
    } else {
      window.addEventListener("load", doPrefetch);
    }
  }
};

/**
 * Tạo một IntersectionObserver mới để tự động prefetch hình ảnh khi gần scroll tới
 * @param {Array} elements - Mảng các phần tử DOM cần theo dõi
 * @param {Function} getImageSrc - Hàm lấy URL hình ảnh từ phần tử
 * @param {Object} options - Tùy chọn cho prefetch
 */
export const createImagePrefetchObserver = (
  elements,
  getImageSrc,
  options = {}
) => {
  const { rootMargin = "500px 0px", threshold = 0.01 } = options;

  if (!elements || elements.length === 0) return null;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const src = getImageSrc(entry.target);
          if (src) {
            prefetchImages(src, { highPriority: true });
          }
          // Ngưng theo dõi phần tử này sau khi đã prefetch
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin, threshold }
  );

  // Bắt đầu theo dõi tất cả phần tử
  elements.forEach((el) => observer.observe(el));

  return observer;
};

export default {
  prefetchComponents,
  prefetchImages,
  createImagePrefetchObserver,
};
