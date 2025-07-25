import logger from "../../../utils/logger.js";
// Import all CSS files
import './modern.css';
import './modern-tables.css';
import './modern-forms.css';
import './modern-responsive.css';

// Export a function to initialize styles
export const initializeStyles = () => {
  logger.info('Modern UI styles initialized');
};

// Export default for easy importing
export default {
  initializeStyles
};