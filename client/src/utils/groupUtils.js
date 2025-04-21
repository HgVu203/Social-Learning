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
 * Creates a formatted response object with group data
 * @param {Object} originalResponse - Original API response
 * @param {Array} groupsData - Groups data to include in the response
 * @returns {Object} - Formatted response
 */
export const createFormattedResponse = (originalResponse, groupsData) => {
  return {
    ...originalResponse,
    data: groupsData,
  };
};

/**
 * Checks if a user is a member of a group
 * @param {Object} group - Group object
 * @param {String} userId - User ID to check
 * @returns {Boolean} - Whether the user is a member
 */
export const isUserMemberOfGroup = (group, userId) => {
  if (!group || !userId || !group.members) return false;
  return group.members.some(
    (member) =>
      member.user?._id?.toString() === userId.toString() ||
      member.user?.toString() === userId.toString()
  );
};

/**
 * Gets the role of a user in a group
 * @param {Object} group - Group object
 * @param {String} userId - User ID to check
 * @returns {String|null} - User's role or null if not a member
 */
export const getUserRoleInGroup = (group, userId) => {
  if (!group || !userId || !group.members) return null;

  const member = group.members.find(
    (member) =>
      member.user?._id?.toString() === userId.toString() ||
      member.user?.toString() === userId.toString()
  );

  return member ? member.role : null;
};

/**
 * Checks if a user is an admin of a group
 * @param {Object} group - Group object
 * @param {String} userId - User ID to check
 * @returns {Boolean} - Whether the user is an admin
 */
export const isUserGroupAdmin = (group, userId) => {
  const role = getUserRoleInGroup(group, userId);
  return role === "admin";
};

/**
 * Formats member data for consistent use
 * @param {Object} member - Member object from API
 * @returns {Object} - Formatted member object
 */
export const formatMemberData = (member) => {
  if (!member) return null;

  return {
    ...member,
    id: member.user?._id || member._id,
    username: member.user?.username || member.username,
    email: member.user?.email || member.email,
    avatar: member.user?.avatar || member.avatar,
    role: member.role || "member",
    joinedAt: member.joinedAt || new Date(),
  };
};

export default {
  sortGroupsByPopularity,
  processGroupData,
  createFormattedResponse,
  isUserMemberOfGroup,
  getUserRoleInGroup,
  isUserGroupAdmin,
  formatMemberData,
};
