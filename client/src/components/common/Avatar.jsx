// src/components/common/Avatar.jsx
import { useState, useEffect } from "react";
import defaultAvatar from "../../assets/images/default-avatar.svg";
import { prefetchImages } from "../../utils/prefetch";

const Avatar = ({
  src,
  alt = "Avatar",
  size = "md",
  className = "",
  priority = false,
  ...props
}) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizes = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-24 h-24",
    "2xl": "w-32 h-32",
  };

  // Prefetch avatar image khi component mount
  useEffect(() => {
    if (src && (priority || size === "xl" || size === "2xl")) {
      // Nếu là avatar có priority cao hoặc kích thước lớn thì prefetch ngay
      prefetchImages(src, { highPriority: true });
    }
  }, [src, priority, size]);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <img
        src={error ? defaultAvatar : src || defaultAvatar}
        alt={alt}
        className={`w-full h-full rounded-full object-cover ${
          isLoading ? "opacity-0" : "opacity-100"
        } transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        fetchPriority={priority ? "high" : "auto"}
        {...props}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse" />
      )}
    </div>
  );
};

export default Avatar;
