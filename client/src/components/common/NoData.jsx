import React from 'react';
import { FiInbox } from 'react-icons/fi';

const NoData = ({ message, description, icon, children }) => {
  const Icon = icon || FiInbox;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-2">{message}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {children}
    </div>
  );
};

export default NoData; 