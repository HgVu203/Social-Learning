import { useState, useEffect } from "react";

/**
 * Hook để quản lý hiển thị skeleton loader với thời gian tối thiểu
 * @param {boolean} isLoading - Trạng thái loading từ data fetching
 * @param {number} minDisplayTime - Thời gian tối thiểu hiển thị skeleton (ms)
 * @param {number} delayTime - Thời gian trễ trước khi hiển thị skeleton (ms)
 * @returns {boolean} - Trạng thái nên hiển thị skeleton hay không
 */
const useSkeletonLoader = (
  isLoading,
  minDisplayTime = 1000,
  delayTime = 200
) => {
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  useEffect(() => {
    let delayTimer;
    let minDisplayTimer;

    if (isLoading && !shouldShowSkeleton) {
      // Thêm delay ngắn trước khi hiển thị skeleton để tránh nhấp nháy
      delayTimer = setTimeout(() => {
        setShouldShowSkeleton(true);
        setLoadingStartTime(Date.now());
      }, delayTime);
    } else if (!isLoading && shouldShowSkeleton) {
      // Đảm bảo skeleton hiển thị ít nhất minDisplayTime
      const timeElapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minDisplayTime - timeElapsed);

      minDisplayTimer = setTimeout(() => {
        setShouldShowSkeleton(false);
      }, remainingTime);
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (minDisplayTimer) clearTimeout(minDisplayTimer);
    };
  }, [
    isLoading,
    shouldShowSkeleton,
    loadingStartTime,
    minDisplayTime,
    delayTime,
  ]);

  return shouldShowSkeleton;
};

export default useSkeletonLoader;
