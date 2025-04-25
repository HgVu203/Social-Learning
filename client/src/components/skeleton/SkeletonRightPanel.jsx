const SkeletonRightPanel = () => {
  return (
    <div className="space-y-6">
      {/* Popular Groups section */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow p-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-[var(--color-bg-light)] rounded"></div>
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/2"></div>
        </div>

        <div className="space-y-3">
          {/* Group items */}
          {Array(3)
            .fill()
            .map((_, index) => (
              <div
                key={index}
                className="animate-pulse flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[var(--color-bg-light)] rounded-md"></div>
                  <div>
                    <div className="h-4 bg-[var(--color-bg-light)] rounded w-24 mb-1"></div>
                    <div className="h-3 bg-[var(--color-bg-light)] rounded w-16"></div>
                  </div>
                </div>
                <div className="h-8 w-16 bg-[var(--color-bg-light)] rounded-md"></div>
              </div>
            ))}
        </div>

        <div className="mt-4 flex justify-center">
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-32"></div>
        </div>
      </div>

      {/* Online Friends section */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow p-4">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-[var(--color-bg-light)] rounded"></div>
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/2"></div>
        </div>

        {/* No friends message */}
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4 mx-auto my-6"></div>

        <div className="mt-4 flex justify-center">
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-28"></div>
        </div>
      </div>

      {/* Footer section */}
      <div className="flex justify-center space-x-4 pt-2">
        <div className="h-3 bg-[var(--color-bg-light)] rounded w-12"></div>
        <div className="h-3 bg-[var(--color-bg-light)] rounded w-12"></div>
        <div className="h-3 bg-[var(--color-bg-light)] rounded w-12"></div>
      </div>
      <div className="flex justify-center">
        <div className="h-3 bg-[var(--color-bg-light)] rounded w-32"></div>
      </div>
    </div>
  );
};

export default SkeletonRightPanel;
