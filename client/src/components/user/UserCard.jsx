import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUser } from "react-icons/fi";
import Avatar from "../common/Avatar";
import { useTranslation } from "react-i18next";

const UserCard = ({ user }) => {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card flex flex-row items-center p-3 sm:p-4 rounded-xl mb-3 border border-[var(--color-border)] justify-between"
    >
      <div className="flex items-center">
        <Link to={`/profile/${user._id}`} className="flex-shrink-0">
          <Avatar
            src={user.avatar}
            alt={user.username || "User"}
            size="lg"
            className="mr-3"
          />
        </Link>

        <div className="min-w-0 mr-2">
          <Link
            to={`/profile/${user._id}`}
            className="font-medium text-[var(--color-text-primary)] hover:underline block truncate"
          >
            {user.fullname || user.username}
          </Link>

          <p className="text-sm text-[var(--color-text-secondary)] truncate">
            @{user.username}
          </p>

          {user.bio && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-1 hidden sm:block">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        <Link
          to={`/profile/${user._id}`}
          className="flex btn bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-3 py-1.5 rounded-md text-sm items-center transition-colors"
        >
          <FiUser className="w-4 h-4 mr-1" />
          <span>{t("profile.viewProfile")}</span>
        </Link>
      </div>
    </motion.div>
  );
};

export default UserCard;
