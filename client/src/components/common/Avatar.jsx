// src/components/common/Avatar.jsx
import defaultAvatar from '../../assets/images/default-avatar.svg'
const Avatar = ({ 
  src, 
  alt = 'Avatar',
  size = 'md',
  ...props 
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <img
      src={src || defaultAvatar}
      alt={alt}
      className={`${sizes[size]} rounded-full object-cover`}
      {...props}
    />
  );
};

export default Avatar;