import React from "react";
import LazyImage from "./LazyImage";

/**
 * Component Image - Là wrapper đơn giản cho LazyImage để dễ sử dụng trong codebase
 *
 * @param {Object} props
 * @param {string} props.src - Đường dẫn hình ảnh
 * @param {string} props.alt - Alt text cho hình ảnh
 * @param {string} props.className - Classes CSS bổ sung
 * @param {boolean} props.lazy - Có sử dụng lazy loading không (mặc định: true)
 * @param {boolean} props.priority - Có ưu tiên tải không (mặc định: false)
 * @param {any} props.rest - Các props khác được truyền cho component
 */
const Image = ({
  src,
  alt = "",
  className = "",
  lazy = true,
  priority = false,
  ...rest
}) => {
  // Nếu không sử dụng lazy loading
  if (!lazy) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        fetchPriority={priority ? "high" : "auto"}
        {...rest}
      />
    );
  }

  // Sử dụng LazyImage nếu lazy=true
  return (
    <LazyImage
      src={src}
      alt={alt}
      className={className}
      eager={priority}
      {...rest}
    />
  );
};

export default Image;
