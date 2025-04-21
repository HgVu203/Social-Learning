const LoadingSpinner = ({ size = "md", className = "" }) => {
  let sizeClass = "h-8 w-8";

  if (size === "sm") {
    sizeClass = "h-4 w-4";
  } else if (size === "lg") {
    sizeClass = "h-12 w-12";
  }

  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-gray-500 ${sizeClass} ${className}`}
    ></div>
  );
};

export default LoadingSpinner;
