import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  Settings,
  Database,
  Globe,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button, Modal, Badge, Card, CardContent } from "./ui";
import { useAlert } from "../contexts/AlertContext";

/**
 * Platform Categories Management Component
 * Handles category syncing, listing, and management for all platforms
 */
const PlatformCategoriesManagement = () => {
  const { showAlert } = useAlert();

  // State management
  const [categories, setCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [syncStatus, setSyncStatus] = useState({});
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({});
  const [productModel, setProductModel] = useState(null);

  // Available platforms
  const platforms = useMemo(
    () => [
      { id: "all", name: "Tüm Platformlar", color: "blue" },
      { id: "trendyol", name: "Trendyol", color: "orange" },
      { id: "hepsiburada", name: "Hepsiburada", color: "orange" },
      { id: "n11", name: "N11", color: "purple" },
    ],
    []
  );

  // Fetch categories from API
  const fetchCategories = useCallback(
    async (platform = "all") => {
      setLoading(true);
      try {
        // Handle null, undefined, or "all" platform
        if (!platform || platform === "all") {
          // Fetch from all platforms
          const requests = platforms.slice(1).map((p) => {
            return fetch(`/api/platform-products/${p.id}/categories`).then(
              (r) => r.json()
            );
          });
          const responses = await Promise.all(requests);

          const allCategories = [];
          responses.forEach((response, index) => {
            if (response.success) {
              const platformCategories = response.data.map((cat) => ({
                ...cat,
                platform: platforms[index + 1].id,
                platformName: platforms[index + 1].name,
              }));
              allCategories.push(...platformCategories);
            }
          });
          setCategories(allCategories);
        } else {
          // Fetch from specific platform
          const response = await fetch(
            `/api/platform-products/${platform}/categories`
          );
          const data = await response.json();

          if (data.success) {
            const platformCategories = data.data.map((cat) => ({
              ...cat,
              platform,
              platformName: platforms.find((p) => p.id === platform)?.name,
            }));
            setCategories(platformCategories);
          } else {
            throw new Error(data.message || "Failed to fetch categories");
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        showAlert(`Kategoriler yüklenirken hata: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [platforms, showAlert]
  );

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/platform-products/categories/sync-status"
      );
      const data = await response.json();

      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  }, []);

  // Sync categories for a platform
  const syncPlatformCategories = async (platform) => {
    setSyncing(true);
    try {
      const response = await fetch(
        `/api/platform-products/${platform}/categories/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();

      if (data.success) {
        showAlert(
          `${
            platforms.find((p) => p.id === platform)?.name
          } kategorileri başarıyla senkronize edildi`,
          "success"
        );
        await fetchCategories(selectedPlatform);
        await fetchSyncStatus();
      } else {
        throw new Error(data.message || "Sync failed");
      }
    } catch (error) {
      console.error("Error syncing categories:", error);
      showAlert(`Senkronizasyon hatası: ${error.message}`, "error");
    } finally {
      setSyncing(false);
      setShowSyncModal(false);
    }
  };

  // Sync all platforms
  const syncAllPlatforms = async () => {
    setSyncing(true);
    try {
      const syncPromises = platforms
        .slice(1)
        .map((p) => syncPlatformCategories(p.id));
      await Promise.all(syncPromises);
      showAlert("Tüm platformlar senkronize edildi", "success");
    } catch (error) {
      showAlert("Toplu senkronizasyon hatası", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Show category properties
  const showCategoryProperties = async (category) => {
    setSelectedCategory(category);
    setShowPropertiesModal(true);

    // Fetch additional properties if needed
    try {
      const response = await fetch(
        `/api/platform-products/${category.platform}/category-fields/${category.platformCategoryId}`
      );
      const data = await response.json();

      if (data.success) {
        setSelectedCategory((prev) => ({ ...prev, fields: data.data }));
      }
    } catch (error) {
      console.error("Error fetching category properties:", error);
    }
  };

  // Fetch available categories without importing
  const fetchAvailableCategories = useCallback(
    async (platform) => {
      setFetching(true);
      setSelectedPlatform(platform);

      try {
        showAlert(
          `${
            platforms.find((p) => p.id === platform)?.name
          } kategorileri getiriliyor...`,
          "info"
        );

        // Use the available categories endpoint to get all platform categories
        const response = await fetch(
          `/api/platform-products/${platform}/categories/available`
        );
        const data = await response.json();

        if (data.success) {
          const platformCategories = data.data.map((cat) => ({
            ...cat,
            platform,
            platformName: platforms.find((p) => p.id === platform)?.name,
            selected: false,
          }));
          setAvailableCategories(platformCategories);

          showAlert(
            `${platformCategories.length} kategori başarıyla getirildi`,
            "success"
          );

          // Show the categories directly in the import modal
          setShowFetchModal(false);
          setShowImportModal(true);
        } else {
          throw new Error(
            data.message || "Failed to fetch available categories"
          );
        }
      } catch (error) {
        console.error("Error fetching available categories:", error);

        // Handle 404 errors gracefully
        if (
          error.message?.includes("404") ||
          error.message?.includes("Not found")
        ) {
          showAlert(
            `Bu platform için kategori getirme özelliği henüz hazır değil`,
            "warning"
          );
        } else {
          showAlert(`Kategoriler yüklenirken hata: ${error.message}`, "error");
        }
      } finally {
        setFetching(false);
      }
    },
    [platforms, showAlert]
  );

  // Toggle category selection
  const toggleCategorySelection = (categoryId) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Select all categories
  const selectAllCategories = () => {
    const allIds = availableCategories.map((cat) => cat.id);
    setSelectedCategories(allIds);
  };

  // Clear category selection
  const clearCategorySelection = () => {
    setSelectedCategories([]);
  };

  // Import selected categories
  const importSelectedCategories = async () => {
    if (selectedCategories.length === 0) {
      showAlert("Lütfen içe aktarılacak kategorileri seçin", "warning");
      return;
    }

    setImporting(true);
    try {
      const categoriesToImport = availableCategories.filter((cat) =>
        selectedCategories.includes(cat.id)
      );

      const response = await fetch("/api/platform-products/categories/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: categoriesToImport,
          fieldMappings: fieldMappings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert(
          `${selectedCategories.length} kategori başarıyla içe aktarıldı`,
          "success"
        );
        setShowImportModal(false);
        setSelectedCategories([]);
        setAvailableCategories([]);
        await fetchCategories(selectedPlatform);
      } else {
        throw new Error(data.message || "Import failed");
      }
    } catch (error) {
      console.error("Error importing categories:", error);
      showAlert(`İçe aktarma hatası: ${error.message}`, "error");
    } finally {
      setImporting(false);
    }
  };

  // Open field mapping modal
  const openFieldMappingModal = () => {
    if (selectedCategories.length === 0) {
      showAlert("Lütfen önce kategorileri seçin", "warning");
      return;
    }
    setShowMappingModal(true);
  };

  // Fetch product model structure
  const fetchProductModel = useCallback(async () => {
    try {
      const response = await fetch("/api/products/model-structure");
      const data = await response.json();

      if (data.success) {
        setProductModel(data.data);
      }
    } catch (error) {
      console.error("Error fetching product model:", error);
    }
  }, []);

  // Update field mapping
  const updateFieldMapping = (categoryField, productField) => {
    setFieldMappings((prev) => ({
      ...prev,
      [categoryField]: productField,
    }));
  };

  // Filter categories based on search and platform (memoized for performance)
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch =
        !searchTerm ||
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.path?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlatform =
        selectedPlatform === "all" || category.platform === selectedPlatform;

      return matchesSearch && matchesPlatform;
    });
  }, [categories, searchTerm, selectedPlatform]);

  // Group categories by platform
  const groupedCategories = filteredCategories.reduce((acc, category) => {
    if (!acc[category.platform]) {
      acc[category.platform] = [];
    }
    acc[category.platform].push(category);
    return acc;
  }, {});

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchCategories(selectedPlatform);
      await fetchSyncStatus();
      await fetchProductModel();
    };
    loadData();
  }, [selectedPlatform, fetchCategories, fetchSyncStatus, fetchProductModel]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section with improved accessibility and responsive design */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start space-x-3">
                <Database className="h-8 w-8 icon-contrast-primary flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Platform Kategori Yönetimi
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    E-ticaret platformlarındaki kategorileri getirin, yönetin ve
                    senkronize edin
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                  onClick={() => setShowFetchModal(true)}
                  variant="primary"
                  disabled={fetching}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2"
                >
                  <Database className="h-4 w-4" />
                  <span>
                    {fetching
                      ? "Kategoriler Yükleniyor..."
                      : "Kategorileri Getir"}
                  </span>
                </Button>

                <Button
                  onClick={() => setShowSyncModal(true)}
                  variant="outline"
                  disabled={syncing}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {syncing ? "Senkronize Ediliyor..." : "Senkronize Et"}
                  </span>
                </Button>

                <Button
                  onClick={() => fetchCategories(selectedPlatform)}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Yenile</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {platforms.slice(1).map((platform) => {
            const status = syncStatus[platform.id] || {};
            const platformCategories = categories.filter(
              (cat) => cat.platform === platform.id
            );
            return (
              <Card key={platform.id}>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Globe className="h-8 w-8 icon-contrast-primary" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {platform.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {platformCategories.length}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        kategori
                      </p>
                    </div>
                    <div className="ml-auto">
                      {status.syncStatus === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : status.syncStatus === "syncing" ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {status.lastSyncAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Son senkronizasyon:{" "}
                      {new Date(status.lastSyncAt).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 icon-contrast-secondary h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Kategori ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                >
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Kategoriler yükleniyor...</p>
              </div>
            ) : Object.keys(groupedCategories).length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Kategori bulunamadı
                </h3>
                <p className="text-gray-500 mb-4">
                  Seçilen kriterlere uygun kategori bulunamadı.
                </p>
                <Button
                  onClick={() => setShowSyncModal(true)}
                  variant="primary"
                  className="inline-flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Kategorileri Senkronize Et
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Mobile-first responsive table with better scroll behavior */}
                <div className="min-w-full">
                  {/* Mobile view for small screens */}
                  <div className="block sm:hidden">
                    <div className="space-y-3 p-4">
                      {filteredCategories.map((category) => (
                        <Card
                          key={`${category.platform}-${category.id}`}
                          className="border border-gray-200"
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {category.name}
                                </h3>
                                <Badge
                                  variant={
                                    platforms.find(
                                      (p) => p.id === category.platform
                                    )?.color || "secondary"
                                  }
                                  size="sm"
                                >
                                  {category.platformName}
                                </Badge>
                              </div>

                              {category.path && (
                                <p
                                  className="text-sm text-gray-600 truncate"
                                  title={category.path}
                                >
                                  {category.path}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Seviye: {category.level || "N/A"}</span>
                                <span>
                                  {category.updatedAt
                                    ? new Date(
                                        category.updatedAt
                                      ).toLocaleDateString("tr-TR")
                                    : "Bilinmiyor"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <Badge
                                  variant={
                                    category.isActive ? "success" : "secondary"
                                  }
                                  size="sm"
                                >
                                  {category.isActive ? "Aktif" : "Pasif"}
                                </Badge>

                                <Button
                                  onClick={() =>
                                    showCategoryProperties(category)
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  <Settings className="h-3 w-3 mr-1" />
                                  Özellikler
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Desktop table view */}
                  <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategori
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Platform
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seviye
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Son Güncelleme
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredCategories.map((category) => (
                        <tr
                          key={`${category.platform}-${category.id}`}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className="p-1 hover:bg-gray-200 rounded mr-2"
                              >
                                {expandedCategories.has(category.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {category.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {category.path}
                                </div>
                                {expandedCategories.has(category.id) && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    <div>
                                      Platform ID: {category.platformCategoryId}
                                    </div>
                                    {category.commissionRate && (
                                      <div>
                                        Komisyon: %{category.commissionRate}
                                      </div>
                                    )}
                                    {category.requiredFields &&
                                      category.requiredFields.length > 0 && (
                                        <div className="mt-1">
                                          <span className="font-medium">
                                            Gerekli Alanlar:{" "}
                                          </span>
                                          {category.requiredFields.join(", ")}
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="capitalize">
                              {category.platformName}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                            {category.level}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={
                                  category.isActive ? "success" : "secondary"
                                }
                                size="sm"
                              >
                                {category.isActive ? "Aktif" : "Pasif"}
                              </Badge>
                              <Badge
                                variant={category.isLeaf ? "info" : "secondary"}
                                size="sm"
                              >
                                {category.isLeaf
                                  ? "Son kategori"
                                  : "Ana kategori"}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(category.updatedAt).toLocaleDateString(
                              "tr-TR",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => showCategoryProperties(category)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                title="Özellikler"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Fetch Categories Modal */}
      {showFetchModal && (
        <Modal
          isOpen={showFetchModal}
          onClose={() => setShowFetchModal(false)}
          title="Platform Kategorilerini Getir"
          size="xl"
        >
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Platform Seçin ve Kategorileri Getirin
              </h3>
              <p className="text-gray-600">
                Hangi platformdan kategorileri getirmek istiyorsunuz?
                Kategoriler getirildikten sonra içe aktarılacakları
                seçebilirsiniz.
              </p>
            </div>

            {/* Responsive platform grid - adapts to any number of platforms with improved mobile layout */}
            <div className="grid gap-3 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {platforms.slice(1).map((platform) => {
                const isCurrentlyFetching =
                  fetching && selectedPlatform === platform.id;
                const existingCategories = categories.filter(
                  (cat) => cat.platform === platform.id
                );
                const hasExistingData = existingCategories.length > 0;

                return (
                  <Card
                    key={platform.id}
                    className={`transition-all duration-200 hover:shadow-lg border-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 ${
                      isCurrentlyFetching
                        ? "border-blue-300 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              platform.id === "trendyol"
                                ? "bg-orange-500"
                                : platform.id === "hepsiburada"
                                ? "bg-orange-600"
                                : platform.id === "n11"
                                ? "bg-purple-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {platform.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {hasExistingData ? (
                                <Badge variant="success" size="sm">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {existingCategories.length}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" size="sm">
                                  <Database className="w-3 h-3 mr-1" />
                                  Veri yok
                                </Badge>
                              )}
                              {isCurrentlyFetching && (
                                <Badge variant="primary" size="sm">
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  Getiriliyor
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button
                            onClick={() =>
                              fetchAvailableCategories(platform.id)
                            }
                            disabled={fetching}
                            size="sm"
                            className="w-full"
                            variant={
                              isCurrentlyFetching ? "secondary" : "primary"
                            }
                          >
                            {isCurrentlyFetching ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Getiriliyor...
                              </>
                            ) : (
                              <>
                                <Globe className="w-4 h-4 mr-2" />
                                Kategorileri Getir
                              </>
                            )}
                          </Button>

                          {hasExistingData && (
                            <div className="text-xs text-gray-500 text-center">
                              Son güncelleme:{" "}
                              {new Date().toLocaleDateString("tr-TR")}
                            </div>
                          )}
                        </div>
                      </div>

                      {hasExistingData && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Ana kategoriler:</span>
                              <span className="font-medium">
                                {
                                  existingCategories.filter(
                                    (cat) => !cat.parentId
                                  ).length
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Alt kategoriler:</span>
                              <span className="font-medium">
                                {
                                  existingCategories.filter(
                                    (cat) => cat.parentId
                                  ).length
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {fetching && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                  <div>
                    <p className="text-blue-800 font-medium">
                      Kategoriler getiriliyor...
                    </p>
                    <p className="text-blue-600 text-sm">
                      Bu işlem birkaç saniye sürebilir. Kategoriler
                      getirildikten sonra seçim yapabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm text-gray-500 order-2 sm:order-1">
                <span className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Kategoriler getirildikten sonra içe aktarılacakları
                  seçebilirsiniz.
                </span>
              </div>

              <div className="flex space-x-3 order-1 sm:order-2">
                <Button
                  onClick={() => setShowFetchModal(false)}
                  variant="outline"
                  disabled={fetching}
                >
                  {fetching ? "Bekleyin..." : "Kapat"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Categories Modal */}
      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title={`Kategorileri İçe Aktar - ${
            availableCategories[0]?.platformName || "Platform"
          }`}
          size="xl"
        >
          <div className="p-6">
            {/* Enhanced header with stats and bulk actions */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {availableCategories.length} Kategori Mevcut
                  </h3>
                  <p className="text-gray-600">
                    İçe aktarmak istediğiniz kategorileri seçin (
                    {selectedCategories.length} seçili)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={selectAllCategories}
                    size="sm"
                    variant="outline"
                    disabled={
                      selectedCategories.length === availableCategories.length
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Tümünü Seç
                  </Button>
                  <Button
                    onClick={clearCategorySelection}
                    size="sm"
                    variant="outline"
                    disabled={selectedCategories.length === 0}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Temizle
                  </Button>
                  <Button
                    onClick={() => {
                      const leafCategories = availableCategories
                        .filter((cat) => cat.isLeaf)
                        .map((cat) => cat.id);
                      setSelectedCategories(leafCategories);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Sadece Son Kategoriler
                  </Button>
                  <Button
                    onClick={() => {
                      const parentCategories = availableCategories
                        .filter((cat) => !cat.isLeaf)
                        .map((cat) => cat.id);
                      setSelectedCategories(parentCategories);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Database className="w-4 h-4 mr-1" />
                    Sadece Ana Kategoriler
                  </Button>
                </div>
              </div>

              {/* Enhanced search and filter section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Kategorilerde ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" size="sm">
                    <Database className="w-3 h-3 mr-1" />
                    Ana:{" "}
                    {availableCategories.filter((cat) => !cat.parentId).length}
                  </Badge>
                  <Badge variant="secondary" size="sm">
                    <Settings className="w-3 h-3 mr-1" />
                    Alt:{" "}
                    {availableCategories.filter((cat) => cat.parentId).length}
                  </Badge>
                  <Badge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Seçili: {selectedCategories.length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick filter buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={() => {
                  const filtered = availableCategories.filter(
                    (cat) => !cat.parentId
                  );
                  const filteredIds = filtered.map((cat) => cat.id);
                  setSelectedCategories((prev) => [
                    ...new Set([...prev, ...filteredIds]),
                  ]);
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                + Ana Kategorileri Ekle
              </Button>
              <Button
                onClick={() => {
                  const filtered = availableCategories.filter(
                    (cat) => cat.isLeaf
                  );
                  const filteredIds = filtered.map((cat) => cat.id);
                  setSelectedCategories((prev) => [
                    ...new Set([...prev, ...filteredIds]),
                  ]);
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                + Son Kategorileri Ekle
              </Button>
              <Button
                onClick={() => {
                  const filtered = availableCategories.filter(
                    (cat) => cat.requiredFields && cat.requiredFields.length > 0
                  );
                  const filteredIds = filtered.map((cat) => cat.id);
                  setSelectedCategories((prev) => [
                    ...new Set([...prev, ...filteredIds]),
                  ]);
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                + Gerekli Alanları Olan
              </Button>
            </div>

            {/* Category list with enhanced display, virtualization for large lists, and better performance */}
            <div className="max-h-96 overflow-y-auto mb-6 border border-gray-200 rounded-lg">
              {availableCategories.length === 0 ? (
                <div className="p-8 text-center">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    Henüz kategori getirilmedi
                  </p>
                  <p className="text-gray-500 text-sm">
                    Yukarıdaki platformlardan kategorileri getirin
                  </p>
                </div>
              ) : (
                <>
                  {/* Performance indicator for large lists */}
                  {availableCategories.length > 1000 && (
                    <div className="bg-yellow-50 border-b border-yellow-200 p-3">
                      <div className="flex items-center text-sm text-yellow-800">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>
                          Çok sayıda kategori (
                          {availableCategories.length.toLocaleString()})
                          yüklendi. Arama kullanarak daraltabilirsiniz.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-gray-100">
                    {availableCategories
                      .filter(
                        (category) =>
                          category.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (category.path &&
                            category.path
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()))
                      )
                      .map((category) => {
                        const isSelected = selectedCategories.includes(
                          category.id
                        );

                        return (
                          <div
                            key={category.id}
                            className={`p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              isSelected
                                ? "bg-blue-50 border-l-4 border-l-blue-500"
                                : ""
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCategories((prev) =>
                                  prev.filter((id) => id !== category.id)
                                );
                              } else {
                                setSelectedCategories((prev) => [
                                  ...prev,
                                  category.id,
                                ]);
                              }
                            }}
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex="0"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (isSelected) {
                                  setSelectedCategories((prev) =>
                                    prev.filter((id) => id !== category.id)
                                  );
                                } else {
                                  setSelectedCategories((prev) => [
                                    ...prev,
                                    category.id,
                                  ]);
                                }
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Enhanced checkbox with better visual feedback */}
                              <div
                                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "border-gray-300 hover:border-blue-300"
                                }`}
                              >
                                {isSelected && (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                              </div>

                              {/* Category information with better typography */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4
                                      className={`font-medium truncate ${
                                        isSelected
                                          ? "text-blue-900"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {category.name}
                                    </h4>

                                    {/* Category path with better formatting */}
                                    {category.path && (
                                      <p
                                        className="text-sm text-gray-600 truncate mt-1"
                                        title={category.path}
                                      >
                                        {category.path}
                                      </p>
                                    )}

                                    {/* Enhanced badges for category properties */}
                                    <div className="flex flex-wrap items-center gap-1 mt-2">
                                      <Badge variant="secondary" size="sm">
                                        ID:{" "}
                                        {category.platformCategoryId ||
                                          category.id}
                                      </Badge>

                                      {category.level !== undefined && (
                                        <Badge variant="outline" size="sm">
                                          Seviye {category.level}
                                        </Badge>
                                      )}

                                      {category.isLeaf && (
                                        <Badge variant="success" size="sm">
                                          <Settings className="w-3 h-3 mr-1" />
                                          Son Kategori
                                        </Badge>
                                      )}

                                      {!category.parentId && (
                                        <Badge variant="primary" size="sm">
                                          <Database className="w-3 h-3 mr-1" />
                                          Ana Kategori
                                        </Badge>
                                      )}

                                      {category.requiredFields &&
                                        category.requiredFields.length > 0 && (
                                          <Badge variant="warning" size="sm">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            {category.requiredFields.length}{" "}
                                            Gerekli Alan
                                          </Badge>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>

            {/* Import Summary Section with improved mobile layout */}
            {selectedCategories.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-green-900 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  İçe Aktarılacak Kategoriler Özeti
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-green-700 font-medium">Toplam:</span>
                    <span className="sm:ml-0 ml-2 text-green-900">
                      {selectedCategories.length} kategori
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-green-700 font-medium">
                      Ana Kategoriler:
                    </span>
                    <span className="sm:ml-0 ml-2 text-green-900">
                      {
                        availableCategories.filter(
                          (cat) =>
                            selectedCategories.includes(cat.id) && !cat.parentId
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-green-700 font-medium">
                      Alt Kategoriler:
                    </span>
                    <span className="sm:ml-0 ml-2 text-green-900">
                      {
                        availableCategories.filter(
                          (cat) =>
                            selectedCategories.includes(cat.id) && cat.parentId
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-green-700 font-medium">
                      Son Kategoriler:
                    </span>
                    <span className="sm:ml-0 ml-2 text-green-900">
                      {
                        availableCategories.filter(
                          (cat) =>
                            selectedCategories.includes(cat.id) && cat.isLeaf
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-green-700 font-medium">
                      Gerekli Alanlar:
                    </span>
                    <span className="sm:ml-0 ml-2 text-green-900">
                      {
                        availableCategories.filter(
                          (cat) =>
                            selectedCategories.includes(cat.id) &&
                            cat.requiredFields &&
                            cat.requiredFields.length > 0
                        ).length
                      }{" "}
                      kategori
                    </span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-green-700 font-medium">
                      Platform:
                    </span>
                    <span className="sm:ml-0 ml-2 text-green-900">
                      {availableCategories[0]?.platformName || "Bilinmiyor"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced action buttons with responsive layout */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500 order-2 sm:order-1">
                {selectedCategories.length > 0 ? (
                  <span className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                    {selectedCategories.length} kategori seçildi
                  </span>
                ) : (
                  <span className="flex items-center text-amber-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Lütfen en az bir kategori seçin
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 order-1 sm:order-2">
                <Button
                  onClick={openFieldMappingModal}
                  disabled={selectedCategories.length === 0}
                  variant="secondary"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Alan Eşleme
                </Button>

                <Button
                  onClick={importSelectedCategories}
                  disabled={selectedCategories.length === 0 || importing}
                  variant="primary"
                  size="sm"
                  className="min-w-[140px]"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      İçe Aktarılıyor...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      {selectedCategories.length > 0
                        ? `${selectedCategories.length} Kategoriyi `
                        : ""}
                      İçe Aktar
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowImportModal(false)}
                  variant="outline"
                  disabled={importing}
                  size="sm"
                >
                  İptal
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Field Mapping Modal */}
      {showMappingModal && (
        <Modal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          title="Alan Eşleme"
          size="lg"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Kategori alanlarını ürün modeli alanlarıyla eşleştirin
            </p>

            <div className="space-y-4 mb-6">
              {/* Sample field mappings - this would be dynamic based on selected categories */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori Alanı
                  </label>
                  <div className="space-y-2">
                    {["title", "description", "price", "stock", "brand"].map(
                      (field) => (
                        <div
                          key={field}
                          className="p-2 border rounded bg-gray-50"
                        >
                          {field}
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ürün Modeli Alanı
                  </label>
                  <div className="space-y-2">
                    {["title", "description", "price", "stock", "brand"].map(
                      (field) => (
                        <select
                          key={field}
                          className="w-full p-2 border rounded"
                          value={fieldMappings[field] || ""}
                          onChange={(e) =>
                            updateFieldMapping(field, e.target.value)
                          }
                        >
                          <option value="">Eşleştirme seçin</option>
                          <option value="name">Ürün Adı</option>
                          <option value="description">Açıklama</option>
                          <option value="price">Fiyat</option>
                          <option value="stockQuantity">Stok Miktarı</option>
                          <option value="brand">Marka</option>
                          <option value="category">Kategori</option>
                          <option value="sku">SKU</option>
                          <option value="barcode">Barkod</option>
                        </select>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowMappingModal(false)}
                variant="primary"
                className="flex-1"
              >
                Eşlemeyi Kaydet
              </Button>
              <Button
                onClick={() => setShowMappingModal(false)}
                variant="outline"
              >
                İptal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <Modal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          title="Kategori Senkronizasyonu"
          size="md"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Hangi platformların kategorilerini senkronize etmek istiyorsunuz?
            </p>

            <div className="space-y-3 mb-6">
              {platforms.slice(1).map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{platform.name}</h3>
                    <p className="text-sm text-gray-600">
                      {syncStatus[platform.id]?.categoryCount || 0} kategori
                    </p>
                  </div>
                  <Button
                    onClick={() => syncPlatformCategories(platform.id)}
                    disabled={syncing}
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Senkronize Et
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={syncAllPlatforms}
                disabled={syncing}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tümünü Senkronize Et
              </Button>
              <Button onClick={() => setShowSyncModal(false)} variant="outline">
                İptal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Category Properties Modal */}
      {showPropertiesModal && selectedCategory && (
        <Modal
          isOpen={showPropertiesModal}
          onClose={() => setShowPropertiesModal(false)}
          title={`${selectedCategory.name} - Özellikler`}
          size="lg"
        >
          <div className="p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Temel Bilgiler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kategori Adı
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCategory.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Platform
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCategory.platformName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Platform ID
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCategory.platformCategoryId}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Seviye
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCategory.level}
                    </p>
                  </div>
                </div>
              </div>

              {/* Path */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kategori Yolu
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedCategory.path}
                </p>
              </div>

              {/* Required Fields */}
              {selectedCategory.requiredFields &&
                selectedCategory.requiredFields.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Gerekli Alanlar
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategory.requiredFields.map((field) => (
                        <Badge key={field} variant="outline">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Field Definitions */}
              {selectedCategory.fieldDefinitions && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Alan Tanımları</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedCategory.fieldDefinitions).map(
                      ([fieldName, definition]) => (
                        <div key={fieldName} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{fieldName}</h4>
                            <Badge
                              variant={
                                definition.required ? "danger" : "secondary"
                              }
                              size="sm"
                            >
                              {definition.required ? "Gerekli" : "İsteğe bağlı"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Tip: {definition.type}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Commission Rate */}
              {selectedCategory.commissionRate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Komisyon Oranı
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    %{selectedCategory.commissionRate}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setShowPropertiesModal(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import Categories Modal */}
      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Kategori İçe Aktarma"
          size="lg"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Seçili kategorileri içe aktarmak için gerekli alanları doldurun.
            </p>

            {/* Selected Categories List */}
            <div className="mb-4">
              {availableCategories
                .filter((cat) => selectedCategories.includes(cat.id))
                .map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg mb-2"
                  >
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-gray-500">{category.path}</p>
                    </div>
                    <Button
                      onClick={() => toggleCategorySelection(category.id)}
                      size="sm"
                      variant={
                        selectedCategories.includes(category.id)
                          ? "danger"
                          : "outline"
                      }
                    >
                      {selectedCategories.includes(category.id)
                        ? "Seçimi Kaldır"
                        : "Seç"}
                    </Button>
                  </div>
                ))}
            </div>

            {/* Field Mapping Section */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-3">Alan Eşleme</h3>
              <p className="text-sm text-gray-500 mb-2">
                İçe aktarılan kategorilerin alanlarını ürün modeli alanlarıyla
                eşleyin.
              </p>
              <Button
                onClick={fetchProductModel}
                variant="outline"
                className="mb-4"
              >
                Ürün Modeli Alanlarını Getir
              </Button>

              {Object.keys(fieldMappings).length === 0 && (
                <p className="text-gray-500 text-sm">
                  Henüz hiçbir alan eşlemesi yapılmadı.
                </p>
              )}

              {Object.entries(fieldMappings).map(
                ([categoryField, productField]) => (
                  <div
                    key={categoryField}
                    className="flex items-center justify-between p-3 border rounded-lg mb-2"
                  >
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {categoryField}
                      </label>
                      <p className="text-sm text-gray-500">
                        {availableCategories[0]?.fields?.find(
                          (f) => f.name === categoryField
                        )?.description || "Açıklama yok"}
                      </p>
                    </div>
                    <div className="w-1/3">
                      <select
                        value={productField}
                        onChange={(e) =>
                          updateFieldMapping(categoryField, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seçin</option>
                        {productModel?.fields?.map((field) => (
                          <option key={field.name} value={field.name}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={importSelectedCategories}
                disabled={importing}
                className="flex-1"
              >
                {importing && (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                )}
                İçe Aktar
              </Button>
              <Button
                onClick={() => setShowImportModal(false)}
                variant="outline"
              >
                İptal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Field Mapping Modal */}
      {showMappingModal && (
        <Modal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          title="Alan Eşleme"
          size="lg"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Seçili kategorilerin alanlarını ürün modeli alanlarıyla eşleyin.
            </p>

            {/* Field Mapping Section */}
            <div className="space-y-4">
              {Object.keys(fieldMappings).length === 0 && (
                <p className="text-gray-500 text-sm">
                  Henüz hiçbir alan eşlemesi yapılmadı.
                </p>
              )}

              {Object.entries(fieldMappings).map(
                ([categoryField, productField]) => (
                  <div
                    key={categoryField}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {categoryField}
                      </label>
                      <p className="text-sm text-gray-500">
                        {availableCategories[0]?.fields?.find(
                          (f) => f.name === categoryField
                        )?.description || "Açıklama yok"}
                      </p>
                    </div>
                    <div className="w-1/3">
                      <select
                        value={productField}
                        onChange={(e) =>
                          updateFieldMapping(categoryField, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seçin</option>
                        {productModel?.fields?.map((field) => (
                          <option key={field.name} value={field.name}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={() => setShowMappingModal(false)}>Kapat</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlatformCategoriesManagement;
