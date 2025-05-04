import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Cuộn lên đầu trang mỗi khi đường dẫn thay đổi
    window.scrollTo({
      top: 0,
      behavior: "instant", // Sử dụng "instant" thay vì "smooth" để tránh hiệu ứng cuộn khi chuyển trang
    });
  }, [pathname]);

  return null; // Component này không render bất kỳ thứ gì
};

export default ScrollToTop;
