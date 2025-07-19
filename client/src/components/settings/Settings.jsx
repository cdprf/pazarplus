import React, { useState, useContext, useEffect } from "react";
import {
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  Cog6ToothIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";
import { AuthContext } from "../../contexts/AuthContext";
import { useAlert } from "../../contexts/AlertContext";
import { Button } from "../ui";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui";
import InvoiceSettings from "./InvoiceSettings";
import AccountOverview from "./AccountOverview";
import TranslationManager from "./TranslationManager";
import api from "../../services/api";

const Settings = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    username: user?.username || "",
    phone: user?.phone || "",
    company: user?.companyName || "",
    bio: user?.bio || "",
    businessType: user?.businessType || "",
    monthlyRevenue: user?.monthlyRevenue || "",
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: false,
    smsNotifications: false,
    browserNotifications: false,
    orderUpdates: true,
    systemAlerts: true,
  });

  // App settings
  const [appSettings, setAppSettings] = useState({
    theme: "light",
    currency: "TRY",
    timezone: "Europe/Istanbul",
    dateFormat: "DD/MM/YYYY",
    language: "tr",
    autoSync: true,
    compactMode: false,
    animations: true,
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.settings.getNotificationSettings();
      if (response.success && response.data) {
        setNotificationSettings(response.data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put("/auth/profile", {
        fullName: profileData.fullName,
        email: profileData.email,
        username: profileData.username,
        phone: profileData.phone,
        company: profileData.company,
        bio: profileData.bio,
        businessType: profileData.businessType,
        monthlyRevenue: profileData.monthlyRevenue,
      });

      if (response.data.success) {
        await updateProfile(response.data.user);
        showAlert("Profil başarıyla güncellendi", "success");
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert("Şifreler eşleşmiyor", "error");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showAlert("Şifre en az 6 karakter olmalıdır", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        showAlert("Şifre başarıyla değiştirildi", "success");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      showAlert(
        error.response?.data?.message || "Şifre değiştirilemedi",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);

    try {
      await api.settings.saveNotificationSettings(notificationSettings);
      showAlert("Bildirim ayarları güncellendi", "success");
    } catch (error) {
      console.error("Notification settings save error:", error);
      showAlert("Bildirim ayarları güncellenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAppSettingsUpdate = async () => {
    setLoading(true);

    try {
      // Save to localStorage for now (until backend API is implemented)
      localStorage.setItem("appSettings", JSON.stringify(appSettings));
      showAlert("Uygulama ayarları güncellendi", "success");

      // Apply theme change immediately if supported
      if (appSettings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (appSettings.theme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        // Auto theme - check system preference
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (prefersDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch (error) {
      console.error("App settings save error:", error);
      showAlert("Uygulama ayarları güncellenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const getThemeIcon = (theme) => {
    switch (theme) {
      case "light":
        return SunIcon;
      case "dark":
        return MoonIcon;
      case "auto":
        return ComputerDesktopIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  const ThemeIcon = getThemeIcon(appSettings.theme);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center">
            <div className="stat-icon stat-icon-primary mr-4">
              <Cog6ToothIcon className="h-8 w-8" />
            </div>
            Ayarlar
          </h1>
          <p className="page-subtitle">
            Hesabınızı ve uygulama tercihlerinizi yönetin
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Cog6ToothIcon className="h-4 w-4" />
            <span>Genel</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <UserIcon className="h-4 w-4" />
            <span>Profil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Güvenlik</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <BellIcon className="h-4 w-4" />
            <span>Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center space-x-2">
            <DocumentTextIcon className="h-4 w-4" />
            <span>Fatura</span>
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="flex items-center space-x-2"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            <span>Tercihler</span>
          </TabsTrigger>
          <TabsTrigger
            value="translations"
            className="flex items-center space-x-2"
          >
            <LanguageIcon className="h-4 w-4" />
            <span>Çeviriler</span>
          </TabsTrigger>
          {process.env.NODE_ENV === "development" && (
            <TabsTrigger
              value="developer"
              className="flex items-center space-x-2"
            >
              <CodeBracketIcon className="h-4 w-4" />
              <span>Geliştirici</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <AccountOverview />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                Profil Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      placeholder="Adınızı ve soyadınızı girin"
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      placeholder="Kullanıcı adınızı girin"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      E-posta Adresi *
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
                      placeholder="E-posta adresinizi girin"
                      className="form-input"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Bu e-posta bildirimler ve hesap kurtarma için
                      kullanılacaktır.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      placeholder="Telefon numaranızı girin"
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şirket
                  </label>
                  <input
                    type="text"
                    value={profileData.company}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        company: e.target.value,
                      })
                    }
                    placeholder="Şirket adınızı girin"
                    className="form-input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      className="form-input"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Aylık Gelir Aralığı
                    </label>
                    <select
                      value={profileData.monthlyRevenue}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          monthlyRevenue: e.target.value,
                        })
                      }
                      className="form-input"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Biyografi
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    placeholder="Kendiniz hakkında kısa bilgi"
                    rows={3}
                    className="form-input"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    icon={CheckIcon}
                    loading={loading}
                  >
                    Profili Güncelle
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-600" />
                Güvenlik Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Şifre Değiştir
                  </h3>
                  <div className="flex items-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <LockClosedIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Güvenliğiniz için güçlü bir şifre seçin ve düzenli olarak
                      değiştirin.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mevcut Şifre *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder="Mevcut şifrenizi girin"
                      className="form-input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showCurrentPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Yeni Şifre *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Yeni şifrenizi girin"
                      className="form-input pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showNewPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Şifre en az 6 karakter olmalıdır.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Yeni Şifre Tekrar *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Yeni şifrenizi tekrar girin"
                      className={`form-input pr-10 ${
                        passwordData.confirmPassword &&
                        passwordData.newPassword !==
                          passwordData.confirmPassword
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordData.confirmPassword &&
                    passwordData.newPassword !==
                      passwordData.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Şifreler eşleşmiyor.
                      </p>
                    )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    icon={CheckIcon}
                    loading={loading}
                  >
                    Şifreyi Değiştir
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BellIcon className="w-5 h-5 mr-2 text-purple-600" />
                Bildirim Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Bildirim Tercihleri
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          E-posta bildirimlerini etkinleştir
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Genel e-posta bildirimlerini al
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BellIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          SMS bildirimleri
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Önemli güncellemeler için SMS al
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.smsNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            smsNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ComputerDesktopIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Tarayıcı bildirimleri
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Tarayıcı push bildirimlerini etkinleştir
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.browserNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            browserNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Sipariş durumu güncellemeleri
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sipariş durumu değişikliklerinde bildirim al
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.orderUpdates}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            orderUpdates: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <GlobeAltIcon className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Sistem uyarıları
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Platform bağlantı ve sistem uyarılarını al
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.systemAlerts}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            systemAlerts: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleNotificationUpdate}
                  variant="primary"
                  icon={CheckIcon}
                  loading={loading}
                >
                  Bildirimleri Güncelle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoices">
          <InvoiceSettings />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cog6ToothIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Uygulama Tercihleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tema
                  </label>
                  <div className="relative">
                    <select
                      value={appSettings.theme}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          theme: e.target.value,
                        })
                      }
                      className="form-input pl-10"
                    >
                      <option value="light">Açık</option>
                      <option value="dark">Koyu</option>
                      <option value="auto">Otomatik (Sistem)</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ThemeIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Uygulama için tercih ettiğiniz temayı seçin.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Para Birimi
                  </label>
                  <select
                    value={appSettings.currency}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        currency: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="TRY">TRY - Türk Lirası</option>
                    <option value="USD">USD - Amerikan Doları</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - İngiliz Sterlini</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Fiyatları görüntülemek için varsayılan para birimi.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Saat Dilimi
                  </label>
                  <select
                    value={appSettings.timezone}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        timezone: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="Europe/Istanbul">
                      Türkiye Saati (GMT+3)
                    </option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Doğu Saati</option>
                    <option value="America/Chicago">Merkez Saati</option>
                    <option value="America/Denver">Dağ Saati</option>
                    <option value="America/Los_Angeles">Pasifik Saati</option>
                    <option value="Europe/London">Londra Saati</option>
                    <option value="Europe/Berlin">Berlin Saati</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Tarih ve saatleri görüntülemek için saat dilimi.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tarih Formatı
                  </label>
                  <select
                    value={appSettings.dateFormat}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        dateFormat: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Uygulama boyunca tarihlerin nasıl görüntüleneceği.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dil
                  </label>
                  <select
                    value={appSettings.language}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        language: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Arayüz dili (uygulamak için yenileme gerekir).
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Davranış Ayarları
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Otomatik Senkronizasyon
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Platform verilerini otomatik olarak senkronize et
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appSettings.autoSync}
                        onChange={(e) =>
                          setAppSettings({
                            ...appSettings,
                            autoSync: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Kompakt Mod
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Daha az boşluk ile sıkışık görünüm
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appSettings.compactMode}
                        onChange={(e) =>
                          setAppSettings({
                            ...appSettings,
                            compactMode: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Animasyonlar
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Arayüz animasyonlarını etkinleştir
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appSettings.animations}
                        onChange={(e) =>
                          setAppSettings({
                            ...appSettings,
                            animations: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleAppSettingsUpdate}
                  variant="primary"
                  icon={CheckIcon}
                  loading={loading}
                >
                  Tercihleri Güncelle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Translation Management Tab */}
        <TabsContent value="translations">
          <TranslationManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
