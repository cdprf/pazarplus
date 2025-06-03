import { PAPER_SIZE_PRESETS } from "../constants/paperSizes.js";

// Utility functions for the designer
export const generateId = () =>
  `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const getPaperDimensions = (config) => {
  let dimensions;

  if (config.paperSize === "CUSTOM" && config.customDimensions) {
    dimensions = {
      width: config.customDimensions.width,
      height: config.customDimensions.height,
    };
  } else {
    dimensions = PAPER_SIZE_PRESETS[config.paperSize] || PAPER_SIZE_PRESETS.A4;
  }

  return config.orientation === "landscape"
    ? { width: dimensions.height, height: dimensions.width }
    : { width: dimensions.width, height: dimensions.height };
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    return dateString;
  }
};

export const formatCurrency = (amount, currency = "TRY") => {
  if (!amount && amount !== 0) return "";
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readJSONFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsText(file);
  });
};
