import React, { useState } from "react";
import {
  Settings,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  TestTube,
  Plug,
  Info,
  AlertTriangle,
  Activity,
  Shield,
} from "lucide-react";
import { usePlatforms } from "../../hooks/usePlatforms";
import { useAlert } from "../../contexts/AlertContext";
import api from "../../services/api";
import logger from "../../utils/logger";
import { Button, Card, CardContent, Badge, Modal } from "../ui";

const PlatformConnections = () => {
  const { showAlert } = useAlert();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [connectionData, setConnectionData] = useState({
    apiKey: "",
    apiSecret: "",
    supplierId: "",
    merchantId: "",
    accessKey: "",
    secretKey: "",
    marketplaceId: "",
    apiUrl: "",
    username: "",
    environment: "production",
  });

  const { data: platforms = [], isLoading, error, refetch } = usePlatforms();

  const availablePlatforms = [
    {
      id: "hepsiburada",
      name: "Hepsiburada",
      description: "Türkiye'nin önde gelen e-ticaret platformu",
      icon: "🛍️",
      color: "warning",
      fields: ["username", "merchantId", "apiKey", "environment"],
    },
    {
      id: "trendyol",
      name: "Trendyol",
      description: "Popüler Türk pazaryeri",
      icon: "🛒",
      color: "primary",
      fields: ["apiKey", "apiSecret", "supplierId", "environment"],
    },
    {
      id: "amazon",
      name: "Amazon",
      description: "Küresel pazaryeri platformu",
      icon: "📦",
      color: "warning",
      fields: ["accessKey", "secretKey", "merchantId", "marketplaceId"],
    },
    {
      id: "n11",
      name: "N11",
      description: "Türk online pazaryeri",
      icon: "🏪",
      color: "info",
      fields: ["apiKey", "apiSecret"],
    },
  ];

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return "Mevcut değil";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Geçersiz tarih";

      return date.toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      // Log error using proper logger instead of console
      logger.error("Date formatting error:", error);
      return "Geçersiz tarih";
    }
  };

  // Helper function to get platform info
  const getPlatformInfo = (platformType) => {
    return (
      availablePlatforms.find((p) => p.id === platformType) || {
        name: platformType,
        description: "Platform bağlantısı",
        icon: "🔗",
        color: "secondary",
      }
    );
  };

  const handleConnect = (platform) => {
    if (!platform) {
      showAlert("Platform bilgisi bulunamadı", "error");
      return;
    }

    setSelectedPlatform(platform);
    setConnectionData({
      apiKey: "",
      apiSecret: "",
      supplierId: "",
      merchantId: "",
      accessKey: "",
      secretKey: "",
      marketplaceId: "",
      apiUrl: "",
      username: "",
      environment: "production",
    });

    // Force close the modal first, then open it
    setShowModal(false);
    setTimeout(() => {
      setShowModal(true);
    }, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Filter out empty fields to reduce payload size
      const filteredConnectionData = Object.fromEntries(
        Object.entries(connectionData).filter(
          ([_, value]) => value && value.trim() !== ""
        )
      );

      // Create payload matching backend expectations
      const payload = {
        platformType: selectedPlatform.id,
        name: `${selectedPlatform.name} Bağlantısı`,
        credentials: filteredConnectionData,
        environment: connectionData.environment || "production",
        isActive: true,
      };

      logger.info("📤 Sending platform connection request:", {
        url: "/api/platforms/connections",
        method: "POST",
        payload: { ...payload, credentials: "[REDACTED]" },
      });

      const response = await api.post("/platforms/connections", payload);

      logger.info("✅ Platform connected successfully:", response.data);

      setShowModal(false);
      showAlert("Platform başarıyla bağlandı", "success");
      if (typeof refetch === "function") {
        refetch();
      }
    } catch (error) {
      logger.error("❌ Failed to connect platform:", error);
      showAlert(
        `Platform bağlantısı başarısız: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const handleDisconnect = async (platformId) => {
    if (!window.confirm("Bu platformu gerçekten kesmek istiyor musunuz?")) {
      return;
    }

    try {
      logger.info("🗑️ Disconnecting platform:", platformId);

      const response = await api.delete(`/platforms/connections/${platformId}`);

      logger.info("✅ Platform disconnected successfully:", response.data);

      showAlert("Platform bağlantısı kesildi", "success");
      if (typeof refetch === "function") {
        refetch();
      }
    } catch (error) {
      logger.error("❌ Failed to disconnect platform:", error);
      showAlert(
        `Platform bağlantısı kesilemedi: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const testConnection = async (platformId) => {
    try {
      logger.info("🧪 Testing platform connection:", platformId);

      const response = await api.post(
        `/platforms/connections/${platformId}/test`
      );

      logger.info("✅ Connection test completed:", response.data);

      if (response.data.success) {
        showAlert("Bağlantı testi başarılı!", "success");
      } else {
        showAlert(
          `Bağlantı testi başarısız: ${response.data.message}`,
          "error"
        );
      }

      if (typeof refetch === "function") {
        refetch();
      }
    } catch (error) {
      logger.error("❌ Connection test failed:", error);
      showAlert(
        `Bağlantı testi başarısız: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      pending: "warning",
      error: "danger",
      testing: "info",
      suspended: "secondary",
    };

    return variants[status] || "secondary";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return CheckCircle;
      case "inactive":
        return XCircle;
      case "pending":
        return Activity;
      case "error":
        return AlertTriangle;
      case "testing":
        return TestTube;
      default:
        return XCircle;
    }
  };

  // Enhanced connection status display
  const getConnectionStatus = (platform) => {
    const lastSync = platform.lastSyncAt
      ? formatDate(platform.lastSyncAt)
      : "Hiçbir zaman";
    const lastTested = platform.lastTestedAt
      ? formatDate(platform.lastTestedAt)
      : "Hiçbir zaman";

    return {
      status: platform.status || "unknown",
      environment: platform.environment || "production",
      lastSync,
      lastTested,
      isActive: platform.isActive !== false,
      errorCount: platform.errorCount || 0,
    };
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Platform bağlantıları yükleniyor...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Platform Yükleme Hatası
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Platform bağlantıları yüklenemedi: {error.message}
            </p>
            <Button onClick={refetch} variant="outline">
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Bağlantıları</h1>
          <p className="page-subtitle">
            E-ticaret platformlarınızı bağlayarak sipariş yönetimine başlayın
          </p>
        </div>
      </div>

      {/* Connected Platforms */}
      {platforms.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Bağlı Platformlar ({platforms.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((platform) => {
              const platformInfo = getPlatformInfo(platform.platformType);
              const connectionStatus = getConnectionStatus(platform);
              const StatusIcon = getStatusIcon(connectionStatus.status);

              return (
                <Card key={platform.id} className="h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">{platformInfo.icon}</div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {platform.name || platformInfo.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {platform.platformType}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant={getStatusVariant(connectionStatus.status)}
                          icon={StatusIcon}
                        >
                          {connectionStatus.status === "active"
                            ? "Aktif"
                            : connectionStatus.status === "inactive"
                            ? "Pasif"
                            : connectionStatus.status === "pending"
                            ? "Bekliyor"
                            : connectionStatus.status === "error"
                            ? "Hata"
                            : connectionStatus.status === "testing"
                            ? "Test Ediliyor"
                            : connectionStatus.status}
                        </Badge>
                        {connectionStatus.environment !== "production" && (
                          <Badge variant="info">
                            {connectionStatus.environment.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {platform.description || platformInfo.description}
                    </p>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Bağlandı:
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {formatDate(platform.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Son Güncelleme:
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {formatDate(platform.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Durum:
                        </span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {connectionStatus.isActive ? "Aktif" : "Pasif"}
                          {connectionStatus.errorCount > 0 && (
                            <span className="text-red-600 dark:text-red-400 ml-1">
                              ({connectionStatus.errorCount} hata)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Settings}
                        onClick={() =>
                          (window.location.href = `/platforms/${platform.id}/settings`)
                        }
                        className="w-full"
                      >
                        Ayarlar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={TestTube}
                        onClick={() => testConnection(platform.id)}
                        className="w-full"
                      >
                        Bağlantıyı Test Et
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Unlink}
                        onClick={() => handleDisconnect(platform.id)}
                        className="w-full text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Bağlantıyı Kes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Connections State */}
      {platforms.length === 0 && (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-32 w-32 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6">
              <Link className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Platform Bağlantısı Yok
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Henüz hiçbir platform bağlamadınız. Aşağıdaki mevcut
              platformlardan birine bağlanarak başlayın.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Available Platforms */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Mevcut Platformlar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlatforms
            .filter(
              (platform) =>
                !platforms.some((p) => p.platformType === platform.id)
            )
            .map((platform) => (
              <Card key={platform.id} className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">{platform.icon}</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {platform.name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {platform.description}
                  </p>
                  <Button
                    variant={platform.color || "primary"}
                    onClick={() => handleConnect(platform)}
                    icon={Plug}
                    className="w-full"
                  >
                    Bağlan
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Connection Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${selectedPlatform?.name} Platformuna Bağlan`}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-6">
            <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {selectedPlatform?.name} API kimlik bilgilerinizi girerek
                mağazanızı bağlayın.
              </p>
            </div>
          </div>

          {/* Environment Selection for supported platforms */}
          {selectedPlatform?.fields.includes("environment") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ortam
              </label>
              <select
                value={connectionData.environment}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    environment: e.target.value,
                  })
                }
                required
                className="form-input"
              >
                <option value="production">Üretim</option>
                <option value="test">Test</option>
                <option value="sandbox">Sandbox</option>
                <option value="staging">Staging</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Platform bağlantınız için ortamı seçin
              </p>
            </div>
          )}

          {selectedPlatform?.fields.includes("apiKey") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Anahtarı *
              </label>
              <input
                type="text"
                value={connectionData.apiKey}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    apiKey: e.target.value,
                  })
                }
                required
                className="form-input"
                placeholder="API anahtarınızı girin"
              />
            </div>
          )}

          {selectedPlatform?.fields.includes("username") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                value={connectionData.username}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    username: e.target.value,
                  })
                }
                placeholder="Hepsiburada kullanıcı adınız"
                required
                className="form-input"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Hepsiburada hesap kullanıcı adınızı girin
              </p>
            </div>
          )}

          {selectedPlatform?.fields.includes("apiSecret") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Gizli Anahtarı *
              </label>
              <input
                type="password"
                value={connectionData.apiSecret}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    apiSecret: e.target.value,
                  })
                }
                required
                className="form-input"
                placeholder="API gizli anahtarınızı girin"
              />
            </div>
          )}

          {selectedPlatform?.fields.includes("accessKey") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Erişim Anahtarı *
              </label>
              <input
                type="text"
                value={connectionData.accessKey}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    accessKey: e.target.value,
                  })
                }
                required
                className="form-input"
                placeholder="Erişim anahtarınızı girin"
              />
            </div>
          )}

          {selectedPlatform?.fields.includes("secretKey") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gizli Anahtar *
              </label>
              <input
                type="password"
                value={connectionData.secretKey}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    secretKey: e.target.value,
                  })
                }
                required
                className="form-input"
                placeholder="Gizli anahtarınızı girin"
              />
            </div>
          )}

          {selectedPlatform?.fields.includes("supplierId") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tedarikçi ID *
              </label>
              <input
                type="text"
                value={connectionData.supplierId}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    supplierId: e.target.value,
                  })
                }
                placeholder="Trendyol Tedarikçi ID'niz"
                required
                className="form-input"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tedarikçi ID'nizi Trendyol Partner Panelinde bulabilirsiniz
              </p>
            </div>
          )}

          {selectedPlatform?.fields.includes("merchantId") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Satıcı ID *
              </label>
              <input
                type="text"
                value={connectionData.merchantId}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    merchantId: e.target.value,
                  })
                }
                required
                className="form-input"
                placeholder="Satıcı ID'nizi girin"
              />
            </div>
          )}

          {selectedPlatform?.fields.includes("marketplaceId") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pazaryeri ID *
              </label>
              <input
                type="text"
                value={connectionData.marketplaceId}
                onChange={(e) =>
                  setConnectionData({
                    ...connectionData,
                    marketplaceId: e.target.value,
                  })
                }
                placeholder="örn. ATVPDKIKX0DER (ABD için)"
                required
                className="form-input"
              />
            </div>
          )}

          <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Kimlik bilgileriniz şifrelenir ve güvenli bir şekilde saklanır.
              Sadece siparişlerinizi senkronize etmek için kullanırız.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={() => setShowModal(false)}
              variant="outline"
            >
              İptal
            </Button>
            <Button type="submit" variant="primary" icon={Plug}>
              Platformu Bağla
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlatformConnections;
