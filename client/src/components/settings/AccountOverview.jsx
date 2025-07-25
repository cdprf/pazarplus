import logger from "../../utils/logger.js";
import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { AuthContext } from "../../contexts/AuthContext";
import { Badge } from "../ui";
import { Card, CardHeader, CardTitle, CardContent } from "../ui";

const AccountOverview = () => {
  const { user } = useContext(AuthContext);
  // eslint-disable-next-line no-unused-vars
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    apiCalls: 0,
    lastSyncAt: null,
  });

  const fetchUserStats = useCallback(async () => {
    try {
      // This would be an endpoint that aggregates user statistics
      // For now, we'll use placeholder data
      setStats({
        totalOrders: 0,
        totalProducts: 0,
        apiCalls: user?.monthlyApiCalls || 0,
        lastSyncAt: user?.lastActivityAt,
      });
    } catch (error) {
      logger.error("Failed to fetch user stats:", error);
    }
  }, [user?.monthlyApiCalls, user?.lastActivityAt]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const getSubscriptionBadge = () => {
    if (!user?.subscriptionPlan) return null;

    const badgeConfig = {
      trial: { color: "blue", label: "Deneme", icon: ClockIcon },
      starter: { color: "green", label: "Başlangıç", icon: StarIcon },
      professional: { color: "purple", label: "Profesyonel", icon: TrophyIcon },
      enterprise: {
        color: "gold",
        label: "Kurumsal",
        icon: BuildingOfficeIcon,
      },
    };

    const config = badgeConfig[user.subscriptionPlan] || badgeConfig.trial;
    const Icon = config.icon;

    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-600" />
              Hesap Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Plan</span>
              {getSubscriptionBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Durum</span>
              <Badge variant={user?.isActive ? "green" : "red"}>
                {user?.isActive ? "Aktif" : "Pasif"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Kullanım İstatistikleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Kullanımı</span>
              <span className="text-sm font-medium">
                {user?.monthlyApiCalls || 0} / {user?.monthlyApiLimit || 1000}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountOverview;
