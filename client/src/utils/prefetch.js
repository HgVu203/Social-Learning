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

// Cache cho hình ảnh đã tải - shared state giữa các lần gọi
const imageCache = new Map();

/**
 * Hàm buộc trình duyệt tải và hiển thị tất cả hình ảnh trong một container
 * @param {HTMLElement} container - Phần tử DOM chứa các ảnh cần force render
 */
export const forceRenderImages = (container) => {
  if (!container) return;

  // Tìm tất cả các ảnh trong container
  const images = container.querySelectorAll("img");

  // Force load từng ảnh
  images.forEach((img) => {
    if (!img.src || img.complete) return;

    // Gỡ bỏ thuộc tính loading=lazy nếu có
    if (img.loading === "lazy") {
      img.loading = "eager";
    }

    // Thêm lại src để force browser tải lại
    const originalSrc = img.src;
    img.src = "";
    setTimeout(() => {
      img.src = originalSrc;
      img.fetchPriority = "high";
      img.decoding = "sync";
    }, 0);
  });
};

/**
 * Prefetch hình ảnh trước để hiển thị nhanh hơn với nhiều tối ưu hóa
 * @param {Array|String} imageSources - Mảng các URL hoặc một URL hình ảnh cần prefetch
 * @param {Object} options - Tùy chọn cho prefetch
 * @param {Function} options.onComplete - Callback khi tất cả hình ảnh đã được prefetch
 * @param {number} options.quality - Chất lượng hình ảnh (nếu sử dụng CDN hỗ trợ) - 0-100
 */
export const prefetchImages = (imageSources, options = {}) => {
  if (!Array.isArray(imageSources)) {
    imageSources = [imageSources];
  }

  // Lọc bỏ URL null, undefined và đã có trong cache
  const imagesToLoad = imageSources.filter((src) => {
    if (!src) return false;
    if (imageCache.has(src)) return false;
    return true;
  });

  // Nếu không còn ảnh nào để tải, gọi callback nếu có
  if (imagesToLoad.length === 0) {
    if (options.onComplete) {
      options.onComplete();
    }
    return;
  }

  const { onComplete, quality } = options;

  // Hàm thực thi prefetch với nhiều tối ưu hóa
  const performPrefetch = () => {
    const imagePromises = imagesToLoad.map((src) => {
      if (imageCache.has(src)) {
        return Promise.resolve(src);
      }

      return new Promise((resolve, reject) => {
        if (!src) {
          resolve();
          return;
        }

        // Xử lý URL với CDN parameters nếu cần thiết
        let optimizedSrc = src;
        if (quality !== undefined && typeof quality === "number") {
          // Kiểm tra xem ảnh có đến từ CDN hỗ trợ không (Cloudinary, Imgix, etc)
          if (src.includes("cloudinary.com")) {
            optimizedSrc = src.replace("/upload/", `/upload/q_${quality}/`);
          } else if (src.includes("imgix.net")) {
            // Nếu đã có tham số, thêm & ngược lại thêm ?
            const separator = src.includes("?") ? "&" : "?";
            optimizedSrc = `${src}${separator}q=${quality}`;
          }
        }

        const img = new Image();

        img.onload = () => {
          imageCache.set(src, true);
          resolve(src);
        };

        img.onerror = () => {
          // Nếu lỗi với URL tối ưu, thử lại với URL gốc
          if (optimizedSrc !== src) {
            console.warn(
              `Failed to load optimized image ${optimizedSrc}, falling back to original ${src}`
            );
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              imageCache.set(src, true);
              resolve(src);
            };
            fallbackImg.onerror = () => {
              reject(new Error(`Failed to load image: ${src}`));
            };
            fallbackImg.src = src;
          } else {
            reject(new Error(`Failed to load image: ${src}`));
          }
        };

        // Thiết lập các thuộc tính tối ưu - luôn dùng high priority
        img.fetchPriority = "high"; // Luôn sử dụng high priority để tải nhanh hơn
        img.importance = "high"; // Thêm thuộc tính importance cho các trình duyệt hỗ trợ
        img.decoding = "async";

        // Luôn tải ngay lập tức, không dùng lazy loading để đảm bảo ảnh xuất hiện kịp thời
        img.loading = "eager";

        // Thiết lập nguồn ảnh để bắt đầu tải
        img.src = optimizedSrc;
      });
    });

    // Thực hiện callback khi hoàn thành nếu được cung cấp
    if (onComplete) {
      Promise.allSettled(imagePromises).then((results) => {
        const successResults = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        onComplete(successResults);
      });
    } else {
      // Vẫn thực hiện promise để hình ảnh được tải nhưng không chờ đợi
      Promise.allSettled(imagePromises);
    }
  };

  // Luôn tải ngay lập tức, không đợi idle
  performPrefetch();

  // Trả về danh sách các ảnh đang được tải để có thể theo dõi nếu cần
  return imagesToLoad;
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
  const {
    rootMargin = "2000px 0px", // Tăng từ 800px lên 2000px để tải trước nhiều hơn
    threshold = 0.01,
    quality,
  } = options;

  if (!elements || elements.length === 0) return null;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const src = getImageSrc(entry.target);
          if (src) {
            prefetchImages(src, {
              quality,
            });
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
