const SkeletonProfile = () => {
  return (
    <div className="animate-pulse p-4">
      <div className="flex items-center space-x-4">
        {/* Avatar skeleton */}
        <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>

        <div className="flex-1 space-y-3">
          {/* Username skeleton */}
          <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/4"></div>

          {/* Handle skeleton */}
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/3"></div>

          {/* Points skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded-full"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-16"></div>
          </div>
        </div>

        {/* Button skeletons */}
        <div className="flex space-x-2">
          <div className="h-10 bg-gradient-to-r from-blue-50 to-blue-100 rounded-full w-24"></div>
          <div className="h-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24"></div>
        </div>
      </div>

      {/* Bio skeleton */}
      <div className="mt-6 space-y-2">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-full"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-5/6"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/3"></div>
      </div>

      {/* Stats skeleton */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center space-y-2">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-16 mx-auto"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-20 mx-auto"></div>
        </div>
        <div className="text-center space-y-2">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-16 mx-auto"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-20 mx-auto"></div>
        </div>
        <div className="text-center space-y-2">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-16 mx-auto"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-20 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonProfile;
