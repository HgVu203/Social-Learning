import { useState, useEffect, useRef, useCallback } from "react";

// Global image cache shared across all components
const GLOBAL_IMAGE_CACHE = new Map();

/**
 * LazyImage - Component tải hình ảnh chỉ khi chúng hiển thị trong viewport với nhiều tối ưu
 * @param {Object} props
 * @param {string} props.src - Đường dẫn hình ảnh
 * @param {string} props.alt - Alt text cho hình ảnh
 * @param {string} [props.placeholderSrc] - Đường dẫn hình ảnh placeholder (tùy chọn)
 * @param {string} [props.className] - Classes CSS bổ sung
 * @param {Object} [props.style] - Styles inline bổ sung
 * @param {Function} [props.onLoad] - Callback khi hình ảnh đã tải xong
 * @param {boolean} [props.eager=false] - Tải hình ảnh ngay lập tức thay vì lazy load
 * @param {any} [...props.rest] - Các props khác được truyền vào thẻ img
 */
const LazyImage = ({
  src,
  alt,
  placeholderSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E",
  className = "",
  style = {},
  onLoad,
  eager = false,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(eager); // Nếu eager=true, coi như đã trong view
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const placeholderRef = useRef(null);

  // Kiểm tra xem ảnh đã có trong cache chưa - sử dụng global cache
  const isImageCached = useCallback((imageSrc) => {
    // Kiểm tra trong global cache
    if (GLOBAL_IMAGE_CACHE.has(imageSrc)) {
      return true;
    }

    // Kiểm tra trong browser cache
    const img = new Image();
    img.src = imageSrc;
    return img.complete;
  }, []);

  // Thêm ảnh vào cache
  const addToCache = useCallback((imageSrc) => {
    if (imageSrc) GLOBAL_IMAGE_CACHE.set(imageSrc, true);
  }, []);

  // Force load image with high priority
  const forceLoadImage = useCallback(
    (imageSrc) => {
      if (!imageSrc) return Promise.resolve();

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          addToCache(imageSrc);
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${imageSrc}`);
          resolve(null);
        };

        // Set all high priority attributes
        img.fetchPriority = "high";
        img.importance = "high";
        img.loading = "eager";
        img.decoding = "sync"; // Use sync to ensure it's available immediately
        img.src = imageSrc;
      });
    },
    [addToCache]
  );

  // Xử lý khi ảnh đã tải xong
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    addToCache(src);
    if (onLoad) onLoad();
  }, [src, onLoad, addToCache]);

  // Preload ảnh ngay khi component mount để ảnh có sẵn trong cache
  useEffect(() => {
    // Preload ảnh ngay từ đầu để tối ưu tốc độ hiển thị
    if (src) {
      const preloadImg = new Image();
      preloadImg.src = src;
      preloadImg.fetchPriority = "high";
      preloadImg.importance = "high";
      preloadImg.onload = () => {
        addToCache(src);
        if (isInView) {
          handleImageLoad();
        }
      };
    }
  }, [src, addToCache, isInView, handleImageLoad]);

  // Effect xử lý intersection observer
  useEffect(() => {
    // Kiểm tra trước xem ảnh có trong cache không
    if (isImageCached(src)) {
      setIsInView(true);
      setIsLoaded(true);
      if (onLoad) onLoad();
      return;
    }

    // Tạo một IntersectionObserver với rootMargin lớn hơn để tải sớm hơn
    if (!eager) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            // Đánh dấu ngay khi đã vào viewport
            setIsInView(true);

            // Force load ảnh ngay lập tức khi xuất hiện trong viewport
            forceLoadImage(src).then(() => {
              handleImageLoad();
            });

            // Ngắt kết nối observer sau khi hình ảnh đã được phát hiện
            observerRef.current.disconnect();
          }
        },
        {
          // Thiết lập rootMargin lớn hơn để bắt đầu tải trước khi hình ảnh xuất hiện trong viewport
          rootMargin: "0px 0px 2500px 0px", // Tăng từ 2000px lên 2500px để tải sớm hơn rất nhiều
          threshold: 0.01, // Kích hoạt ngay khi 1% hình ảnh xuất hiện
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    } else {
      // Nếu eager=true, force load ảnh ngay lập tức
      forceLoadImage(src).then(() => {
        handleImageLoad();
      });
      setIsInView(true); // Đánh dấu là đã trong view để hiển thị ngay
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [eager, src, forceLoadImage, onLoad, isImageCached, handleImageLoad]);

  // Quyết định có sử dụng blur effect hay không dựa vào loại placeholder
  const usesBlurEffect = placeholderSrc && placeholderSrc.startsWith("data:");

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        background: "#f0f0f0",
      }}
    >
      {/* Placeholder hiển thị khi ảnh chưa tải xong */}
      {!isLoaded && (
        <img
          ref={placeholderRef}
          src={placeholderSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
            usesBlurEffect ? "blur-sm scale-105" : ""
          }`}
          style={{
            opacity: isLoaded ? 0 : 1,
          }}
          loading="eager"
        />
      )}

      {/* Ảnh thực sự - hiển thị ngay dưới dạng opacity 0 và chuyển sang opacity 1 khi tải xong */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={handleImageLoad}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        {...rest}
      />
    </div>
  );
};

export default LazyImage;
