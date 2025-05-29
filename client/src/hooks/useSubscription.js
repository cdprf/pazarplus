import { useState, useEffect, useContext, createContext } from "react";
import { subscriptionService } from "../services/subscriptionService";

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featureCache, setFeatureCache] = useState({});

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getCurrentSubscription();
      setSubscription(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const hasFeatureAccess = async (feature) => {
    // Check cache first
    if (featureCache[feature] !== undefined) {
      return featureCache[feature];
    }

    try {
      const response = await subscriptionService.validateFeatureAccess(feature);
      const hasAccess = response.data.hasAccess;

      // Cache the result
      setFeatureCache((prev) => ({
        ...prev,
        [feature]: hasAccess,
      }));

      return hasAccess;
    } catch (err) {
      console.error("Feature validation error:", err);
      return false;
    }
  };

  const trackUsage = async (metricType, increment = 1) => {
    try {
      await subscriptionService.trackUsage(metricType, increment);
      // Reload subscription to get updated usage stats
      await loadSubscription();
    } catch (err) {
      console.error("Usage tracking error:", err);
    }
  };

  const upgradePlan = async (planId) => {
    try {
      setLoading(true);
      await subscriptionService.upgradePlan(planId);
      await loadSubscription();
      // Clear feature cache on plan change
      setFeatureCache({});
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    try {
      setLoading(true);
      await subscriptionService.startTrial();
      await loadSubscription();
      setFeatureCache({});
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (reason) => {
    try {
      setLoading(true);
      await subscriptionService.cancelSubscription(reason);
      await loadSubscription();
      setFeatureCache({});
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    subscription,
    loading,
    error,
    hasFeatureAccess,
    trackUsage,
    upgradePlan,
    startTrial,
    cancelSubscription,
    reload: loadSubscription,
    isTrialActive: subscription?.status === "trial",
    isActive: subscription?.status === "active",
    isPastDue: subscription?.status === "past_due",
    isCanceled: subscription?.status === "canceled",
    planName: subscription?.planName || "Free",
    usageStats: subscription?.usageStats || {},
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
