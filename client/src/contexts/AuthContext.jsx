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
      const response = await api.post("/api/auth/login", credentials);
      const { token: newToken, user: userData } = response.data;

      if (!newToken || !userData) {
        throw new Error("Invalid response from server");
      }

      setToken(newToken);
      setUser(userData);
      localStorage.setItem("token", newToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      // Clear any existing errors
      setError(null);

      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      throw err;
    }
  }, []);

  // Development auto-login function
  const devAutoLogin = useCallback(async () => {
    if (!enableDevMode) return false;

    try {
      console.log("🔧 Development mode: Attempting auto-authentication...");

      // Try to generate a fresh token
      const response = await fetch("http://localhost:3000/api/auth/dev-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ devMode: true }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.user) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("token", data.token);
          api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
          console.log("✅ Development auto-authentication successful");
          return true;
        }
      }
    } catch (err) {
      console.warn(
        "⚠️ Development auto-authentication failed, using fallback..."
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
    console.log("✅ Development fallback authentication active");
    return true;
  }, [enableDevMode]);

  const register = useCallback(async (userData) => {
    try {
      const response = await api.post("/api/auth/register", userData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      throw err;
    }
  }, []);

  const setupTwoFactor = useCallback(async () => {
    try {
      const response = await api.post("/api/auth/2fa/setup");
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to setup 2FA");
      throw err;
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (code, secret) => {
      try {
        const response = await api.post("/api/auth/2fa/verify", {
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
      const response = await api.post("/api/auth/2fa/disable");
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
      const response = await api.put("/api/auth/profile", profileData);
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
            console.log("Token expired, logging out");
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

          const response = await api.get("/api/auth/me");
          setUser(response.data.user);
          console.log("User authenticated successfully:", response.data.user);
        } catch (err) {
          console.error("Auth initialization error:", err);
          // Only logout if it's an authentication error, not a network error
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.log("Authentication failed, logging out");
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
            console.warn(
              "Network error during auth verification, keeping session"
            );
            // For network errors, we'll keep the session but still set loading to false
            // We'll set a basic user object based on the token if possible
            try {
              const decoded = jwtDecode(token);
              setUser({ id: decoded.id, authenticated: true });
            } catch (decodeErr) {
              console.error("Failed to decode token:", decodeErr);
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
        console.log(
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
