const SkeletonMessage = () => {
  return (
    <div className="space-y-6 p-4">
      {/* Outgoing message skeleton */}
      <div className="flex flex-col items-end space-y-1">
        <div className="animate-pulse flex items-end space-x-2">
          <div className="text-xs text-gray-400 opacity-70">
            <div className="h-3 w-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
          </div>
          <div className="rounded-2xl p-3 max-w-[70%] bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="h-4 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            <div className="h-4 w-32 mt-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
          </div>
        </div>
        <div className="flex items-center space-x-1 mr-2">
          <div className="h-3 w-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
          <div className="h-3 w-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Incoming message skeleton */}
      <div className="flex flex-col items-start space-y-1">
        <div className="animate-pulse flex items-start space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
          <div className="flex flex-col space-y-1">
            <div className="text-xs text-gray-400">
              <div className="h-3 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            </div>
            <div className="rounded-2xl p-3 max-w-[70%] bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="h-4 w-56 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
              <div className="h-4 w-40 mt-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
              <div className="h-4 w-24 mt-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Another outgoing message skeleton - shorter */}
      <div className="flex flex-col items-end space-y-1">
        <div className="animate-pulse flex items-end space-x-2">
          <div className="text-xs text-gray-400 opacity-70">
            <div className="h-3 w-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
          </div>
          <div className="rounded-2xl p-3 max-w-[70%] bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="h-4 w-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
          </div>
        </div>
        <div className="flex items-center space-x-1 mr-2">
          <div className="h-3 w-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Incoming message skeleton - shorter */}
      <div className="flex flex-col items-start space-y-1">
        <div className="animate-pulse flex items-start space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
          <div className="flex flex-col space-y-1">
            <div className="text-xs text-gray-400">
              <div className="h-3 w-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            </div>
            <div className="rounded-2xl p-3 max-w-[70%] bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="h-4 w-36 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonMessage;
