const SkeletonUserManagement = () => {
  return (
    <div className="animate-pulse p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-[var(--color-bg-light)] rounded w-1/4"></div>
        <div className="flex space-x-3">
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-32"></div>
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-32"></div>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6">
        <div className="flex-1 h-10 bg-[var(--color-bg-light)] rounded"></div>
        <div className="h-10 bg-[var(--color-bg-light)] rounded w-40"></div>
        <div className="h-10 bg-[var(--color-bg-light)] rounded w-40"></div>
        <div className="h-10 bg-[var(--color-bg-light)] rounded w-32"></div>
      </div>

      {/* Table header */}
      <div className="bg-[var(--color-bg-secondary)] rounded-t-lg shadow p-4 hidden md:flex">
        <div className="w-12 mr-2">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-5"></div>
        </div>
        <div className="w-14 mr-2">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-10"></div>
        </div>
        <div className="flex-1 mr-4">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-24"></div>
        </div>
        <div className="w-40 mr-4">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-20"></div>
        </div>
        <div className="w-32 mr-4">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-20"></div>
        </div>
        <div className="w-32 mr-4">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-24"></div>
        </div>
        <div className="w-32">
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-20"></div>
        </div>
      </div>

      {/* Table rows */}
      <div className="bg-[var(--color-bg-secondary)] rounded-b-lg shadow mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div
            key={item}
            className="p-4 border-t border-[var(--color-border)] flex flex-col md:flex-row md:items-center"
          >
            <div className="w-12 mr-2 mb-2 md:mb-0">
              <div className="h-5 bg-[var(--color-bg-light)] rounded w-5"></div>
            </div>
            <div className="w-14 mr-2 mb-2 md:mb-0">
              <div className="h-10 w-10 bg-[var(--color-bg-light)] rounded-full"></div>
            </div>
            <div className="flex-1 mr-4 mb-2 md:mb-0">
              <div className="h-5 bg-[var(--color-bg-light)] rounded w-3/4 mb-1"></div>
              <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/2 hidden md:block"></div>
            </div>
            <div className="w-full md:w-40 mr-4 mb-2 md:mb-0">
              <div className="h-5 bg-[var(--color-bg-light)] rounded w-32"></div>
            </div>
            <div className="w-full md:w-32 mr-4 mb-2 md:mb-0">
              <div className="h-5 bg-[var(--color-bg-light)] rounded w-20"></div>
            </div>
            <div className="w-full md:w-32 mr-4 mb-2 md:mb-0">
              <div className="h-8 bg-[var(--color-bg-light)] rounded w-24"></div>
            </div>
            <div className="w-full md:w-32 flex md:justify-end space-x-2">
              <div className="h-8 bg-[var(--color-bg-light)] rounded w-8"></div>
              <div className="h-8 bg-[var(--color-bg-light)] rounded w-8"></div>
              <div className="h-8 bg-[var(--color-bg-light)] rounded w-8"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="h-5 bg-[var(--color-bg-light)] rounded w-32"></div>
        <div className="flex space-x-2">
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-10"></div>
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-10"></div>
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-10"></div>
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-10"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonUserManagement;
