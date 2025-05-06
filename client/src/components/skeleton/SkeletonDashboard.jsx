const SkeletonDashboard = () => {
  return (
    <div className="animate-pulse p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 bg-[var(--color-bg-light)] rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3"></div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="bg-[var(--color-bg-secondary)] rounded-lg shadow p-4"
          >
            <div className="flex justify-between mb-3">
              <div className="h-6 bg-[var(--color-bg-light)] rounded w-1/3"></div>
              <div className="h-8 w-8 bg-[var(--color-bg-light)] rounded-full"></div>
            </div>
            <div className="h-9 bg-[var(--color-bg-light)] rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-[var(--color-bg-light)] rounded w-2/3"></div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow p-4">
          <div className="h-6 bg-[var(--color-bg-light)] rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-[var(--color-bg-light)] rounded w-full"></div>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow p-4">
          <div className="h-6 bg-[var(--color-bg-light)] rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-[var(--color-bg-light)] rounded w-full"></div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow p-4">
        <div className="h-6 bg-[var(--color-bg-light)] rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex items-center border-b border-[var(--color-border)] pb-4"
            >
              <div className="h-10 w-10 bg-[var(--color-bg-light)] rounded-full mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-[var(--color-bg-light)] rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-[var(--color-bg-light)] rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-[var(--color-bg-light)] rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonDashboard;
