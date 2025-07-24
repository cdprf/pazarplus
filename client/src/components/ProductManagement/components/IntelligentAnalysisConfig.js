import logger from "../../../utils/logger";
import React, { useState, useEffect } from "react";
import {
  Settings,
  Sliders,
  Brain,
  Zap,
  Target,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Save,
  RotateCcw,
  Info,
  X,
} from "lucide-react";

const IntelligentAnalysisConfig = ({
  config = {},
  onConfigChange,
  onSave,
  onReset,
  onAnalyze, // Main analyze function
  onRefreshAnalysis, // Fallback for compatibility
  onClose, // Close function
  isAnalyzing = false,
  className = "",
}) => {
  const [localConfig, setLocalConfig] = useState({
    // Analysis sensitivity
    sensitivity: 0.8,
    minConfidence: 0.6,
    minGroupSize: 2,

    // Detection features
    detectVariants: true,
    analyzeNaming: true,
    analyzeClassification: true,
    generateSuggestions: true,

    // Pattern options
    enableMultiLanguage: true,
    enableBrandGrouping: true,
    enableSizeColorVariants: true,
    enablePriceAnalysis: true,
    enableCategoryGrouping: true,

    // Advanced options
    maxPatternLength: 5,
    enableSmartExclusions: true,
    useAiEnhancement: true,
    enableLearning: true,

    // Performance
    batchSize: 100,
    maxAnalysisTime: 30000,

    ...config,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig((prev) => ({ ...prev, ...config }));
  }, [config]);

  useEffect(() => {
    const changed =
      JSON.stringify(localConfig) !==
      JSON.stringify({ ...localConfig, ...config });
    setHasChanges(changed);
  }, [localConfig, config]);

  const handleConfigChange = (key, value) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleSave = () => {
    onSave?.(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaultConfig = {
      sensitivity: 0.8,
      minConfidence: 0.6,
      minGroupSize: 2,
      detectVariants: true,
      analyzeNaming: true,
      analyzeClassification: true,
      generateSuggestions: true,
      enableMultiLanguage: true,
      enableBrandGrouping: true,
      enableSizeColorVariants: true,
      enablePriceAnalysis: true,
      enableCategoryGrouping: true,
      maxPatternLength: 5,
      enableSmartExclusions: true,
      useAiEnhancement: true,
      enableLearning: true,
      batchSize: 100,
      maxAnalysisTime: 30000,
    };
    setLocalConfig(defaultConfig);
    onReset?.(defaultConfig);
    setHasChanges(false);
  };

  const SliderControl = ({
    label,
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.1,
    description,
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {typeof value === "number" ? (value * 100).toFixed(0) + "%" : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
      />
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );

  const ToggleControl = ({ label, value, onChange, description }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analiz Konfigürasyonu
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI analizi ayarlarını özelleştirin
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md transition-colors"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {hasChanges && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Kaydet
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Sıfırla
                </button>
              </div>
            )}

            <button
              onClick={() => {
                // Use onAnalyze if available, fallback to onRefreshAnalysis for compatibility
                const analyzeFunction = onAnalyze || onRefreshAnalysis;
                if (analyzeFunction) {
                  analyzeFunction();
                } else {
                  logger.warn(
                    "No analyze function provided to IntelligentAnalysisConfig"
                  );
                }
              }}
              disabled={isAnalyzing}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`}
              />
              {isAnalyzing ? "Analiz Ediliyor..." : "Analizi Başlat"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <Sliders className="w-4 h-4 mr-2" />
            Temel Ayarlar
          </h4>

          <SliderControl
            label="Analiz Hassasiyeti"
            value={localConfig.sensitivity}
            onChange={(value) => handleConfigChange("sensitivity", value)}
            description="Yüksek değer daha katı, düşük değer daha esnek analiz yapar"
          />

          <SliderControl
            label="Minimum Güven Seviyesi"
            value={localConfig.minConfidence}
            onChange={(value) => handleConfigChange("minConfidence", value)}
            description="Bu seviyenin altındaki öneriler gösterilmez"
          />

          <SliderControl
            label="Minimum Grup Boyutu"
            value={localConfig.minGroupSize}
            onChange={(value) =>
              handleConfigChange("minGroupSize", Math.round(value))
            }
            min={2}
            max={10}
            step={1}
            description="Varyant grubu oluşturmak için gereken minimum ürün sayısı"
          />
        </div>

        {/* Analysis Features */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Analiz Özellikleri
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleControl
              label="Varyant Tespiti"
              value={localConfig.detectVariants}
              onChange={(value) => handleConfigChange("detectVariants", value)}
              description="Ürün varyantlarını otomatik tespit et"
            />

            <ToggleControl
              label="İsimlendirme Analizi"
              value={localConfig.analyzeNaming}
              onChange={(value) => handleConfigChange("analyzeNaming", value)}
              description="Ürün isimlerindeki kalıpları analiz et"
            />

            <ToggleControl
              label="Kategori Analizi"
              value={localConfig.analyzeClassification}
              onChange={(value) =>
                handleConfigChange("analyzeClassification", value)
              }
              description="Kategori sınıflandırma kalıplarını analiz et"
            />

            <ToggleControl
              label="Önerileri Oluştur"
              value={localConfig.generateSuggestions}
              onChange={(value) =>
                handleConfigChange("generateSuggestions", value)
              }
              description="Otomatik iyileştirme önerileri oluştur"
            />
          </div>
        </div>

        {/* Pattern Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Kalıp Seçenekleri
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleControl
              label="Çok Dilli Destek"
              value={localConfig.enableMultiLanguage}
              onChange={(value) =>
                handleConfigChange("enableMultiLanguage", value)
              }
              description="Türkçe ve İngilizce kalıpları destekle"
            />

            <ToggleControl
              label="Marka Gruplaması"
              value={localConfig.enableBrandGrouping}
              onChange={(value) =>
                handleConfigChange("enableBrandGrouping", value)
              }
              description="Ürünleri markaya göre grupla"
            />

            <ToggleControl
              label="Renk/Beden Varyantları"
              value={localConfig.enableSizeColorVariants}
              onChange={(value) =>
                handleConfigChange("enableSizeColorVariants", value)
              }
              description="Renk ve beden varyantlarını tespit et"
            />

            <ToggleControl
              label="Fiyat Analizi"
              value={localConfig.enablePriceAnalysis}
              onChange={(value) =>
                handleConfigChange("enablePriceAnalysis", value)
              }
              description="Fiyat kalıplarını analiz et"
            />

            <ToggleControl
              label="Kategori Gruplaması"
              value={localConfig.enableCategoryGrouping}
              onChange={(value) =>
                handleConfigChange("enableCategoryGrouping", value)
              }
              description="Ürünleri kategoriye göre grupla"
            />
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Gelişmiş Ayarlar
            </h4>
            {showAdvanced ? (
              <ToggleRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
              <SliderControl
                label="Maksimum Kalıp Uzunluğu"
                value={localConfig.maxPatternLength}
                onChange={(value) =>
                  handleConfigChange("maxPatternLength", Math.round(value))
                }
                min={3}
                max={10}
                step={1}
                description="Kalıp analizinde kullanılacak maksimum segment sayısı"
              />

              <SliderControl
                label="Batch Boyutu"
                value={localConfig.batchSize}
                onChange={(value) =>
                  handleConfigChange("batchSize", Math.round(value))
                }
                min={50}
                max={500}
                step={50}
                description="Aynı anda analiz edilecek ürün sayısı"
              />

              <div className="grid grid-cols-1 gap-3">
                <ToggleControl
                  label="Akıllı Hariç Tutma"
                  value={localConfig.enableSmartExclusions}
                  onChange={(value) =>
                    handleConfigChange("enableSmartExclusions", value)
                  }
                  description="Belirli kalıpları otomatik olarak hariç tut"
                />

                <ToggleControl
                  label="AI Geliştirme"
                  value={localConfig.useAiEnhancement}
                  onChange={(value) =>
                    handleConfigChange("useAiEnhancement", value)
                  }
                  description="Gelişmiş AI algoritmaları kullan"
                />

                <ToggleControl
                  label="Öğrenme Sistemi"
                  value={localConfig.enableLearning}
                  onChange={(value) =>
                    handleConfigChange("enableLearning", value)
                  }
                  description="Kullanıcı geri bildirimlerinden öğren"
                />
              </div>
            </div>
          )}
        </div>

        {/* Performance Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Performans Tavsiyesi
              </h5>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Büyük ürün setleri için batch boyutunu artırın ve hassasiyeti
                azaltın. AI geliştirme özelliği daha doğru sonuçlar verir ancak
                daha fazla zaman alır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligentAnalysisConfig;
