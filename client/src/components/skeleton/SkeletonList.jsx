const SkeletonList = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array(count)
        .fill()
        .map((_, index) => (
          <div
            key={index}
            className="animate-pulse flex items-center space-x-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg shadow"
          >
            {/* Avatar placeholder */}
            <div className="w-12 h-12 bg-[var(--color-bg-light)] rounded-full"></div>

            <div className="flex-1">
              {/* Name placeholder */}
              <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3 mb-2"></div>

              {/* Description placeholder */}
              <div className="h-3 bg-[var(--color-bg-light)] rounded w-1/2"></div>
            </div>

            {/* Action button placeholder */}
            <div className="h-8 bg-[var(--color-bg-light)] rounded w-20"></div>
          </div>
        ))}
    </div>
  );
};

export default SkeletonList;
