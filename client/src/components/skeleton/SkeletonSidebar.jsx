const SkeletonSidebar = () => {
  return (
    <div className="animate-pulse bg-[var(--color-bg-secondary)] rounded-lg shadow p-4 h-full">
      {/* Profile summary */}
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 bg-[var(--color-bg-light)] rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-[var(--color-bg-light)] rounded w-1/2"></div>
        </div>
      </div>

      {/* Navigation items */}
      <div className="space-y-3 mb-6">
        {Array(5)
          .fill()
          .map((_, index) => (
            <div key={index} className="flex items-center space-x-3 p-2">
              <div className="w-6 h-6 bg-[var(--color-bg-light)] rounded"></div>
              <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4"></div>
            </div>
          ))}
      </div>

      {/* Secondary section header */}
      <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/3 mb-4"></div>

      {/* Secondary items */}
      <div className="space-y-3 mb-6">
        {Array(3)
          .fill()
          .map((_, index) => (
            <div key={index} className="flex items-center space-x-3 p-2">
              <div className="w-6 h-6 bg-[var(--color-bg-light)] rounded"></div>
              <div className="h-4 bg-[var(--color-bg-light)] rounded w-2/3"></div>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-auto border-t border-[var(--color-border)]">
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-full mb-3"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4"></div>
      </div>
    </div>
  );
};

export default SkeletonSidebar;
