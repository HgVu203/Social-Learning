import { useState } from 'react';
import Navbar from '../components/navbar/Navbar';
import Sidebar from '../components/sidebar/Sidebar';

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar onMenuClick={toggleSidebar} />
      
      <div className="flex">
        {/* Sidebar for desktop */}
        <div className="hidden lg:block h-[calc(100vh-4rem)] sticky top-16">
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>

        {/* Mobile sidebar */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="fixed top-16 left-0 z-50 lg:hidden">
              <Sidebar onClose={() => setIsSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;