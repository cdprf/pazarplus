import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Star,
  Shield,
} from "lucide-react";
import { subscriptionService } from "../../services/subscriptionService";

const SubscriptionDashboard = () => {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usageStats, setUsageStats] = useState({});
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subscriptionData, plansData, billingData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPlans(),
        subscriptionService.getBillingHistory(),
      ]);

      setCurrentSubscription(subscriptionData.data);
      setPlans(plansData.data.plans);
      setUsageStats(subscriptionData.data.usageStats || {});
      setBillingHistory(billingData.data.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setLoading(true);
      await subscriptionService.upgradePlan(planId);
      await loadSubscriptionData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      setLoading(true);
      await subscriptionService.startTrial();
      await loadSubscriptionData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      trial: { bg: "bg-blue-100", text: "text-blue-800", label: "Trial" },
      active: { bg: "bg-green-100", text: "text-green-800", label: "Active" },
      past_due: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Past Due",
      },
      canceled: { bg: "bg-red-100", text: "text-red-800", label: "Canceled" },
    };

    const badge = badges[status] || badges.trial;
    return (
      <span
        className={`px-3 py-1 text-sm font-medium rounded-full ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  const UsageCard = ({ title, current, limit, icon: Icon, percentage }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <span className="text-2xl font-bold text-gray-900">
          {current}/{limit === -1 ? "∞" : limit}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${
            percentage > 80
              ? "bg-red-500"
              : percentage > 60
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <p className="text-sm text-gray-500">
        {percentage.toFixed(1)}% used
        {percentage > 80 && (
          <span className="ml-2 text-red-600 font-medium">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            Approaching limit
          </span>
        )}
      </p>
    </div>
  );

  const PlanCard = ({ plan, isCurrentPlan, onUpgrade }) => (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 ${
        isCurrentPlan ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        {plan.recommended && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Recommended
          </span>
        )}
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900">₺{plan.price}</span>
        <span className="text-gray-500">/month</span>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <button className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md cursor-not-allowed">
          Current Plan
        </button>
      ) : (
        <button
          onClick={() => onUpgrade(plan.id)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          {plan.id === "trial" ? "Start Trial" : "Upgrade"}
        </button>
      )}
    </div>
  );

  if (loading && !currentSubscription) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription Overview */}
      {currentSubscription && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Current Subscription
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-semibold text-gray-900">
                    {currentSubscription.planName}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Shield className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(currentSubscription.status)}
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Next Billing</p>
                  <p className="font-semibold text-gray-900">
                    {currentSubscription.nextBillingAt
                      ? new Date(
                          currentSubscription.nextBillingAt
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-purple-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold text-gray-900">
                    ₺{(currentSubscription.amount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {Object.keys(usageStats).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Usage Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(usageStats).map(([key, stats]) => (
              <UsageCard
                key={key}
                title={key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                current={stats.current}
                limit={stats.limit}
                percentage={stats.percentage}
                icon={TrendingUp}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Subscription Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentSubscription?.planId === plan.id}
                onUpgrade={handleUpgrade}
              />
            ))}
          </div>
        </div>
      )}

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Billing History
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingHistory.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₺{invoice.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      <button className="hover:text-blue-900">
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Subscription State */}
      {!currentSubscription && !loading && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No active subscription
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Start your free trial to access all features.
          </p>
          <div className="mt-6">
            <button
              onClick={handleStartTrial}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
