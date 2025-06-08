const PostCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl p-4 mb-4 shadow-sm animate-pulse">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300"></div>
        <div className="flex-1">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4 mb-2"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-2/4"></div>
        </div>
        <div className="w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full"></div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-5/6"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-full"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-4/6"></div>
      </div>

      {/* Image Placeholder */}
      <div className="mt-4 relative">
        <div className="aspect-video bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl w-full"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-gradient-to-r from-gray-500/30 to-gray-600/30 backdrop-blur rounded-lg"></div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-r from-red-50 to-red-100 rounded-full"></div>
          <div className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-r from-blue-50 to-blue-100 rounded-full"></div>
          <div className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full"></div>
          <div className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"></div>
        </div>
      </div>

      {/* Comments Preview */}
      <div className="mt-3 space-y-3">
        <div className="flex items-start space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-200 to-gray-300"></div>
          <div className="flex-1">
            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/4 mb-1"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PostListSkeleton = ({ count = 3, showFadeIn = true }) => {
  return (
    <div
      className={`flex flex-col gap-4 ${showFadeIn ? "animate-fadeIn" : ""}`}
    >
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
    </div>
  );
};

export default PostListSkeleton;
