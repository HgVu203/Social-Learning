const SkeletonGroup = () => {
  return (
    <div className="animate-pulse bg-[var(--color-bg-secondary)] rounded-lg shadow overflow-hidden">
      {/* Cover image skeleton */}
      <div className="h-36 bg-[var(--color-bg-light)] w-full"></div>

      {/* Group info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Group name and details */}
          <div className="flex-1">
            <div className="h-6 bg-[var(--color-bg-light)] rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/4"></div>
          </div>

          {/* Action button */}
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-28"></div>
        </div>

        {/* Group stats */}
        <div className="flex space-x-4 py-3 border-t border-b border-[var(--color-border)] mb-4">
          <div className="flex-1">
            <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3"></div>
          </div>
          <div className="flex-1">
            <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3"></div>
          </div>
          <div className="flex-1">
            <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3"></div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonGroup;
