import { prefetchComponents, prefetchImages } from "./prefetch";

/**
 * Khởi tạo hệ thống prefetch chủ động
 * - Tự động prefetch hình ảnh và components khi hover vào các links
 * - Giúp cải thiện trải nghiệm người dùng khi di chuyển giữa các trang
 * @param {Object} options - Cấu hình prefetch
 * @param {Object} options.routes - Mapping giữa route patterns và lazy components
 * @param {Object} options.assets - Mapping giữa route patterns và assets (images)
 * @param {number} options.delay - Thời gian delay trước khi prefetch (ms)
 */
export const initPrefetchOnHover = (options = {}) => {
  const {
    routes = {}, // Mapping từ routes đến components
    assets = {}, // Mapping từ routes đến assets (images)
    delay = 100, // Delay trước khi bắt đầu prefetch
  } = options;

  // Mảng lưu routes đã prefetch để tránh prefetch lại
  const prefetchedRoutes = new Set();
  const prefetchedAssets = new Set();

  // Hàm so khớp route với pattern
  const matchRoute = (href, pattern) => {
    // Chuyển pattern thành regex
    const regex = new RegExp(
      "^" + pattern.replace(/:\w+/g, "[^/]+").replace(/\*/g, ".*") + "$"
    );
    return regex.test(href);
  };

  // Tìm component cần prefetch dựa trên href
  const findComponentsToLoad = (href) => {
    // Loại bỏ domain và query params
    const path = href.replace(/^https?:\/\/[^/]+/, "").split("?")[0];

    const componentsToLoad = [];

    // Tìm các route patterns phù hợp
    Object.keys(routes).forEach((pattern) => {
      if (matchRoute(path, pattern) && !prefetchedRoutes.has(pattern)) {
        componentsToLoad.push(...[].concat(routes[pattern]));
        prefetchedRoutes.add(pattern);
      }
    });

    return componentsToLoad;
  };

  // Tìm assets cần prefetch dựa trên href
  const findAssetsToLoad = (href) => {
    // Loại bỏ domain và query params
    const path = href.replace(/^https?:\/\/[^/]+/, "").split("?")[0];

    const assetsToLoad = [];

    // Tìm các assets phù hợp
    Object.keys(assets).forEach((pattern) => {
      if (matchRoute(path, pattern) && !prefetchedAssets.has(pattern)) {
        assetsToLoad.push(...[].concat(assets[pattern]));
        prefetchedAssets.add(pattern);
      }
    });

    return assetsToLoad;
  };

  // Xử lý hover trên links
  const handleLinkHover = (e) => {
    const linkElement = e.currentTarget;
    if (!linkElement || !linkElement.getAttribute) return;

    const href = linkElement.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return;
    }

    // Tạo timeout để tránh prefetch khi hover quá nhanh
    linkElement._prefetchTimeoutId = setTimeout(() => {
      try {
        // Prefetch components
        const componentsToLoad = findComponentsToLoad(href);
        if (componentsToLoad.length > 0) {
          prefetchComponents(componentsToLoad);
        }

        // Prefetch assets
        const assetsToLoad = findAssetsToLoad(href);
        if (assetsToLoad.length > 0) {
          prefetchImages(assetsToLoad, { highPriority: false });
        }
      } catch (err) {
        console.error("Prefetch error:", err);
      }
    }, delay);
  };

  // Hủy timeout nếu mouse rời đi quá nhanh
  const handleLinkLeave = (e) => {
    const linkElement = e.currentTarget;
    if (linkElement && linkElement._prefetchTimeoutId) {
      clearTimeout(linkElement._prefetchTimeoutId);
      linkElement._prefetchTimeoutId = null;
    }
  };

  // Gắn event listeners
  const attachPrefetchEvents = () => {
    // Chờ DOM load xong
    if (document.readyState === "complete") {
      addEventListeners();
    } else {
      window.addEventListener("load", addEventListeners);
    }
  };

  // Thêm event listeners cho tất cả links
  const addEventListeners = () => {
    // Tìm tất cả internal links
    document
      .querySelectorAll('a[href^="/"], a[href^="."], a[href^="#/"]')
      .forEach((link) => {
        link.addEventListener("mouseenter", handleLinkHover);
        link.addEventListener("touchstart", handleLinkHover, { passive: true });
        link.addEventListener("mouseleave", handleLinkLeave);
        link.addEventListener("touchend", handleLinkLeave);
        link.addEventListener("touchcancel", handleLinkLeave);
      });
  };

  // Khởi tạo hệ thống prefetch
  attachPrefetchEvents();

  return {
    prefetchRoute: (route) => {
      if (routes[route] && !prefetchedRoutes.has(route)) {
        prefetchComponents(routes[route]);
        prefetchedRoutes.add(route);
      }
      if (assets[route] && !prefetchedAssets.has(route)) {
        prefetchImages(assets[route]);
        prefetchedAssets.add(route);
      }
    },
  };
};

export default {
  initPrefetchOnHover,
};
