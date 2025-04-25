const SkeletonCard = () => {
  return (
    <div className="animate-pulse bg-[var(--color-bg-secondary)] rounded-lg shadow p-4 mb-4">
      {/* Header with avatar and name */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-[var(--color-bg-light)] rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-[var(--color-bg-light)] rounded w-1/4"></div>
        </div>
        <div className="h-6 bg-[var(--color-bg-light)] rounded w-6"></div>
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4"></div>
      </div>

      {/* Image placeholder */}
      <div className="h-40 bg-[var(--color-bg-light)] rounded w-full mb-4"></div>

      {/* Action buttons */}
      <div className="flex justify-between mt-2">
        <div className="h-8 bg-[var(--color-bg-light)] rounded w-1/4"></div>
        <div className="h-8 bg-[var(--color-bg-light)] rounded w-1/4"></div>
        <div className="h-8 bg-[var(--color-bg-light)] rounded w-1/4"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
