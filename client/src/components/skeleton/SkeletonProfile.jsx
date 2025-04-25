const SkeletonProfile = () => {
  return (
    <div className="animate-pulse">
      <div className="flex items-center space-x-4">
        {/* Avatar skeleton */}
        <div className="w-16 h-16 bg-[var(--color-bg-light)] rounded-full"></div>

        <div className="flex-1 space-y-2">
          {/* Username skeleton */}
          <div className="h-5 bg-[var(--color-bg-light)] rounded w-1/4"></div>

          {/* Handle skeleton */}
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-1/3"></div>

          {/* Points skeleton */}
          <div className="h-4 bg-[var(--color-bg-light)] rounded w-16"></div>
        </div>

        {/* Button skeletons */}
        <div className="flex space-x-2">
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-24"></div>
          <div className="h-10 bg-[var(--color-bg-light)] rounded w-24"></div>
        </div>
      </div>

      {/* Bio skeleton */}
      <div className="mt-4 space-y-2">
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-full"></div>
        <div className="h-4 bg-[var(--color-bg-light)] rounded w-5/6"></div>
      </div>
    </div>
  );
};

export default SkeletonProfile;
