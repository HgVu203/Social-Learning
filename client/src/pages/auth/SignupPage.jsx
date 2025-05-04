import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope, FaUser, FaLock, FaUserAlt } from "react-icons/fa";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    fullname: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isAuthenticated, verificationData, loading, error } =
    useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Immediately redirect to verification page when verification data is available
  useEffect(() => {
    // Check if we're coming back from verification page with a special flag
    const fromVerification = location?.state?.fromVerification === true;

    if (verificationData && !fromVerification) {
      console.log(
        "Redirecting to verification page with data:",
        verificationData
      );
      localStorage.setItem(
        "pendingVerification",
        JSON.stringify(verificationData)
      );
      navigate("/verify-email", { state: verificationData });
    } else if (fromVerification) {
      // If we're coming back from verification page, clear the verification data
      localStorage.removeItem("pendingVerification");
      sessionStorage.removeItem("pendingVerification");
      sessionStorage.removeItem("emailVerification");
      // And remove the state so future navigation won't trigger this condition
      window.history.replaceState({}, document.title);
    }
  }, [verificationData, navigate, location]);

  const validateField = (name, value) => {
    let error = null;

    switch (name) {
      case "email":
        if (!value) {
          error = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "username":
        if (!value) {
          error = "Username is required";
        } else if (value.length < 3) {
          error = "Username must be at least 3 characters";
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          error = "Username can only contain letters, numbers and underscores";
        }
        break;
      case "fullname":
        if (!value) {
          error = "Full name is required";
        } else if (value.length < 2) {
          error = "Full name must be at least 2 characters";
        }
        break;
      case "password":
        if (!value) {
          error = "Password is required";
        } else if (value.length < 8) {
          error = "Password must be at least 8 characters";
        } else if (!/[A-Z]/.test(value)) {
          error = "Password must contain at least one uppercase letter";
        } else if (!/[a-z]/.test(value)) {
          error = "Password must contain at least one lowercase letter";
        } else if (!/[0-9]/.test(value)) {
          error = "Password must contain at least one number";
        }
        break;
      default:
        break;
    }

    return error;
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        errors[key] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate field on change if it has been touched
    if (touched[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: validateField(name, value),
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    // Mark field as touched
    setTouched({
      ...touched,
      [name]: true,
    });

    // Validate on blur
    setValidationErrors({
      ...validationErrors,
      [name]: validateField(name, value),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) return;

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    if (!validateForm()) {
      return;
    }

    try {
      // This will set verificationData in the auth context, which triggers the redirect
      await signup(formData);
      // The redirect is handled by the useEffect above
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;

    let strength = 0;

    // Length check
    if (password.length >= 8) strength += 1;

    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    return Math.min(5, strength);
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const getPasswordStrengthLabel = () => {
    if (!formData.password) return "";

    const labels = [
      "Very Weak",
      "Weak",
      "Fair",
      "Good",
      "Strong",
      "Very Strong",
    ];
    return labels[passwordStrength];
  };

  const getPasswordStrengthColor = () => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-green-600",
    ];
    return colors[passwordStrength];
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <AuthForm
          title="Create Account"
          subtitle="Sign up to get started with your new account"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700"
            >
              <div className="flex">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          <AuthInput
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your email"
            error={validationErrors.email}
            icon={<FaEnvelope />}
            autoComplete="email"
            disabled={loading}
            required
          />

          <AuthInput
            label="Full Name"
            type="text"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your full name"
            error={validationErrors.fullname}
            icon={<FaUserAlt />}
            autoComplete="name"
            disabled={loading}
            required
          />

          <AuthInput
            label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Choose a username"
            error={validationErrors.username}
            icon={<FaUser />}
            autoComplete="username"
            disabled={loading}
            required
          />

          <div className="space-y-1">
            <AuthInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Create a strong password"
              error={validationErrors.password}
              icon={<FaLock />}
              autoComplete="new-password"
              disabled={loading}
              required
            />

            {formData.password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Password Strength:
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength <= 1
                        ? "text-red-500"
                        : passwordStrength <= 3
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {getPasswordStrengthLabel()}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
              </motion.div>
            )}
          </div>

          <AuthButton
            type="submit"
            isLoading={loading}
            disabled={loading}
            variant="primary"
            fullWidth
          >
            Create Account
          </AuthButton>

          <div className="text-center mt-6">
            <p className="text-[var(--color-text-secondary)]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default SignupPage;
