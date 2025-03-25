import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { checkAuth } from './redux/authSlice';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProfilePage from './pages/profile/ProfilePage';
import EditProfilePage from './pages/profile/EditProfilePage';
import ChangePasswordPage from './pages/profile/ChangePasswordPage';
import PostDetailPage from './pages/post/PostDetailPage';
import CreatePostPage from './components/post/CreatePostPage';
import NotFoundPage from './pages/NotFoundPage';
import GroupsListPage from './pages/group/GroupsListPage';
import GroupDetailPage from './pages/group/GroupDetailPage';
import FriendsPage from './pages/friend/FriendsPage';
import CreateGroupPage from './pages/group/CreateGroupPage';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Main Layout Routes */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/post/:postId" element={<PostDetailPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/create-post" element={<CreatePostPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
        
        {/* 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* New routes */}
      <Route path="/groups" element={<GroupsListPage />} />
      <Route path="/groups/create" element={<CreateGroupPage />} />
      <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      <Route path="/friends" element={<FriendsPage />} />
    </Routes>
  );
}

export default App;