import { createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEYS } from "../hooks/queries/useUserQueries";
import { useUserMutations } from "../hooks/mutations/useUserMutations";

const UserContext = createContext({
  updateProfile: () => {},
  changePassword: () => {},
  invalidateUserQueries: () => {},
});

export const UserProvider = ({ children }) => {
  const queryClient = useQueryClient();

  // Get mutation functions
  const { updateProfile, changePassword } = useUserMutations();

  // Method to invalidate user queries
  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
  };

  const value = {
    // Mutations
    updateProfile,
    changePassword,

    // Helper methods
    invalidateUserQueries,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
