import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/linkRoutes';
import programmingIcon from '../../assets/images/programming.svg';
import webdevIcon from '../../assets/images/webdev.svg';
import Avatar from '../common/Avatar';

const communities = [
  {
    id: 'programming',
    name: 'Programming',
    icon: programmingIcon,
  },
  {
    id: 'webdev',
    name: 'Web Development',
    icon: webdevIcon,
  }
];

const menuItems = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label: 'Home',
    path: ROUTES.HOME,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    label: 'Communities',
    path: '/communities',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    label: 'Saved Posts',
    path: '/saved',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Recent Activity',
    path: '/activity',
  },
];

const Sidebar = ({ onClose }) => {
  return (
    <div className="w-64 bg-white h-full shadow-lg">
      <div className="p-4">
        <div className="space-y-1">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={onClose}
            >
              <span className="text-gray-600">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <hr className="my-6" />

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Your Communities
          </h3>
          <div className="space-y-2">
            {communities.map((community) => (
              <Link
                key={community.id}
                to={`/communities/${community.id}`}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100"
                onClick={onClose}
              >
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden">
                  <Avatar
                    src={community.icon}
                    alt={community.name}
                    className="w-full h-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '';
                    }}
                  />
                </div>
                <span>{community.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 