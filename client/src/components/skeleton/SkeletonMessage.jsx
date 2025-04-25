const SkeletonMessage = () => {
  return (
    <div className="space-y-4">
      {/* Outgoing message skeleton */}
      <div className="flex justify-end">
        <div className="animate-pulse rounded-lg p-3 max-w-[80%] bg-[var(--color-bg-light)]">
          <div className="h-4 w-32 rounded"></div>
          <div className="h-4 w-24 mt-1 rounded"></div>
        </div>
      </div>

      {/* Incoming message skeleton */}
      <div className="flex justify-start">
        <div className="animate-pulse flex items-start space-x-2">
          <div className="w-8 h-8 bg-[var(--color-bg-tertiary)] rounded-full"></div>
          <div className="rounded-lg p-3 max-w-[80%] bg-[var(--color-bg-light)]">
            <div className="h-4 w-40 rounded"></div>
            <div className="h-4 w-28 mt-1 rounded"></div>
          </div>
        </div>
      </div>

      {/* Another outgoing message skeleton */}
      <div className="flex justify-end">
        <div className="animate-pulse rounded-lg p-3 max-w-[80%] bg-[var(--color-bg-light)]">
          <div className="h-4 w-20 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonMessage;
