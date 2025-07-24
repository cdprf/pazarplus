import logger from "../../utils/logger";
/**
 * Invoice Settings Component
 * Dedicated component for managing invoice printing and e-solutions configuration
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import {
  Settings,
  Save,
  TestTube,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAlert } from "../../contexts/AlertContext";
import qnbFinansService from "../../services/qnbFinansService";

const InvoiceSettings = () => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const [settings, setSettings] = useState({
    // QNB Finans e-solutions integration
    qnbFinans: {
      enabled: false,
      environment: "test", // 'test' or 'production'
      apiKey: "",
      clientId: "",
      clientSecret: "",
      autoGenerate: false,
      documentType: "auto", // 'auto', 'einvoice', 'earsiv'
    },
    // Company information for invoices
    company: {
      name: "",
      address: "",
      city: "",
      district: "",
      postalCode: "",
      phone: "",
      email: "",
      taxNumber: "",
      taxOffice: "",
    },
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettingsOnMount = async () => {
      try {
        setLoading(true);

        // Load QNB Finans settings
        const qnbSettings = await qnbFinansService.getSettings();
        if (qnbSettings.success) {
          setSettings((prev) => ({
            ...prev,
            qnbFinans: qnbSettings.data,
          }));
        }
      } catch (error) {
        logger.error("Error loading invoice settings:", error);
        showAlert("Fatura ayarları yüklenirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    loadSettingsOnMount();
  }, [showAlert]);

  const saveSettings = async () => {
    try {
      setLoading(true);

      // Save QNB Finans settings
      const qnbResult = await qnbFinansService.saveSettings(settings.qnbFinans);
      if (qnbResult.success) {
        showAlert("Fatura ayarları başarıyla kaydedildi", "success");
        setConnectionStatus(null); // Reset connection status after settings change
      } else {
        showAlert(`Ayarlar kaydedilemedi: ${qnbResult.message}`, "error");
      }
    } catch (error) {
      logger.error("Error saving invoice settings:", error);
      showAlert(
        `Ayarlar kaydedilirken hata oluştu: ${qnbFinansService.formatErrorMessage(
          error
        )}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const testQNBConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionStatus(null);

      // Validate credentials first
      const validation = qnbFinansService.validateCredentials(
        settings.qnbFinans
      );
      if (!validation.isValid) {
        showAlert(validation.errors.join(", "), "error");
        setConnectionStatus({
          success: false,
          message: validation.errors.join(", "),
        });
        return;
      }

      showAlert("QNB Finans bağlantısı test ediliyor...", "info");

      // Test connection
      const result = await qnbFinansService.testConnection(settings.qnbFinans);
      setConnectionStatus(result);

      if (result.success) {
        showAlert("QNB Finans bağlantısı başarılı", "success");
      } else {
        showAlert(`Bağlantı başarısız: ${result.message}`, "error");
      }
    } catch (error) {
      logger.error("QNB Finans connection test failed:", error);
      const errorMessage = qnbFinansService.formatErrorMessage(error);
      setConnectionStatus({ success: false, message: errorMessage });
      showAlert(`Bağlantı test edilemedi: ${errorMessage}`, "error");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSettingChange = (category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));

    // Reset connection status when credentials change
    if (
      category === "qnbFinans" &&
      ["apiKey", "clientId", "clientSecret", "environment"].includes(field)
    ) {
      setConnectionStatus(null);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Fatura Ayarları
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            QNB Finans e-solutions entegrasyonunu yapılandırın
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </Button>
      </div>

      <Tabs defaultValue="qnbfinans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qnbfinans" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            QNB Finans API
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Şirket Bilgileri
          </TabsTrigger>
        </TabsList>

        {/* QNB Finans Settings */}
        <TabsContent value="qnbfinans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                QNB Finans E-Solutions API
              </CardTitle>
              <CardDescription>
                QNB Finans e-fatura ve e-arşiv entegrasyonunu yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label
                    htmlFor="qnbfinans-enabled"
                    className="text-base font-semibold"
                  >
                    QNB Finans Entegrasyonu
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    QNB Finans API entegrasyonunu etkinleştir
                  </p>
                </div>
                <Switch
                  id="qnbfinans-enabled"
                  checked={settings.qnbFinans.enabled}
                  onCheckedChange={(value) =>
                    handleSettingChange("qnbFinans", "enabled", value)
                  }
                />
              </div>

              {settings.qnbFinans.enabled && (
                <div className="space-y-4 border-t pt-4">
                  {/* Environment Selection */}
                  <div>
                    <Label htmlFor="qnbfinans-environment">Ortam</Label>
                    <Select
                      value={settings.qnbFinans.environment}
                      onValueChange={(value) =>
                        handleSettingChange("qnbFinans", "environment", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test Ortamı</SelectItem>
                        <SelectItem value="production">Canlı Ortam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* API Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qnbfinans-api-key">API Anahtarı</Label>
                      <Input
                        id="qnbfinans-api-key"
                        type="password"
                        value={settings.qnbFinans.apiKey}
                        onChange={(e) =>
                          handleSettingChange(
                            "qnbFinans",
                            "apiKey",
                            e.target.value
                          )
                        }
                        placeholder="API anahtarınızı girin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-id">Client ID</Label>
                      <Input
                        id="client-id"
                        value={settings.qnbFinans.clientId}
                        onChange={(e) =>
                          handleSettingChange(
                            "qnbFinans",
                            "clientId",
                            e.target.value
                          )
                        }
                        placeholder="Client ID'nizi girin"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="client-secret">Client Secret</Label>
                    <Input
                      id="client-secret"
                      type="password"
                      value={settings.qnbFinans.clientSecret}
                      onChange={(e) =>
                        handleSettingChange(
                          "qnbFinans",
                          "clientSecret",
                          e.target.value
                        )
                      }
                      placeholder="Client Secret'inizi girin"
                    />
                  </div>

                  {/* Document Type Selection */}
                  <div>
                    <Label htmlFor="document-type">Belge Tipi</Label>
                    <Select
                      value={settings.qnbFinans.documentType}
                      onValueChange={(value) =>
                        handleSettingChange("qnbFinans", "documentType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          Otomatik (Kurallara Göre)
                        </SelectItem>
                        <SelectItem value="einvoice">
                          Sadece E-Fatura
                        </SelectItem>
                        <SelectItem value="earsiv">Sadece E-Arşiv</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                      Otomatik: Şirketler için e-fatura, bireysel müşteriler
                      için e-arşiv
                    </p>
                  </div>

                  {/* Auto Generate Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="qnbfinans-auto-generate">
                        Otomatik Oluştur
                      </Label>
                      <p className="text-sm text-gray-500">
                        Sipariş tamamlandığında otomatik olarak fatura oluştur
                      </p>
                    </div>
                    <Switch
                      id="qnbfinans-auto-generate"
                      checked={settings.qnbFinans.autoGenerate}
                      onCheckedChange={(value) =>
                        handleSettingChange("qnbFinans", "autoGenerate", value)
                      }
                    />
                  </div>

                  {/* Connection Test */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">
                        Bağlantı Testi
                      </Label>
                      {connectionStatus && (
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            connectionStatus.success
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {connectionStatus.success ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          {connectionStatus.success
                            ? "Bağlantı Başarılı"
                            : "Bağlantı Başarısız"}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={testQNBConnection}
                      disabled={testingConnection}
                      variant="outline"
                      className="w-full"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      {testingConnection
                        ? "Test Ediliyor..."
                        : "Bağlantıyı Test Et"}
                    </Button>
                    {connectionStatus && !connectionStatus.success && (
                      <p className="text-sm text-red-600 mt-2">
                        {connectionStatus.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Information */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Şirket Bilgileri</CardTitle>
              <CardDescription>
                Faturalarda kullanılacak şirket bilgilerini girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-name">Şirket Adı</Label>
                  <Input
                    id="company-name"
                    value={settings.company.name}
                    onChange={(e) =>
                      handleSettingChange("company", "name", e.target.value)
                    }
                    placeholder="Şirket adınız"
                  />
                </div>
                <div>
                  <Label htmlFor="tax-number">Vergi Numarası</Label>
                  <Input
                    id="tax-number"
                    value={settings.company.taxNumber}
                    onChange={(e) =>
                      handleSettingChange(
                        "company",
                        "taxNumber",
                        e.target.value
                      )
                    }
                    placeholder="Vergi numaranız"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tax-office">Vergi Dairesi</Label>
                <Input
                  id="tax-office"
                  value={settings.company.taxOffice}
                  onChange={(e) =>
                    handleSettingChange("company", "taxOffice", e.target.value)
                  }
                  placeholder="Vergi daireniz"
                />
              </div>

              <div>
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={settings.company.address}
                  onChange={(e) =>
                    handleSettingChange("company", "address", e.target.value)
                  }
                  placeholder="Tam adresiniz"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">İl</Label>
                  <Input
                    id="city"
                    value={settings.company.city}
                    onChange={(e) =>
                      handleSettingChange("company", "city", e.target.value)
                    }
                    placeholder="İl"
                  />
                </div>
                <div>
                  <Label htmlFor="district">İlçe</Label>
                  <Input
                    id="district"
                    value={settings.company.district}
                    onChange={(e) =>
                      handleSettingChange("company", "district", e.target.value)
                    }
                    placeholder="İlçe"
                  />
                </div>
                <div>
                  <Label htmlFor="postal-code">Posta Kodu</Label>
                  <Input
                    id="postal-code"
                    value={settings.company.postalCode}
                    onChange={(e) =>
                      handleSettingChange(
                        "company",
                        "postalCode",
                        e.target.value
                      )
                    }
                    placeholder="Posta kodu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={settings.company.phone}
                    onChange={(e) =>
                      handleSettingChange("company", "phone", e.target.value)
                    }
                    placeholder="Telefon numaranız"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.company.email}
                    onChange={(e) =>
                      handleSettingChange("company", "email", e.target.value)
                    }
                    placeholder="E-posta adresiniz"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceSettings;
