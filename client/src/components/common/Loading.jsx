// src/components/common/Loading.jsx
const Loading = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center py-4">
      <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizes[size]}`}></div>
    </div>
  );
};

export default Loading;