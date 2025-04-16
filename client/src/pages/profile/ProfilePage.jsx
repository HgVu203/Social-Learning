import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Loading from "../../components/common/Loading";
import PostList from "../../components/post/PostList";
import defaultAvatar from "../../assets/images/default-avatar.svg";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfile } from "../../hooks/queries/useUserQueries";

// Mapping của màu sắc cho từng rank
const rankColors = {
  Rookie: {
    bg: "bg-gray-700",
    text: "text-gray-200",
    border: "border-gray-500",
    shadow: "shadow-gray-900/20",
  },
  Bronze: {
    bg: "bg-amber-800",
    text: "text-amber-100",
    border: "border-amber-600",
    shadow: "shadow-amber-900/30",
  },
  Silver: {
    bg: "bg-gray-400",
    text: "text-gray-800",
    border: "border-gray-300",
    shadow: "shadow-gray-600/30",
  },
  Gold: {
    bg: "bg-yellow-500",
    text: "text-yellow-900",
    border: "border-yellow-400",
    shadow: "shadow-yellow-700/40",
  },
  Platinum: {
    bg: "bg-cyan-600",
    text: "text-cyan-100",
    border: "border-cyan-400",
    shadow: "shadow-cyan-800/30",
  },
  Diamond: {
    bg: "bg-blue-700",
    text: "text-blue-100",
    border: "border-blue-400",
    shadow: "shadow-blue-900/30",
  },
  Master: {
    bg: "bg-purple-600",
    text: "text-purple-100",
    border: "border-purple-400",
    shadow: "shadow-purple-800/40",
  },
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // If no userId provided and user is logged in, use current user's id
  const targetUserId = userId || currentUser?._id;

  console.log(
    "ProfilePage - TargetUserId:",
    targetUserId,
    "CurrentUser:",
    currentUser
  );

  const {
    data: profileData,
    isLoading: loading,
    error,
  } = useUserProfile(targetUserId);

  console.log("Profile Data:", profileData);

  // Đảm bảo profile có dữ liệu
  const profile = profileData?.data || null;

  console.log("Profile after parsing:", profile);

  useEffect(() => {
    if (!targetUserId) {
      navigate("/login");
    }
  }, [targetUserId, navigate]);

  // Check if this is the current user's profile
  const isOwnProfile =
    !userId || (currentUser && profile && currentUser._id === profile._id);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    console.error("Profile error:", error);
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-900/20 text-red-500 p-4 rounded-lg">
          {error.message || "Failed to load profile"}
        </div>
      </div>
    );
  }

  if (!profile) {
    console.log("No profile data available to render");
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-8 text-gray-400 bg-[#16181c] rounded-lg">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <p className="text-gray-500">
            This user profile doesn't exist or you don't have permission to view
            it.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Lấy màu sắc cho rank hiện tại
  const rankColor = rankColors[profile.rank] || rankColors.Rookie;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Profile Header */}
      <h1 className="text-2xl font-bold text-white pb-4">Profile</h1>
      <div className="bg-[#16181c] rounded-lg shadow-md overflow-hidden mb-6">
        {/* Profile Info */}
        <div className="px-6 py-6 relative">
          <div className="flex flex-col md:flex-row md:items-end">
            <div className="relative -mt-20 mb-4 md:mb-0">
              <img
                src={profile.avatar || defaultAvatar}
                alt={profile.username}
                className="w-36 h-36 rounded-full border-4 border-[#16181c] shadow-xl object-cover"
              />
              {isOwnProfile && (
                <Link
                  to="/edit-profile"
                  className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </Link>
              )}
            </div>

            <div className="md:ml-6 flex-grow">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <h1 className="text-2xl font-bold text-white">
                      {profile.fullname}
                    </h1>

                    {/* Rank Badge */}
                    <div
                      className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${rankColor.bg} ${rankColor.text} border ${rankColor.border} ${rankColor.shadow}`}
                    >
                      {profile.rank}
                    </div>
                  </div>
                  <p className="text-gray-400">@{profile.username}</p>

                  {/* Points Display */}
                  <div className="mt-1 flex items-center">
                    <svg
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-1 text-gray-300">
                      {profile.points || 0} points
                    </span>
                  </div>
                </div>

                <div className="mt-4 md:mt-0">
                  {!isOwnProfile ? (
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center shadow-md">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Follow
                      </button>
                      <button className="px-4 py-2 bg-[#3a3b3c] text-gray-300 rounded-md hover:bg-[#4d4e4f] transition-colors flex items-center shadow-md">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        Message
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/edit-profile"
                      className="px-4 py-2 bg-[#3a3b3c] text-gray-300 rounded-md hover:bg-[#4d4e4f] transition-colors inline-flex items-center shadow-md"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Profile
                    </Link>
                  )}
                </div>
              </div>

              <p className="mt-3 text-gray-300">
                {profile.bio || "No bio yet"}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-gray-400">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>{profile.followers?.length || 0} followers</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  <span>{profile.posts?.length || 0} posts</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    Joined{" "}
                    {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Sidebar */}
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rank & Points */}
            <div className="bg-[#16181c] rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                Stats
              </h3>

              <div className="bg-[#1d1f23] rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Current Rank</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${rankColor.bg} ${rankColor.text} border ${rankColor.border}`}
                  >
                    {profile.rank}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Points</span>
                  <span className="text-white font-semibold">
                    {profile.points || 0}
                  </span>
                </div>

                {/* Progress to next rank */}
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      Next rank: {getNextRank(profile.rank)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getPointsToNextRank(profile.rank, profile.points)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`${rankColor.bg} h-2 rounded-full`}
                      style={{
                        width: `${getPointsToNextRank(
                          profile.rank,
                          profile.points
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Badges section */}
              {profile.badges && profile.badges.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-gray-400 mt-6 mb-2">
                    Badges
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {profile.badges.map((badge, index) => (
                      <div
                        key={index}
                        className="bg-[#1d1f23] p-2 rounded-lg flex flex-col items-center justify-center"
                        title={`${badge.name} - Earned on ${new Date(
                          badge.earnedAt
                        ).toLocaleDateString()}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-400 mt-1 text-center truncate w-full">
                          {badge.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* About */}
            <div className="bg-[#16181c] rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                About
              </h3>
              <div className="bg-[#1d1f23] rounded-lg p-4">
                <div className="space-y-4">
                  {profile.phone && (
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          Phone
                        </h4>
                        <p className="text-gray-300">{profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {/* Joined date */}
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        Joined
                      </h4>
                      <p className="text-gray-300">
                        {new Date(profile.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {profile.location && (
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          Location
                        </h4>
                        <p className="text-gray-300">{profile.location}</p>
                      </div>
                    </div>
                  )}

                  {profile.website && (
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          Website
                        </h4>
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {profile.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {profile.address && (
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          Address
                        </h4>
                        <p className="text-gray-300">{profile.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          <div className="bg-[#16181c] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              {isOwnProfile ? "Your Posts" : `${profile.fullname}'s Posts`}
            </h2>

            {profile.posts && profile.posts.length > 0 ? (
              <PostList posts={profile.posts} loading={false} error={null} />
            ) : (
              <div className="text-center py-10 bg-[#1d1f23] rounded-lg">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                <p className="mt-2 text-gray-400">No posts yet</p>

                {isOwnProfile && (
                  <Link
                    to="/create-post"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create Your First Post
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function để xác định rank tiếp theo
function getNextRank(currentRank) {
  const ranks = [
    "Rookie",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
  ];

  const currentIndex = ranks.indexOf(currentRank);
  if (currentIndex === ranks.length - 1) {
    return "Max Rank";
  }

  return ranks[currentIndex + 1];
}

// Helper function để tính phần trăm tiến độ đến rank tiếp theo
function getPointsToNextRank(currentRank, points) {
  // Định nghĩa số điểm cần cho mỗi rank
  const rankThresholds = {
    Rookie: { min: 0, max: 100 },
    Bronze: { min: 100, max: 500 },
    Silver: { min: 500, max: 1500 },
    Gold: { min: 1500, max: 3000 },
    Platinum: { min: 3000, max: 6000 },
    Diamond: { min: 6000, max: 10000 },
    Master: { min: 10000, max: Infinity },
  };

  const current = rankThresholds[currentRank];

  // Nếu đã là rank cao nhất
  if (currentRank === "Master") {
    return 100;
  }

  // Tính toán phần trăm hoàn thành
  const pointsInCurrentRank = points - current.min;
  const pointsNeededForNextRank = current.max - current.min;
  let percentage = Math.floor(
    (pointsInCurrentRank / pointsNeededForNextRank) * 100
  );

  // Giới hạn trong khoảng 0-100
  return Math.min(Math.max(percentage, 0), 100);
}

export default ProfilePage;
