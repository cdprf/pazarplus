import logger from "../utils/logger.js";
import React, { useState, useEffect } from "react";
import { Lock, Crown, Star } from "lucide-react";
import { useSubscription } from "../../hooks/useSubscription";

const FeatureGate = ({
  feature,
  children,
  fallback = null,
  showUpgradePrompt = true,
  className = "",
}) => {
  const { hasFeatureAccess, upgradePlan, planName } = useSubscription();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const access = await hasFeatureAccess(feature);
      setHasAccess(access);
    } catch (error) {
      logger.error("Feature access check failed:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`animate-pulse bg-gray-200 rounded-md h-8 ${className}`}
      />
    );
  }

  if (hasAccess) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <UpgradePrompt
      feature={feature}
      planName={planName}
      onUpgrade={upgradePlan}
    />
  );
};

const UpgradePrompt = ({ feature, planName, onUpgrade }) => {
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const success = await onUpgrade("pro"); // Default to pro plan
      if (success) {
        // Handle successful upgrade
        logger.info("Upgrade successful");
      }
    } catch (error) {
      logger.error("Upgrade failed:", error);
    } finally {
      setUpgrading(false);
    }
  };

  const featureNames = {
    advanced_analytics: "Advanced Analytics",
    bulk_operations: "Bulk Operations",
    api_access: "API Access",
    white_label: "White Label",
    priority_support: "Priority Support",
    advanced_reporting: "Advanced Reporting",
    multi_store: "Multi-Store Management",
    inventory_sync: "Inventory Synchronization",
    automated_pricing: "Automated Pricing",
    custom_integrations: "Custom Integrations",
  };

  const featureName =
    featureNames[feature] ||
    feature.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-3">
          <Crown className="h-6 w-6 text-white" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Unlock {featureName}
      </h3>

      <p className="text-gray-600 mb-4">
        This premium feature is available with our Pro plan. Upgrade now to
        access advanced capabilities.
      </p>

      <div className="flex items-center justify-center space-x-2 mb-4">
        <Star className="h-4 w-4 text-yellow-500" />
        <span className="text-sm text-gray-500">Current plan: {planName}</span>
      </div>

      <button
        onClick={handleUpgrade}
        disabled={upgrading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {upgrading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Upgrading...
          </>
        ) : (
          <>
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro
          </>
        )}
      </button>
    </div>
  );
};

// Higher-order component for feature gating
export const withFeatureGate = (feature, fallbackComponent = null) => {
  return (WrappedComponent) => {
    return (props) => (
      <FeatureGate feature={feature} fallback={fallbackComponent}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
};

// Hook for feature access checking in components
export const useFeatureAccess = (feature) => {
  const { hasFeatureAccess } = useSubscription();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const access = await hasFeatureAccess(feature);
      setHasAccess(access);
    } catch (error) {
      logger.error("Feature access check failed:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, recheckAccess: checkAccess };
};

// Feature lock overlay component
export const FeatureLock = ({ feature, children, blurContent = true }) => {
  const { hasAccess, loading } = useFeatureAccess(feature);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-md h-32" />;
  }

  if (hasAccess) {
    return children;
  }

  return (
    <div className="relative">
      <div
        className={`${
          blurContent ? "filter blur-sm" : "opacity-50"
        } pointer-events-none`}
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-sm">
          <Lock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Premium Feature
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upgrade your plan to unlock this feature
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureGate;
