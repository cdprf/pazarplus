import logger from "../utils/logger.js";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
import { jwtDecode } from "jwt-decode";

// Export the context so it can be imported directly
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Development mode auto-authentication
  const enableDevMode =
    process.env.NODE_ENV === "development" ||
    window.location.hostname === "localhost";

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    setError(null);
    // Clear any other auth-related state/storage
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setError(null); // Clear any existing errors
      const response = await api.post("/auth/login", credentials);
      const { token: newToken, user: userData } = response.data;

      if (!newToken || !userData) {
        throw new Error("Invalid response from server");
      }

      setToken(newToken);
      setUser(userData);
      localStorage.setItem("token", newToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      return response.data;
    } catch (err) {
      // Enhanced error handling with specific feedback
      let errorMessage = "Login failed";
      
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 400:
            if (data.details?.code === 'MISSING_CREDENTIALS') {
              const missingFields = data.details.missingFields || [];
              const fieldNames = missingFields.join(' and ');
              errorMessage = `Please enter your ${fieldNames}`;
            } else if (data.details?.code === 'INVALID_EMAIL_FORMAT') {
              errorMessage = 'Please enter a valid email address';
            } else {
              errorMessage = data.message || 'Please check your input and try again';
            }
            break;
            
          case 401:
            if (data.details?.code === 'INVALID_CREDENTIALS') {
              if (data.details?.hint?.includes('email')) {
                errorMessage = 'Email address not found. Please check your email or create a new account.';
              } else if (data.details?.hint?.includes('password')) {
                errorMessage = 'Incorrect password. Please try again or reset your password.';
              } else {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
              }
            } else if (data.details?.code === 'ACCOUNT_DEACTIVATED') {
              errorMessage = 'Your account has been deactivated. Please contact support for assistance.';
            } else {
              errorMessage = data.message || 'Invalid credentials';
            }
            break;
            
          case 429:
            errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
            break;
            
          case 500:
            errorMessage = 'Server error. Please try again in a few moments.';
            break;
            
          default:
            errorMessage = data.message || 'Login failed. Please try again.';
        }
      } else if (err.request) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
      
      // Create a new error with the enhanced message
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = err;
      throw enhancedError;
    }
  }, []);

  // Development auto-login function
  const devAutoLogin = useCallback(async () => {
    if (!enableDevMode) return false;

    try {
      logger.info("🔧 Development mode: Attempting auto-authentication...");

      // Use relative path to let setupProxy.js handle routing
      const response = await api.post("/auth/dev-token", { devMode: true });

      if (response.data.success && response.data.token && response.data.user) {
        const { token: newToken, user: userData } = response.data;

        setToken(newToken);
        setUser(userData);
        localStorage.setItem("token", newToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

        logger.info("✅ Development auto-authentication successful", userData);
        return true;
      }
    } catch (err) {
      logger.warn(
        "⚠️ Development auto-authentication failed:",
        err.response?.data?.message || err.message
      );
    }

    // Fallback: Create a minimal user object for UI testing
    const fallbackUser = {
      id: 1,
      email: "dev@example.com",
      name: "Development User",
      role: "admin",
      authenticated: true,
      devMode: true,
    };

    setUser(fallbackUser);
    logger.info("✅ Development fallback authentication active");
    return true;
  }, [enableDevMode]);

  const register = useCallback(async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      throw err;
    }
  }, []);

  const setupTwoFactor = useCallback(async () => {
    try {
      const response = await api.post("/auth/2fa/setup");
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to setup 2FA");
      throw err;
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (code, secret) => {
      try {
        const response = await api.post("/auth/2fa/verify", {
          code,
          secret,
        });
        const userData = { ...user, twoFactorEnabled: true };
        setUser(userData);
        return response.data;
      } catch (err) {
        setError(err.response?.data?.message || "Failed to verify 2FA code");
        throw err;
      }
    },
    [user]
  );

  const disableTwoFactor = useCallback(async () => {
    try {
      const response = await api.post("/auth/2fa/disable");
      const userData = { ...user, twoFactorEnabled: false };
      setUser(userData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to disable 2FA");
      throw err;
    }
  }, [user]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.post("/auth/profile", profileData);
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      }
      return response.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update profile";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Verify token is still valid
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 < Date.now()) {
            logger.info("Token expired, logging out");
            handleLogout();
            setLoading(false);
            return;
          }

          // Only set auth header if we don't already have one or if it's different
          const currentAuth = api.defaults.headers.common["Authorization"];
          const expectedAuth = `Bearer ${token}`;
          if (currentAuth !== expectedAuth) {
            api.defaults.headers.common["Authorization"] = expectedAuth;
          }

          const response = await api.get("/auth/me");
          setUser(response.data.user);
          logger.info("User authenticated successfully:", response.data.user);
        } catch (err) {
          logger.error("Auth initialization error:", err);
          // Only logout if it's an authentication error, not a network error
          if (err.response?.status === 401 || err.response?.status === 403) {
            logger.info("Authentication failed, logging out");
            handleLogout();

            // Try development auto-login as fallback
            if (enableDevMode) {
              const devAuthSuccess = await devAutoLogin();
              if (devAuthSuccess) {
                setLoading(false);
                return;
              }
            }
          } else {
            logger.warn(
              "Network error during auth verification, keeping session"
            );
            // For network errors, we'll keep the session but still set loading to false
            // We'll set a basic user object based on the token if possible
            try {
              const decoded = jwtDecode(token);
              setUser({ id: decoded.id, authenticated: true });
            } catch (decodeErr) {
              logger.error("Failed to decode token:", decodeErr);
              handleLogout();

              // Try development auto-login as final fallback
              if (enableDevMode) {
                await devAutoLogin();
              }
            }
          }
        }
      } else if (enableDevMode) {
        // No token in development mode - try auto-authentication
        logger.info(
          "🔧 No token found in development mode, attempting auto-authentication..."
        );
        await devAutoLogin();
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token, handleLogout, enableDevMode, devAutoLogin]);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout: handleLogout,
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    updateProfile,
    setError,
    devMode: enableDevMode && user?.devMode,
    // Development mode bypass function (alias for devAutoLogin)
    bypassLogin: devAutoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Keep default export for backward compatibility
export default AuthContext;
