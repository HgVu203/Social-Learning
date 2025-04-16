import Sidebar from "../components/sidebar/Sidebar";
import RightPanel from "../components/sidebar/RightPanel";

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="max-w-full mx-auto flex relative">
        {/* Left Sidebar */}
        <div className="w-[275px] fixed h-screen border-r border-gray-800 z-10">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-h-screen border-r border-gray-800 ml-[275px] mr-[350px] overflow-y-auto bg-black">
          {children}
        </main>

        {/* Right Panel */}
        <div className="w-[350px] fixed right-0 h-screen z-10">
          <RightPanel />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
