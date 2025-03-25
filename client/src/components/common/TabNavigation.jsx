import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const [localActiveTab, setLocalActiveTab] = useState(activeTab || tabs[0]?.id);

  useEffect(() => {
    if (activeTab && activeTab !== localActiveTab) {
      setLocalActiveTab(activeTab);
    }
  }, [activeTab]);

  const handleTabClick = (tabId) => {
    setLocalActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                localActiveTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={localActiveTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

TabNavigation.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
};

export default TabNavigation; 