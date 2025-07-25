import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://yarukai.com/api" : "/api");

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add authorization header interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { token } = response.data;
        localStorage.setItem("token", token);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, log out the user
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const authService = {
  // Register a new user
  register: async (userData) => {
    const response = await api.post("/register", userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post("/login", credentials);
    const { token, refreshToken, user } = response.data;

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
    }

    return { token, refreshToken, user };
  },

  // Logout user
  logout: async () => {
    try {
      await api.post("/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
  },

  // Get current user
  getCurrentUser: async () => {
    if (!localStorage.getItem("token")) {
      return null;
    }

    try {
      const response = await api.get("/me");
      return response.data.user;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
      }
      return null;
    }
  },

  // Request password reset
  forgotPassword: async (email) => {
    const response = await api.post("/forgot-password", { email });
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token, password) => {
    const response = await api.post("/reset-password", { token, password });
    return response.data;
  },

  // Verify email address
  verifyEmail: async (token) => {
    const response = await api.post("/verify-email", { token });
    return response.data;
  },

  // Setup two-factor authentication
  setupTwoFactor: async () => {
    const response = await api.post("/2fa/setup");
    return response.data;
  },

  // Verify two-factor authentication
  verifyTwoFactor: async (code, email) => {
    const response = await api.post("/2fa/verify", { code, email });
    return response.data;
  },

  // Disable two-factor authentication
  disableTwoFactor: async () => {
    const response = await api.post("/2fa/disable");
    return response.data;
  },
};

export default authService;
