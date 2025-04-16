import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

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
    if (verificationData) {
      console.log(
        "Redirecting to verification page with data:",
        verificationData
      );
      localStorage.setItem(
        "pendingVerification",
        JSON.stringify(verificationData)
      );
      navigate("/verify-email", { state: verificationData });
    }
  }, [verificationData, navigate]);

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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 hover:shadow-blue-900/10">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Create Account
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 animate-pulse">
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
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-gray-300 mb-1 font-medium"
                htmlFor="email"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  validationErrors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="email"
              />
              {validationErrors.email && touched.email && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-gray-300 mb-1 font-medium"
                htmlFor="username"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  validationErrors.username
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="username"
              />
              {validationErrors.username && touched.username && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.username}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-gray-300 mb-1 font-medium"
                htmlFor="fullname"
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  validationErrors.fullname
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                placeholder="Enter your full name"
                value={formData.fullname}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="name"
              />
              {validationErrors.fullname && touched.fullname && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.fullname}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-gray-300 mb-1 font-medium"
                htmlFor="password"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  validationErrors.password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={loading}
                autoComplete="new-password"
              />

              {/* Password strength indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400">
                      Password strength:
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength < 2
                          ? "text-red-400"
                          : passwordStrength < 4
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${passwordStrength * 20}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {validationErrors.password && touched.password && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.password}
                </p>
              )}

              <p className="text-xs text-gray-400 mt-2">
                Password must be at least 8 characters long, include uppercase,
                lowercase letters and numbers.
              </p>
            </div>

            <button
              type="submit"
              className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-lg transition-all duration-200 font-medium mt-6 ${
                loading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
              }`}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Login now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
