import logger from "../../../../utils/logger";

import React from 'react';

class DesignerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Designer Error:', error, errorInfo);
    
    // Report error to monitoring service if available
    if (window.reportError) {
      window.reportError(error, {
        component: 'ShippingSlipDesigner',
        errorInfo
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-96 p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-xl font-semibold mb-4">
            Designer Error
          </div>
          <div className="text-red-500 text-sm mb-4 max-w-md text-center">
            An error occurred in the shipping slip designer. This might be due to corrupted template data or a browser compatibility issue.
          </div>
          <div className="text-xs text-gray-500 mb-6 font-mono bg-gray-100 p-2 rounded max-w-md overflow-auto">
            {this.state.error?.message || 'Unknown error'}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DesignerErrorBoundary;