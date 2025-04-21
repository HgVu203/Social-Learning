import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import EditProfileModal from "../../components/profile/EditProfileModal";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleCloseModal = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
      <EditProfileModal isOpen={true} onClose={handleCloseModal} />
    </div>
  );
};

export default EditProfilePage;
