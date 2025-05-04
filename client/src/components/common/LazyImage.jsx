import { useState, useEffect, useRef } from "react";

/**
 * LazyImage - Component tải hình ảnh chỉ khi chúng hiển thị trong viewport
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

  // Prefetch hình ảnh (tải trước)
  const prefetchImage = (imageSrc) => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
  };

  useEffect(() => {
    // Tạo một IntersectionObserver với rootMargin lớn hơn để tải sớm hơn
    if (!eager) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsInView(true);
            // Ngắt kết nối observer sau khi hình ảnh đã được phát hiện
            observerRef.current.disconnect();
          }
        },
        {
          // Thiết lập rootMargin lớn hơn để bắt đầu tải trước khi hình ảnh xuất hiện trong viewport
          // 300px ở dưới viewport là khoảng cách lớn để tải trước
          rootMargin: "0px 0px 300px 0px",
          threshold: 0.01, // Kích hoạt ngay khi 1% hình ảnh xuất hiện
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    } else {
      // Nếu eager=true, prefetch ảnh ngay lập tức
      prefetchImage(src);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [eager, src]);

  const handleImageLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div
      ref={imgRef}
      className={`relative ${className}`}
      style={{
        ...style,
        background: "#f0f0f0",
      }}
    >
      {/* Placeholder hiển thị khi ảnh chưa tải */}
      {!isLoaded && (
        <img
          src={placeholderSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* Ảnh thực sự chỉ tải khi trong viewport hoặc eager=true */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleImageLoad}
          {...rest}
        />
      )}
    </div>
  );
};

export default LazyImage;
