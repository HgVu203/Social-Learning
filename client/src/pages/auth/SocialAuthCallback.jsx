import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/authSlice';

const SocialAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const user = searchParams.get('user');

    if (accessToken && user) {
      try {
        const userData = JSON.parse(user);
        dispatch(setCredentials({
          user: userData,
          accessToken
        }));
        localStorage.setItem('accessToken', accessToken);
        navigate('/');
      } catch (error) {
        console.error('Failed to parse user data:', error);
        navigate('/login?error=Authentication failed');
      }
    } else {
      navigate('/login?error=Authentication failed');
    }
  }, [searchParams, dispatch, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default SocialAuthCallback;