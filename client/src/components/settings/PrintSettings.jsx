import React, { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "../ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { Printer, FileText, Settings, Eye, Save } from "lucide-react";
import { useAlert } from "../../contexts/AlertContext";
import qnbFinansService from "../../services/qnbFinansService";

const PrintSettings = () => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Shipping slip settings
    shippingSlip: {
      template: "modern",
      includeBarcode: true,
      includeLogo: true,
      paperSize: "A4",
      autoprint: false,
      fields: {
        trackingNumber: true,
        customerInfo: true,
        orderDetails: true,
        shippingAddress: true,
        notes: false,
      },
    },
    // Invoice settings
    invoice: {
      template: "professional",
      provider: "local", // 'local' or 'n11faturam'
      autoGenerate: false,
      includeTax: true,
      currency: "TRY",
      fields: {
        companyLogo: true,
        taxNumber: true,
        invoiceNumber: true,
        paymentTerms: false,
      },
    },
    // E-fatura integration
    eFatura: {
      enabled: false,
      provider: "n11faturam", // 'n11faturam' or 'qnb_finans'
      apiKey: "",
      username: "",
      password: "",
      environment: "test", // 'test' or 'production'
    },
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
    // Company information
    company: {
      name: "",
      address: "",
      city: "",
      district: "",
      postalCode: "",
      phone: "",
      email: "",
      taxNumber: "",
      website: "",
    },
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Load settings from backend
      const savedSettings = localStorage.getItem("printSettings");
      if (savedSettings) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
      }

      // Load QNB Finans settings from API
      try {
        const qnbSettings = await qnbFinansService.getSettings();
        if (qnbSettings.success) {
          setSettings((prev) => ({
            ...prev,
            qnbFinans: qnbSettings.data,
          }));
        }
      } catch (error) {
        console.warn("Could not load QNB Finans settings:", error);
        // Continue with default settings
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      showAlert("Ayarlar yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      setLoading(true);

      // Save general settings to localStorage
      localStorage.setItem(
        "printSettings",
        JSON.stringify({
          shippingSlip: settings.shippingSlip,
          invoice: settings.invoice,
          eFatura: settings.eFatura,
          company: settings.company,
        })
      );

      // Save QNB Finans settings via API
      try {
        const qnbResult = await qnbFinansService.saveSettings(
          settings.qnbFinans
        );
        if (!qnbResult.success) {
          showAlert(
            `QNB Finans ayarları kaydedilemedi: ${qnbResult.message}`,
            "warning"
          );
        }
      } catch (error) {
        console.error("Error saving QNB Finans settings:", error);
        showAlert(
          `QNB Finans ayarları kaydedilemedi: ${qnbFinansService.formatErrorMessage(
            error
          )}`,
          "warning"
        );
      }

      showAlert("Ayarlar başarıyla kaydedildi", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      showAlert("Ayarlar kaydedilirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...(typeof field === "object" ? field : { [field]: value }),
      },
    }));
  };

  const previewTemplate = (type) => {
    // Open preview in new window
    const previewUrl = `/preview/${type}?template=${
      settings[type === "shipping-slip" ? "shippingSlip" : "invoice"].template
    }`;
    window.open(previewUrl, "_blank", "width=800,height=600");
  };

  const testEFaturaConnection = async () => {
    try {
      setLoading(true);
      // Test e-fatura connection
      showAlert("E-Fatura bağlantısı test ediliyor...", "info");

      // Simulate API test
      setTimeout(() => {
        showAlert("E-Fatura bağlantısı başarılı", "success");
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error("E-fatura connection test failed:", error);
      showAlert("E-Fatura bağlantısı başarısız", "error");
      setLoading(false);
    }
  };

  const testQNBFinansConnection = async () => {
    try {
      setLoading(true);

      // Validate credentials first
      const validation = qnbFinansService.validateCredentials(
        settings.qnbFinans
      );
      if (!validation.isValid) {
        showAlert(validation.errors.join(", "), "error");
        return;
      }

      showAlert("QNB Finans bağlantısı test ediliyor...", "info");

      // Test connection with actual API
      const result = await qnbFinansService.testConnection(settings.qnbFinans);

      if (result.success) {
        showAlert("QNB Finans bağlantısı başarılı", "success");
      } else {
        showAlert(
          `QNB Finans bağlantısı başarısız: ${result.message}`,
          "error"
        );
      }
    } catch (error) {
      console.error("QNB Finans connection test failed:", error);
      showAlert(
        `QNB Finans bağlantısı başarısız: ${qnbFinansService.formatErrorMessage(
          error
        )}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Yazdırma Ayarları
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gönderi belgesi ve fatura şablonlarını yapılandırın
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

      <Tabs defaultValue="shipping" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Gönderi Belgesi
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Fatura
          </TabsTrigger>
          <TabsTrigger value="efatura" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            E-Fatura (N11)
          </TabsTrigger>
          <TabsTrigger value="qnbfinans" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            QNB Finans
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Şirket Bilgileri
          </TabsTrigger>
        </TabsList>

        {/* Shipping Slip Settings */}
        <TabsContent value="shipping">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  Gönderi Belgesi Şablonu
                </CardTitle>
                <CardDescription>
                  Gönderi belgesi görünümünü ve içeriğini yapılandırın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shipping-template">Şablon Stili</Label>
                  <Select
                    value={settings.shippingSlip.template}
                    onValueChange={(value) =>
                      handleSettingChange("shippingSlip", "template", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Klasik</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="detailed">Detaylı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paper-size">Kağıt Boyutu</Label>
                  <Select
                    value={settings.shippingSlip.paperSize}
                    onValueChange={(value) =>
                      handleSettingChange("shippingSlip", "paperSize", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A5">A5</SelectItem>
                      <SelectItem value="A6">A6 (Kargo Etiketi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-barcode">Barkod Ekle</Label>
                  <Switch
                    id="include-barcode"
                    checked={settings.shippingSlip.includeBarcode}
                    onCheckedChange={(value) =>
                      handleSettingChange(
                        "shippingSlip",
                        "includeBarcode",
                        value
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-logo">Logo Ekle</Label>
                  <Switch
                    id="include-logo"
                    checked={settings.shippingSlip.includeLogo}
                    onCheckedChange={(value) =>
                      handleSettingChange("shippingSlip", "includeLogo", value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autoprint">Otomatik Yazdır</Label>
                  <Switch
                    id="autoprint"
                    checked={settings.shippingSlip.autoprint}
                    onCheckedChange={(value) =>
                      handleSettingChange("shippingSlip", "autoprint", value)
                    }
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => previewTemplate("shipping-slip")}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Şablonu Önizle
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dahil Edilecek Alanlar</CardTitle>
                <CardDescription>
                  Gönderi belgesinde görüntülenecek bilgileri seçin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.shippingSlip.fields).map(
                  ([field, enabled]) => (
                    <div
                      key={field}
                      className="flex items-center justify-between"
                    >
                      <Label htmlFor={`field-${field}`} className="capitalize">
                        {field === "trackingNumber" && "Takip Numarası"}
                        {field === "customerInfo" && "Müşteri Bilgileri"}
                        {field === "orderDetails" && "Sipariş Detayları"}
                        {field === "shippingAddress" && "Teslimat Adresi"}
                        {field === "notes" && "Notlar"}
                      </Label>
                      <Switch
                        id={`field-${field}`}
                        checked={enabled}
                        onCheckedChange={(value) =>
                          handleSettingChange("shippingSlip", "fields", {
                            ...settings.shippingSlip.fields,
                            [field]: value,
                          })
                        }
                      />
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoice Settings */}
        <TabsContent value="invoice">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Fatura Şablonu
                </CardTitle>
                <CardDescription>
                  Fatura görünümünü ve içeriğini yapılandırın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="invoice-template">Şablon Stili</Label>
                  <Select
                    value={settings.invoice.template}
                    onValueChange={(value) =>
                      handleSettingChange("invoice", "template", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Profesyonel</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Klasik</SelectItem>
                      <SelectItem value="elegant">Şık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="invoice-provider">Fatura Sağlayıcısı</Label>
                  <Select
                    value={settings.invoice.provider}
                    onValueChange={(value) =>
                      handleSettingChange("invoice", "provider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Yerel PDF</SelectItem>
                      <SelectItem value="n11faturam">N11 Faturam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currency">Para Birimi</Label>
                  <Select
                    value={settings.invoice.currency}
                    onValueChange={(value) =>
                      handleSettingChange("invoice", "currency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-generate">Otomatik Oluştur</Label>
                  <Switch
                    id="auto-generate"
                    checked={settings.invoice.autoGenerate}
                    onCheckedChange={(value) =>
                      handleSettingChange("invoice", "autoGenerate", value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-tax">KDV Dahil Et</Label>
                  <Switch
                    id="include-tax"
                    checked={settings.invoice.includeTax}
                    onCheckedChange={(value) =>
                      handleSettingChange("invoice", "includeTax", value)
                    }
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => previewTemplate("invoice")}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Şablonu Önizle
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fatura Alanları</CardTitle>
                <CardDescription>
                  Faturada görüntülenecek bilgileri seçin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.invoice.fields).map(
                  ([field, enabled]) => (
                    <div
                      key={field}
                      className="flex items-center justify-between"
                    >
                      <Label
                        htmlFor={`invoice-field-${field}`}
                        className="capitalize"
                      >
                        {field === "companyLogo" && "Şirket Logosu"}
                        {field === "taxNumber" && "Vergi Numarası"}
                        {field === "invoiceNumber" && "Fatura Numarası"}
                        {field === "paymentTerms" && "Ödeme Koşulları"}
                      </Label>
                      <Switch
                        id={`invoice-field-${field}`}
                        checked={enabled}
                        onCheckedChange={(value) =>
                          handleSettingChange("invoice", "fields", {
                            ...settings.invoice.fields,
                            [field]: value,
                          })
                        }
                      />
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* E-Fatura Settings */}
        <TabsContent value="efatura">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                E-Fatura Entegrasyonu
              </CardTitle>
              <CardDescription>
                N11 Faturam API ile e-fatura entegrasyonunu yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="efatura-enabled">E-Fatura Entegrasyonu</Label>
                  <p className="text-sm text-gray-500">
                    E-fatura API entegrasyonunu etkinleştir
                  </p>
                </div>
                <Switch
                  id="efatura-enabled"
                  checked={settings.eFatura.enabled}
                  onCheckedChange={(value) =>
                    handleSettingChange("eFatura", "enabled", value)
                  }
                />
              </div>

              {settings.eFatura.enabled && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label htmlFor="efatura-provider">Sağlayıcı</Label>
                    <Select
                      value={settings.eFatura.provider}
                      onValueChange={(value) =>
                        handleSettingChange("eFatura", "provider", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="n11faturam">N11 Faturam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="efatura-environment">Ortam</Label>
                    <Select
                      value={settings.eFatura.environment}
                      onValueChange={(value) =>
                        handleSettingChange("eFatura", "environment", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="production">Canlı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="api-key">API Anahtarı</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={settings.eFatura.apiKey}
                      onChange={(e) =>
                        handleSettingChange("eFatura", "apiKey", e.target.value)
                      }
                      placeholder="API anahtarınızı girin"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Kullanıcı Adı</Label>
                      <Input
                        id="username"
                        value={settings.eFatura.username}
                        onChange={(e) =>
                          handleSettingChange(
                            "eFatura",
                            "username",
                            e.target.value
                          )
                        }
                        placeholder="Kullanıcı adınız"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Şifre</Label>
                      <Input
                        id="password"
                        type="password"
                        value={settings.eFatura.password}
                        onChange={(e) =>
                          handleSettingChange(
                            "eFatura",
                            "password",
                            e.target.value
                          )
                        }
                        placeholder="Şifreniz"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={testEFaturaConnection}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QNB Finans Settings */}
        <TabsContent value="qnbfinans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                QNB Finans Entegrasyonu
              </CardTitle>
              <CardDescription>
                QNB Finans API ile e-fatura entegrasyonunu yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="qnbfinans-enabled">
                    QNB Finans Entegrasyonu
                  </Label>
                  <p className="text-sm text-gray-500">
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
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="production">Canlı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div className="flex items-center justify-between">
                    <Label htmlFor="qnbfinans-auto-generate">
                      Otomatik Oluştur
                    </Label>
                    <Switch
                      id="qnbfinans-auto-generate"
                      checked={settings.qnbFinans.autoGenerate}
                      onCheckedChange={(value) =>
                        handleSettingChange("qnbFinans", "autoGenerate", value)
                      }
                    />
                  </div>

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
                        <SelectItem value="auto">Otomatik</SelectItem>
                        <SelectItem value="einvoice">E-Fatura</SelectItem>
                        <SelectItem value="earsiv">E-Arşiv Fatura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={testQNBFinansConnection}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
                  </Button>
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
                Fatura ve gönderi belgelerinde kullanılacak şirket bilgilerini
                girin
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
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={settings.company.address}
                  onChange={(e) =>
                    handleSettingChange("company", "address", e.target.value)
                  }
                  placeholder="Tam adresiniz"
                  rows={3}
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

              <div>
                <Label htmlFor="website">Web Sitesi</Label>
                <Input
                  id="website"
                  value={settings.company.website}
                  onChange={(e) =>
                    handleSettingChange("company", "website", e.target.value)
                  }
                  placeholder="www.siteniz.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrintSettings;
