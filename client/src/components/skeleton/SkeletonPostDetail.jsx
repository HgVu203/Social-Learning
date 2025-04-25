const SkeletonPostDetail = () => {
  return (
    <div className="animate-pulse bg-[var(--color-bg-secondary)] rounded-lg shadow p-5">
      {/* Header with avatar and name */}
      <div className="flex items-center space-x-3 mb-5">
        <div className="w-12 h-12 bg-[var(--color-bg-light)] rounded-full"></div>
        <div className="flex-1">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/6"></div>
        </div>
        <div className="h-8 bg-[var(--color-bg-light)] rounded w-8"></div>
      </div>

      {/* Post content */}
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-5/6"></div>
      </div>

      {/* Media placeholder */}
      <div className="h-72 bg-[var(--color-bg-light)] rounded w-full mb-5"></div>

      {/* Action buttons */}
      <div className="flex justify-between border-b border-[var(--color-border)] pb-5 mb-5">
        <div className="h-9 bg-[var(--color-bg-light)] rounded w-1/4"></div>
        <div className="h-9 bg-[var(--color-bg-light)] rounded w-1/4"></div>
        <div className="h-9 bg-[var(--color-bg-light)] rounded w-1/4"></div>
      </div>

      {/* Comments section */}
      <div className="space-y-4">
        <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/5 mb-4"></div>

        {/* Comment input */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-[var(--color-bg-light)] rounded-full"></div>
          <div className="flex-1 h-10 bg-[var(--color-bg-light)] rounded-2xl"></div>
        </div>

        {/* Comments */}
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="flex space-x-3">
            <div className="w-9 h-9 bg-[var(--color-bg-light)] rounded-full"></div>
            <div className="flex-1">
              <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg mb-1">
                <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-[var(--color-bg-light)] rounded w-full"></div>
                <div className="h-3 bg-[var(--color-bg-light)] rounded w-2/3 mt-1"></div>
              </div>
              <div className="h-3 bg-[var(--color-bg-light)] rounded w-24 ml-2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonPostDetail;
