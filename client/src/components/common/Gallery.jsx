import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LazyImage from "./LazyImage";
import { prefetchImages } from "../../utils/prefetch";

/**
 * Gallery component - Hiển thị gallery hình ảnh với tối ưu prefetch
 * @param {Object} props
 * @param {Array} props.images - Mảng đường dẫn hình ảnh
 * @param {Function} props.onClose - Callback khi đóng gallery
 * @param {boolean} props.showGallery - Trạng thái hiển thị của gallery
 * @param {number} props.initialIndex - Index ban đầu để hiển thị (mặc định: 0)
 */
const Gallery = ({
  images = [],
  onClose,
  showGallery = false,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Prefetch tất cả hình ảnh khi gallery mở
  useEffect(() => {
    if (showGallery && images && images.length > 0) {
      setIsLoading(true);

      // Prefetch hình ảnh hiện tại với mức ưu tiên cao
      prefetchImages(images[currentIndex], {
        highPriority: true,
        onComplete: () => setIsLoading(false),
      });

      // Prefetch hình ảnh kế tiếp và trước đó
      const nextIndex = (currentIndex + 1) % images.length;
      const prevIndex = (currentIndex - 1 + images.length) % images.length;

      // Prefetch hình ảnh kế tiếp và trước đó, nhưng không chờ đợi
      prefetchImages([images[nextIndex], images[prevIndex]], {
        highPriority: false,
      });

      // Prefetch các hình ảnh còn lại
      const otherImages = images.filter(
        (_, i) => i !== currentIndex && i !== nextIndex && i !== prevIndex
      );
      if (otherImages.length > 0) {
        prefetchImages(otherImages, { highPriority: false });
      }
    }
  }, [showGallery, currentIndex, images]);

  // Hàm chuyển đến ảnh trước đó
  const goToPrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsLoading(true);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length
    );
  };

  // Hàm chuyển đến ảnh tiếp theo
  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsLoading(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  // Xử lý phím tắt
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showGallery) return;

      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "Escape":
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGallery, onClose]);

  // Động tác hoàn thành, reset trạng thái animating
  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  if (!showGallery) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          className="absolute top-4 right-4 z-10 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
          onClick={onClose}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Nút điều hướng trái */}
        <button
          className="absolute left-4 z-10 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          disabled={isAnimating}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Nút điều hướng phải */}
        <button
          className="absolute right-4 z-10 text-white bg-black/40 hover:bg-black/60 rounded-full p-3 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          disabled={isAnimating}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Vùng hiển thị ảnh */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              onAnimationComplete={handleAnimationComplete}
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* Hiển thị ảnh hiện tại */}
              <div className="relative max-w-full max-h-full px-4">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                  </div>
                )}
                <LazyImage
                  src={images[currentIndex]}
                  alt={`Image ${currentIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  eager={true}
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Thanh điều hướng thumbnail */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
            <div className="flex gap-2 p-2 bg-black/40 rounded-full backdrop-blur-md">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-white"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    setIsLoading(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Hiển thị số ảnh */}
        <div className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 rounded-full text-sm backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </motion.div>
  );
};

export default Gallery;
