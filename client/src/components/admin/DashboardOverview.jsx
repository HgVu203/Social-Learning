import {
  FaUsers,
  FaUsersCog,
  FaNewspaper,
  FaUserFriends,
  FaChartLine,
  FaChartBar,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  useAdminDashboardBasicStats,
  useAdminUserGrowthData,
  useAdminPostGrowthData,
  useAdminRecentActivity,
} from "../../hooks/queries/useAdminQueries";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { SkeletonDashboard } from "../skeleton";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Card = ({ title, value, icon, color, increase }) => {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:translate-y-[-2px]">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
              {title}
            </h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {value}
              </p>
              {increase !== undefined && (
                <p
                  className={`ml-2 text-sm font-medium ${
                    increase >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {increase >= 0 ? "+" : ""}
                  {increase}%
                </p>
              )}
            </div>
          </div>
          <div
            className={`p-3 rounded-lg ${
              colorClasses[color] || colorClasses.blue
            }`}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardOverview = () => {
  const { t } = useTranslation();

  // Sử dụng các query tách biệt thay vì một query lớn
  const {
    data: basicStats,
    isLoading: isLoadingBasic,
    error: basicError,
    refetch: refetchBasic,
  } = useAdminDashboardBasicStats();

  // Tải user growth chart chỉ khi cần
  const {
    data: userGrowthData,
    isLoading: isLoadingUserGrowth,
    error: userGrowthError,
    refetch: refetchUserGrowth,
  } = useAdminUserGrowthData({
    enabled: !isLoadingBasic, // Chỉ tải khi dữ liệu cơ bản đã sẵn sàng
  });

  // Tải post growth chart chỉ khi cần
  const {
    data: postGrowthData,
    isLoading: isLoadingPostGrowth,
    error: postGrowthError,
    refetch: refetchPostGrowth,
  } = useAdminPostGrowthData({
    enabled: !isLoadingBasic, // Chỉ tải khi dữ liệu cơ bản đã sẵn sàng
  });

  // Tải recent activity riêng biệt và cuối cùng
  const { data: recentActivity } = useAdminRecentActivity({
    enabled: !isLoadingBasic && !isLoadingUserGrowth && !isLoadingPostGrowth,
  });

  // Xử lý khi có lỗi
  useEffect(() => {
    if (basicError) {
      setTimeout(() => refetchBasic(), 2000);
    }

    if (userGrowthError) {
      setTimeout(() => refetchUserGrowth(), 2000);
    }

    if (postGrowthError) {
      setTimeout(() => refetchPostGrowth(), 2000);
    }
  }, [basicError, userGrowthError, postGrowthError]);

  const statsData = basicStats?.data;
  const isLoading = isLoadingBasic;

  // Tạo mảng cho card stats
  const statCards = [
    {
      title: t("admin.overview.totalUsers"),
      key: "totalUsers",
      value: statsData?.userStats?.totalUsers || 0,
      increase: statsData?.userStats?.percentChange || 0,
      icon: <FaUsers className="text-xl" />,
      color: "blue",
    },
    {
      title: t("admin.overview.activeUsers"),
      key: "activeUsers",
      value: statsData?.userStats?.activeStatusCount || 0,
      icon: <FaUsersCog className="text-xl" />,
      color: "green",
    },
    {
      title: t("admin.overview.totalPosts"),
      key: "totalPosts",
      value: statsData?.postStats?.totalPosts || 0,
      increase: statsData?.postStats?.percentChange || 0,
      icon: <FaNewspaper className="text-xl" />,
      color: "purple",
    },
    {
      title: t("admin.overview.totalGroups"),
      key: "totalGroups",
      value: statsData?.groupStats?.totalGroups || 0,
      icon: <FaUserFriends className="text-xl" />,
      color: "orange",
    },
  ];

  // Get dates for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  // Cấu hình cho biểu đồ User Growth từ API riêng
  const userGrowthConfig = {
    labels: userGrowthData?.data?.labels || last7Days,
    datasets: [
      {
        label: t("admin.overview.newUsers"),
        data: userGrowthData?.data?.growth || Array(7).fill(0),
        fill: false,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        tension: 0.1,
      },
    ],
  };

  // Tuỳ chọn biểu đồ user growth
  const userChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
      },
    },
  };

  // Cấu hình cho biểu đồ Content Growth từ API riêng
  const contentGrowthConfig = {
    labels: postGrowthData?.data?.labels || last7Days,
    datasets: [
      {
        label: t("admin.overview.newPosts"),
        data: postGrowthData?.data?.growth || Array(7).fill(0),
        fill: false,
        borderColor: "rgb(147, 51, 234)",
        backgroundColor: "rgba(147, 51, 234, 0.5)",
        tension: 0.1,
      },
    ],
  };

  // Tuỳ chọn biểu đồ content growth
  const contentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
      },
    },
  };

  // Hiển thị trạng thái loading
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  // Hiển thị lỗi nếu có
  if (basicError) {
    return (
      <div className="text-center p-6 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] my-4">
        <FaExclamationTriangle className="text-amber-500 text-4xl mx-auto mb-4" />
        <p className="text-lg font-medium text-[var(--color-text-primary)]">
          {t("admin.overview.errorLoadingDashboard")}
        </p>
        <p className="text-[var(--color-text-secondary)] mt-2">
          {basicError.message || t("admin.overview.tryAgainLater")}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="primary"
          className="mt-4"
        >
          {t("admin.overview.reload")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6 text-[var(--color-text-primary)]">
        {t("admin.overview.dashboardOverview")}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Card
            key={card.key}
            title={card.title}
            value={card.value}
            increase={card.increase}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-[var(--color-text-primary)]">
              {t("admin.overview.userGrowth")}
            </h3>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <FaChartLine className="text-lg" />
            </div>
          </div>
          <div className="h-64">
            {userGrowthData?.data?.growth ? (
              <Line data={userGrowthConfig} options={userChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-[var(--color-text-secondary)]">
                  {t("admin.overview.noUserGrowthData")}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-[var(--color-text-primary)]">
              {t("admin.overview.contentGrowth")}
            </h3>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <FaChartLine className="text-lg" />
            </div>
          </div>
          <div className="h-64">
            {postGrowthData?.data?.growth ? (
              <Line data={contentGrowthConfig} options={contentChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-[var(--color-text-secondary)]">
                  {t("admin.overview.noContentGrowthData")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)] shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            {t("admin.overview.recentActivity")}
          </h3>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <FaChartBar className="text-lg" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {t("admin.overview.activity")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {t("admin.overview.user")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {t("admin.overview.time")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {recentActivity?.data?.length > 0 ? (
                recentActivity.data.map((activity, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {activity.action}
                      {activity.type === "group_created" && (
                        <span className="ml-1 text-[var(--color-text-secondary)]">
                          ({activity.groupName})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-[var(--color-primary)] flex items-center justify-center text-white mr-2">
                          {activity.userDetails?.avatar ? (
                            <img
                              src={activity.userDetails.avatar}
                              alt={activity.user}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            activity.user?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            {activity.user}
                          </span>
                          {activity.userDetails?.fullname && (
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {activity.userDetails.fullname}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                      {new Date(activity.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-sm text-center text-[var(--color-text-secondary)]"
                  >
                    {t("admin.overview.noRecentActivity")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-[var(--color-text-primary)]">
            {t("admin.overview.systemStatus")}
          </h3>
          <div className="flex space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {t("admin.overview.healthy")}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {t("admin.overview.serverUptime")}
            </p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {statsData?.system?.uptime || "99.9%"}
            </p>
          </div>
          <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {t("admin.overview.memoryUsage")}
            </p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {statsData?.system?.memory || "42%"}
            </p>
          </div>
          <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {t("admin.overview.apiResponseTime")}
            </p>
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {statsData?.system?.responseTime || "120ms"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
