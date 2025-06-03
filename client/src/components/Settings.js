import React, { useState, useEffect } from "react";
import {
  FiSave,
  FiUser,
  FiBell,
  FiMail,
  FiTruck,
  FiSettings,
  FiUpload,
  FiCheck,
  FiX,
} from "react-icons/fi";
import api from "../services/api";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [message, setMessage] = useState("");

  // Settings state
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
    logo: "",
  });

  const [generalSettings, setGeneralSettings] = useState({
    timezone: "Europe/Istanbul",
    currency: "TRY",
    language: "tr",
    dateFormat: "DD/MM/YYYY",
    autoSync: true,
    syncInterval: 15,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderAlerts: true,
    lowStockAlerts: true,
    systemUpdates: false,
    marketingEmails: false,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "",
    encryption: "tls",
  });

  const [shippingSettings, setShippingSettings] = useState({
    defaultCarrier: "",
    freeShippingThreshold: 100,
    shippingCalculation: "weight",
    packageDimensions: {
      length: 0,
      width: 0,
      height: 0,
    },
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load all settings in parallel
      const [company, general, notifications, email, shipping] =
        await Promise.allSettled([
          api.settings.getCompanyInfo(),
          api.settings.getGeneralSettings(),
          api.settings.getNotificationSettings(),
          api.settings.getEmailSettings(),
          api.settings.getShippingSettings(),
        ]);

      // Update state with loaded data, using fallbacks for failed requests
      if (company.status === "fulfilled" && company.value?.success) {
        setCompanyInfo((prev) => ({ ...prev, ...company.value.data }));
      }

      if (general.status === "fulfilled" && general.value?.success) {
        setGeneralSettings((prev) => ({ ...prev, ...general.value.data }));
      }

      if (
        notifications.status === "fulfilled" &&
        notifications.value?.success
      ) {
        setNotificationSettings((prev) => ({
          ...prev,
          ...notifications.value.data,
        }));
      }

      if (email.status === "fulfilled" && email.value?.success) {
        setEmailSettings((prev) => ({ ...prev, ...email.value.data }));
      }

      if (shipping.status === "fulfilled" && shipping.value?.success) {
        setShippingSettings((prev) => ({ ...prev, ...shipping.value.data }));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      showMessage("Settings yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = "success") => {
    setSaveStatus(type);
    setMessage(text);
    setTimeout(() => {
      setSaveStatus(null);
      setMessage("");
    }, 3000);
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      const response = await api.settings.saveCompanyInfo(companyInfo);
      if (response.success) {
        showMessage("Şirket bilgileri başarıyla kaydedildi", "success");
      } else {
        throw new Error(response.message || "Kaydetme işlemi başarısız");
      }
    } catch (error) {
      console.error("Error saving company info:", error);
      showMessage(
        error.message || "Şirket bilgileri kaydedilirken hata oluştu",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const response = await api.settings.saveGeneralSettings(generalSettings);
      if (response.success) {
        showMessage("Genel ayarlar başarıyla kaydedildi", "success");
      } else {
        throw new Error(response.message || "Kaydetme işlemi başarısız");
      }
    } catch (error) {
      console.error("Error saving general settings:", error);
      showMessage(
        error.message || "Genel ayarlar kaydedilirken hata oluştu",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      const response = await api.settings.saveNotificationSettings(
        notificationSettings
      );
      if (response.success) {
        showMessage("Bildirim ayarları başarıyla kaydedildi", "success");
      } else {
        throw new Error(response.message || "Kaydetme işlemi başarısız");
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
      showMessage(
        error.message || "Bildirim ayarları kaydedilirken hata oluştu",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      const response = await api.settings.saveEmailSettings(emailSettings);
      if (response.success) {
        showMessage("E-posta ayarları başarıyla kaydedildi", "success");
      } else {
        throw new Error(response.message || "Kaydetme işlemi başarısız");
      }
    } catch (error) {
      console.error("Error saving email settings:", error);
      showMessage(
        error.message || "E-posta ayarları kaydedilirken hata oluştu",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShipping = async () => {
    setSaving(true);
    try {
      const response = await api.settings.saveShippingSettings(
        shippingSettings
      );
      if (response.success) {
        showMessage("Kargo ayarları başarıyla kaydedildi", "success");
      } else {
        throw new Error(response.message || "Kaydetme işlemi başarısız");
      }
    } catch (error) {
      console.error("Error saving shipping settings:", error);
      showMessage(
        error.message || "Kargo ayarları kaydedilirken hata oluştu",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setSaving(true);
    try {
      const response = await api.settings.testEmailSettings();
      if (response.success) {
        showMessage("Test e-postası başarıyla gönderildi", "success");
      } else {
        throw new Error(response.message || "Test e-postası gönderilemedi");
      }
    } catch (error) {
      console.error("Error testing email:", error);
      showMessage(
        error.message || "Test e-postası gönderilirken hata oluştu",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showMessage("Lütfen geçerli bir resim dosyası seçin", "error");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showMessage("Dosya boyutu 2MB'dan küçük olmalıdır", "error");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await api.settings.uploadCompanyLogo(formData);
      if (response.success) {
        setCompanyInfo((prev) => ({ ...prev, logo: response.data.logoUrl }));
        showMessage("Logo başarıyla yüklendi", "success");
      } else {
        throw new Error(response.message || "Logo yükleme başarısız");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      showMessage(error.message || "Logo yüklenirken hata oluştu", "error");
    } finally {
      setSaving(false);
    }
  };

  // Tab configurations
  const tabs = [
    { id: "company", label: "Şirket Bilgileri", icon: FiUser },
    { id: "general", label: "Genel Ayarlar", icon: FiSettings },
    { id: "notifications", label: "Bildirimler", icon: FiBell },
    { id: "email", label: "E-posta", icon: FiMail },
    { id: "shipping", label: "Kargo", icon: FiTruck },
  ];

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Şirket Bilgileri
        </h3>
        {renderSaveButton(handleSaveCompany)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şirket Adı
            </label>
            <input
              type="text"
              value={companyInfo.name}
              onChange={(e) =>
                setCompanyInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şirket adınızı girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres
            </label>
            <textarea
              value={companyInfo.address}
              onChange={(e) =>
                setCompanyInfo((prev) => ({ ...prev, address: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şirket adresinizi girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={companyInfo.phone}
              onChange={(e) =>
                setCompanyInfo((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+90 (555) 123 45 67"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={companyInfo.email}
              onChange={(e) =>
                setCompanyInfo((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="info@sirketiniz.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vergi Numarası
            </label>
            <input
              type="text"
              value={companyInfo.taxId}
              onChange={(e) =>
                setCompanyInfo((prev) => ({ ...prev, taxId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şirket Logosu
            </label>
            <div className="flex items-center space-x-4">
              {companyInfo.logo && (
                <img
                  src={companyInfo.logo}
                  alt="Company Logo"
                  className="h-16 w-16 object-cover rounded-lg border"
                />
              )}
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <FiUpload className="h-4 w-4 mr-2" />
                Logo Yükle
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Genel Ayarlar</h3>
        {renderSaveButton(handleSaveGeneral)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zaman Dilimi
            </label>
            <select
              value={generalSettings.timezone}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  timezone: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Europe/Istanbul">İstanbul (UTC+3)</option>
              <option value="UTC">UTC (UTC+0)</option>
              <option value="Europe/London">Londra (UTC+0/+1)</option>
              <option value="America/New_York">New York (UTC-5/-4)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Para Birimi
            </label>
            <select
              value={generalSettings.currency}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  currency: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TRY">Türk Lirası (₺)</option>
              <option value="USD">ABD Doları ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="GBP">İngiliz Sterlini (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dil
            </label>
            <select
              value={generalSettings.language}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  language: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarih Formatı
            </label>
            <select
              value={generalSettings.dateFormat}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  dateFormat: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSync"
              checked={generalSettings.autoSync}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  autoSync: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="autoSync"
              className="ml-2 block text-sm text-gray-900"
            >
              Otomatik Senkronizasyon
            </label>
          </div>

          {generalSettings.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senkronizasyon Aralığı (dakika)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={generalSettings.syncInterval}
                onChange={(e) =>
                  setGeneralSettings((prev) => ({
                    ...prev,
                    syncInterval: parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderNotificationTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Bildirim Ayarları
        </h3>
        {renderSaveButton(handleSaveNotifications)}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              E-posta Bildirimleri
            </h4>
            <p className="text-sm text-gray-500">
              Genel e-posta bildirimlerini al
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.emailNotifications}
              onChange={(e) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  emailNotifications: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Sipariş Uyarıları
            </h4>
            <p className="text-sm text-gray-500">
              Yeni siparişler için bildirim al
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.orderAlerts}
              onChange={(e) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  orderAlerts: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Düşük Stok Uyarıları
            </h4>
            <p className="text-sm text-gray-500">
              Stok azaldığında bildirim al
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.lowStockAlerts}
              onChange={(e) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  lowStockAlerts: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Sistem Güncellemeleri
            </h4>
            <p className="text-sm text-gray-500">
              Sistem güncellemeleri hakkında bildirim al
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.systemUpdates}
              onChange={(e) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  systemUpdates: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Pazarlama E-postaları
            </h4>
            <p className="text-sm text-gray-500">
              Promosyon ve pazarlama e-postaları al
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.marketingEmails}
              onChange={(e) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  marketingEmails: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderEmailTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          E-posta Ayarları
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleTestEmail}
            disabled={saving || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Test Gönder
          </button>
          {renderSaveButton(handleSaveEmail)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMTP Sunucusu
            </label>
            <input
              type="text"
              value={emailSettings.smtpHost}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  smtpHost: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMTP Port
            </label>
            <input
              type="number"
              value={emailSettings.smtpPort}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  smtpPort: parseInt(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="587"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={emailSettings.smtpUsername}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  smtpUsername: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your-email@gmail.com"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={emailSettings.smtpPassword}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  smtpPassword: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gönderen E-posta
            </label>
            <input
              type="email"
              value={emailSettings.fromEmail}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  fromEmail: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="noreply@sirketiniz.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gönderen Adı
            </label>
            <input
              type="text"
              value={emailSettings.fromName}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  fromName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şirket Adınız"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifreleme
            </label>
            <select
              value={emailSettings.encryption}
              onChange={(e) =>
                setEmailSettings((prev) => ({
                  ...prev,
                  encryption: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
              <option value="none">Yok</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShippingTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Kargo Ayarları</h3>
        {renderSaveButton(handleSaveShipping)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Varsayılan Kargo Firması
            </label>
            <select
              value={shippingSettings.defaultCarrier}
              onChange={(e) =>
                setShippingSettings((prev) => ({
                  ...prev,
                  defaultCarrier: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              <option value="yurtici">Yurtiçi Kargo</option>
              <option value="aras">Aras Kargo</option>
              <option value="mng">MNG Kargo</option>
              <option value="ptt">PTT Kargo</option>
              <option value="ups">UPS</option>
              <option value="dhl">DHL</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ücretsiz Kargo Limiti (₺)
            </label>
            <input
              type="number"
              min="0"
              value={shippingSettings.freeShippingThreshold}
              onChange={(e) =>
                setShippingSettings((prev) => ({
                  ...prev,
                  freeShippingThreshold: parseFloat(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kargo Hesaplama Yöntemi
            </label>
            <select
              value={shippingSettings.shippingCalculation}
              onChange={(e) =>
                setShippingSettings((prev) => ({
                  ...prev,
                  shippingCalculation: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weight">Ağırlığa Göre</option>
              <option value="volume">Hacime Göre</option>
              <option value="price">Fiyata Göre</option>
              <option value="fixed">Sabit Fiyat</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Varsayılan Paket Boyutları (cm)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min="0"
                value={shippingSettings.packageDimensions.length}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    packageDimensions: {
                      ...prev.packageDimensions,
                      length: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Uzunluk"
              />
              <input
                type="number"
                min="0"
                value={shippingSettings.packageDimensions.width}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    packageDimensions: {
                      ...prev.packageDimensions,
                      width: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Genişlik"
              />
              <input
                type="number"
                min="0"
                value={shippingSettings.packageDimensions.height}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    packageDimensions: {
                      ...prev.packageDimensions,
                      height: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Yükseklik"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSaveButton = (onSave, disabled = false) => (
    <button
      onClick={onSave}
      disabled={disabled || saving || loading}
      className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
        disabled || saving || loading
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      <FiSave className="h-4 w-4" />
      {saving ? "Kaydediliyor..." : "Kaydet"}
    </button>
  );

  const renderStatusMessage = () => {
    if (!saveStatus || !message) return null;

    return (
      <div
        className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          saveStatus === "success"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}
      >
        {saveStatus === "success" ? (
          <FiCheck className="h-5 w-5" />
        ) : (
          <FiX className="h-5 w-5" />
        )}
        {message}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderStatusMessage()}

      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "company" && renderCompanyTab()}
            {activeTab === "general" && renderGeneralTab()}
            {activeTab === "notifications" && renderNotificationTab()}
            {activeTab === "email" && renderEmailTab()}
            {activeTab === "shipping" && renderShippingTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
