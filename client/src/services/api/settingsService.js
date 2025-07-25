import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://yarukai.com/api" : "/api");

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/settings`,
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

const settingsService = {
  // Get print settings
  getPrintSettings: async () => {
    try {
      const response = await api.get("/print");
      return response.data;
    } catch (error) {
      // Fallback to localStorage if API is not available
      const saved = localStorage.getItem("printSettings");
      return saved
        ? { success: true, data: JSON.parse(saved) }
        : { success: false };
    }
  },

  // Save print settings
  savePrintSettings: async (settings) => {
    try {
      const response = await api.put("/print", settings);
      // Also save to localStorage as backup
      localStorage.setItem("printSettings", JSON.stringify(settings));
      return response.data;
    } catch (error) {
      // Fallback to localStorage
      localStorage.setItem("printSettings", JSON.stringify(settings));
      return { success: true, message: "Settings saved locally" };
    }
  },

  // Test e-fatura connection
  testEFaturaConnection: async (credentials) => {
    const response = await api.post("/efatura/test", credentials);
    return response.data;
  },

  // Get shipping slip templates
  getShippingTemplates: async () => {
    const response = await api.get("/templates/shipping");
    return response.data;
  },

  // Get invoice templates
  getInvoiceTemplates: async () => {
    const response = await api.get("/templates/invoice");
    return response.data;
  },

  // Preview template
  previewTemplate: async (type, templateName) => {
    const response = await api.get(
      `/templates/preview/${type}/${templateName}`,
      {
        responseType: "blob",
      }
    );

    // Create preview URL
    const url = window.URL.createObjectURL(new Blob([response.data]));
    return { success: true, data: { previewUrl: url } };
  },

  // Upload company logo
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append("logo", file);

    const response = await api.post("/upload/logo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default settingsService;
