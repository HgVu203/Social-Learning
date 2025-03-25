import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, clearProfile } from '../../redux/userSlice';
import Loading from '../../components/common/Loading';
import PostList from '../../components/post/PostList';
import defaultAvatar from '../../assets/images/default-avatar.svg';

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector(state => state.auth);
  const { profile, loading, error } = useSelector(state => state.user);

  useEffect(() => {
    // If no userId provided and user is logged in, use current user's id
    const targetUserId = userId || currentUser?._id;

    if (!targetUserId) {
      navigate('/login');
      return;
    }

    dispatch(fetchProfile(targetUserId));

    return () => {
      dispatch(clearProfile());
    };
  }, [userId, currentUser, dispatch, navigate]);

  // Check if this is the current user's profile
  const isOwnProfile = !userId || (currentUser && profile && currentUser._id === profile._id);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-500 relative">
          <img
            src={profile.avatar || defaultAvatar}
            alt={profile.username}
            className="absolute bottom-0 left-8 transform translate-y-1/2 w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
          />
          
          {/* Action Buttons */}
          {isOwnProfile && (
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <Link 
                to="/edit-profile" 
                className="bg-white py-2 px-4 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Edit Profile
              </Link>
              <Link
                to="/change-password"
                className="bg-white py-2 px-4 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Change Password
              </Link>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="pt-20 pb-6 px-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.fullname}</h1>
              <p className="text-gray-600">@{profile.username}</p>
              
              {profile.email && (
                <p className="text-gray-500 mt-2 flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profile.email}
                </p>
              )}
              
              {profile.phone && (
                <p className="text-gray-500 mt-1 flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {profile.phone}
                </p>
              )}
              
              {profile.address && (
                <p className="text-gray-500 mt-1 flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.address}
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Bio</h3>
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-6 mb-6 border-t border-b border-gray-100 py-6">
            <div className="text-center">
              <span className="block font-bold text-2xl text-gray-900">{profile.posts?.length || 0}</span>
              <span className="text-gray-600">Posts</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-2xl text-gray-900">{profile.points || 0}</span>
              <span className="text-gray-600">Points</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-2xl text-gray-900">{profile.rank || 'Rookie'}</span>
              <span className="text-gray-600">Rank</span>
            </div>
          </div>
          
          {/* User's Posts Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {isOwnProfile ? 'Your Posts' : `${profile.username}'s Posts`}
            </h2>
            
            {profile.posts && profile.posts.length > 0 ? (
              <PostList 
                posts={profile.posts} 
                loading={false} 
                error={null}
              />
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <p className="mt-2 text-gray-500">No posts yet</p>
                
                {isOwnProfile && (
                  <Link
                    to="/create-post"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
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

export default ProfilePage; 