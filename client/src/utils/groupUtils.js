/**
 * Sorts groups by popularity criteria (currently member count)
 * @param {Array} groups - Array of group objects
 * @param {Number} limit - Maximum number of groups to return
 * @returns {Array} - Sorted array of groups
 */
export const sortGroupsByPopularity = (groups = [], limit = 5) => {
  if (!Array.isArray(groups)) {
    console.error("sortGroupsByPopularity expects an array of groups");
    return [];
  }

  // Sort by member count (descending)
  const sortedGroups = [...groups].sort((a, b) => {
    const aMemberCount = a.membersCount || a.members?.length || 0;
    const bMemberCount = b.membersCount || b.members?.length || 0;
    return bMemberCount - aMemberCount;
  });

  // Return only the requested number of groups
  return sortedGroups.slice(0, limit);
};

/**
 * Formats group data for display
 * @param {Object} groupData - Raw group data from API
 * @returns {Object} - Processed group data
 */
export const processGroupData = (groupData) => {
  if (!groupData) return null;

  const group = { ...groupData };

  // Ensure membersCount is calculated
  if (!group.membersCount && group.members?.length) {
    group.membersCount = group.members.length;
  }

  return group;
};

/**
 * Creates a response object that matches the expected API format
 * @param {Object} originalResponse - Original API response
 * @param {Array} newData - New data to include in the response
 * @returns {Object} - Formatted response object
 */
export const createFormattedResponse = (originalResponse, newData) => {
  return {
    ...originalResponse,
    data: newData,
  };
};

export default {
  sortGroupsByPopularity,
  processGroupData,
  createFormattedResponse,
};
