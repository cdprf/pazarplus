import logger from "../../utils/logger.js";
import React, { useState, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CreditCardIcon,
  ChartBarIcon,
  CogIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  BellIcon,
  StarIcon,
  TrophyIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { Button } from "../ui";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "../ui";
import api from "../../services/api";

const Profile = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    username: user?.username || "",
    phone: user?.phone || "",
    companyName: user?.companyName || "",
    bio: user?.bio || "",
    businessType: user?.businessType || "",
    monthlyRevenue: user?.monthlyRevenue || "",
  });

  // Fetch latest user data when component mounts
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await api.get("/auth/profile");
      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setProfileData({
          fullName: userData.fullName || "",
          email: userData.email || "",
          username: userData.username || "",
          phone: userData.phone || "",
          companyName: userData.companyName || "",
          bio: userData.bio || "",
          businessType: userData.businessType || "",
          monthlyRevenue: userData.monthlyRevenue || "",
        });
      }
    } catch (error) {
      logger.error("Failed to fetch profile:", error);
      showAlert("Profil bilgileri yüklenemedi", "error");
    }
  }, [showAlert]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put("/auth/profile", {
        fullName: profileData.fullName,
        email: profileData.email,
        username: profileData.username,
        phone: profileData.phone,
        company: profileData.companyName,
        bio: profileData.bio,
        businessType: profileData.businessType,
        monthlyRevenue: profileData.monthlyRevenue,
      });

      if (response.data.success) {
        await updateProfile(response.data.user);
        showAlert("Profil başarıyla güncellendi", "success");
        setEditing(false);
        // Refresh user data
        await fetchUserProfile();
      }
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Profil güncellenirken hata oluştu",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

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

  const getTrialInfo = () => {
    if (!user?.isInTrialPeriod && user?.subscriptionPlan === "trial") {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-amber-600 mr-2" />
            <span className="text-amber-800 font-medium">
              Deneme süreniz sona ermiş. Hizmete devam etmek için plan seçin.
            </span>
          </div>
        </div>
      );
    }

    if (user?.trialDaysRemaining > 0) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800">
              Deneme süreniz: {user.trialDaysRemaining} gün kaldı
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const getActivityStatus = () => {
    if (!user?.lastActivityAt) return "Bilinmiyor";

    try {
      const lastActivity = new Date(user.lastActivityAt);

      // Check if the date is valid
      if (isNaN(lastActivity.getTime())) {
        return "Bilinmiyor";
      }

      const now = new Date();
      const diffTime = now.getTime() - lastActivity.getTime();

      // Check for negative time difference (future date)
      if (diffTime < 0) {
        return "Bilinmiyor";
      }

      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

      if (diffHours < 1) return "Az önce aktif";
      if (diffHours < 24) return `${diffHours} saat önce aktif`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} gün önce aktif`;
    } catch (error) {
      logger.error("Error calculating activity status:", error);
      return "Bilinmiyor";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profil</h1>
              <p className="text-gray-600 mt-1">
                Hesap bilgilerinizi görüntüleyin ve düzenleyin
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                className="flex items-center"
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Ayarlar
              </Button>
              {!editing ? (
                <Button
                  onClick={() => setEditing(true)}
                  className="flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Düzenle
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      fetchUserProfile(); // Reset form
                    }}
                    className="flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    İptal
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trial Information */}
        {getTrialInfo()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Kişisel Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ad Soyad *
                        </label>
                        <input
                          type="text"
                          value={profileData.fullName}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              fullName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kullanıcı Adı *
                        </label>
                        <input
                          type="text"
                          value={profileData.username}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              username: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-posta *
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şirket
                      </label>
                      <input
                        type="text"
                        value={profileData.companyName}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            companyName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İş Türü
                        </label>
                        <select
                          value={profileData.businessType}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              businessType: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seçin</option>
                          <option value="individual">Bireysel</option>
                          <option value="small_business">Küçük İşletme</option>
                          <option value="medium_business">
                            Orta Ölçekli İşletme
                          </option>
                          <option value="enterprise">Kurumsal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Aylık Gelir
                        </label>
                        <select
                          value={profileData.monthlyRevenue}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              monthlyRevenue: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seçin</option>
                          <option value="0-10k">0-10.000 TL</option>
                          <option value="10k-50k">10.000-50.000 TL</option>
                          <option value="50k-100k">50.000-100.000 TL</option>
                          <option value="100k-500k">100.000-500.000 TL</option>
                          <option value="500k+">500.000+ TL</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hakkında
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            bio: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Kendiniz ve işiniz hakkında kısa bilgi..."
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={loading}
                        className="flex items-center"
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Kaydet
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Ad Soyad</p>
                          <p className="font-medium">
                            {user?.fullName || "Belirtilmemiş"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">E-posta</p>
                          <p className="font-medium">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center">
                        <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Telefon</p>
                          <p className="font-medium">
                            {user?.phone || "Belirtilmemiş"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500">Şirket</p>
                          <p className="font-medium">
                            {user?.companyName || "Belirtilmemiş"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {user?.bio && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Hakkında</p>
                        <p className="text-gray-700">{user.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    E-posta Doğrulama
                  </span>
                  <Badge variant={user?.emailVerified ? "green" : "orange"}>
                    {user?.emailVerified ? "Doğrulanmış" : "Bekliyor"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Son Aktivite</span>
                  <span className="text-xs text-gray-500">
                    {getActivityStatus()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartBarIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Özet İstatistikler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    API Kullanımı (Aylık)
                  </span>
                  <span className="text-sm font-medium">
                    {user?.monthlyApiCalls || 0} /{" "}
                    {user?.monthlyApiLimit || 1000}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Kayıt Tarihi</span>
                  <span className="text-xs text-gray-500">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("tr-TR")
                      : "Bilinmiyor"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Son Giriş</span>
                  <span className="text-xs text-gray-500">
                    {user?.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString("tr-TR")
                      : "Bilinmiyor"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Hızlı Eylemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate("/settings/security")}
                >
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Güvenlik Ayarları
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate("/settings/notifications")}
                >
                  <BellIcon className="h-4 w-4 mr-2" />
                  Bildirim Ayarları
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate("/settings/invoices")}
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Fatura Ayarları
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
