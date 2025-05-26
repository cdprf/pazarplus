// Add this debug script to help users clear invalid tokens
const clearAuthData = () => {
  console.log("🧹 Clearing authentication data...");

  // Clear localStorage
  const authKeys = ["token", "auth_token", "jwt_token", "access_token", "user"];
  authKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      console.log(`Removing ${key} from localStorage`);
      localStorage.removeItem(key);
    }
  });

  // Clear sessionStorage
  authKeys.forEach((key) => {
    if (sessionStorage.getItem(key)) {
      console.log(`Removing ${key} from sessionStorage`);
      sessionStorage.removeItem(key);
    }
  });

  console.log(
    "✅ Authentication data cleared. Please refresh the page and login again."
  );
};

// Make it available globally for easy browser console access
window.clearAuthData = clearAuthData;

console.log("💡 To clear invalid tokens, run: clearAuthData()");
