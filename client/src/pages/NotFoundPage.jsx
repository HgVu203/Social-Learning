import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-600">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mt-6">Trang không tồn tại</h2>
        <p className="text-lg text-gray-600 mt-4">
          Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời không truy cập được.
        </p>
        <div className="mt-10">
          <Link
            to="/"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition duration-200"
          >
            Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 