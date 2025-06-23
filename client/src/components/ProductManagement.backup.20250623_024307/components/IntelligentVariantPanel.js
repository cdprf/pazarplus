import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  GitMerge,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";

const IntelligentVariantPanel = ({
  suggestions = [],
  isLoading = false,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRefreshAnalysis,
  statistics = {},
  analysisTimestamp,
  className = "",
}) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState(new Set());
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showDetails, setShowDetails] = useState(false);

  const toggleSuggestionExpansion = (suggestionId) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const filteredSuggestions = suggestions.filter((suggestion) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "high") return suggestion.confidence >= 0.8;
    if (selectedFilter === "medium")
      return suggestion.confidence >= 0.6 && suggestion.confidence < 0.8;
    if (selectedFilter === "low") return suggestion.confidence < 0.6;
    return true;
  });

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Akıllı Varyant Önerileri
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI destekli varyant gruplaması
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={showDetails ? "Detayları Gizle" : "Detayları Göster"}
            >
              {showDetails ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onRefreshAnalysis}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Analizi Yenile"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Statistics Bar */}
        {showDetails && statistics && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.total_suggestions || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Öneri
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {statistics.high_confidence || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Yüksek Güven
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {statistics.potential_variants || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Potansiyel Varyant
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((statistics.confidence_avg || 0) * 100)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Ortalama Güven
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mt-4 flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {[
            { key: "all", label: "Tümü", count: suggestions.length },
            {
              key: "high",
              label: "Yüksek Güven",
              count: suggestions.filter((s) => s.confidence >= 0.8).length,
            },
            {
              key: "medium",
              label: "Orta Güven",
              count: suggestions.filter(
                (s) => s.confidence >= 0.6 && s.confidence < 0.8
              ).length,
            },
            {
              key: "low",
              label: "Düşük Güven",
              count: suggestions.filter((s) => s.confidence < 0.6).length,
            },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedFilter === filter.key
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="flex items-center justify-center space-x-3">
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
            <div className="text-gray-600 dark:text-gray-400">
              AI analizi yapılıyor...
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      {!isLoading && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredSuggestions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Varyant önerisi bulunamadı</p>
              <p className="text-sm">
                Daha fazla ürün ekleyin veya analizi yenileyin
              </p>
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isExpanded={expandedSuggestions.has(suggestion.id)}
                onToggleExpand={() => toggleSuggestionExpansion(suggestion.id)}
                onAccept={() => onAcceptSuggestion(suggestion)}
                onReject={() => onRejectSuggestion(suggestion)}
                showDetails={showDetails}
              />
            ))
          )}
        </div>
      )}

      {/* Footer */}
      {analysisTimestamp && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
          Son analiz: {new Date(analysisTimestamp).toLocaleString("tr-TR")}
        </div>
      )}
    </div>
  );
};

const SuggestionCard = ({
  suggestion,
  isExpanded,
  onToggleExpand,
  onAccept,
  onReject,
  showDetails,
}) => {
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 0.6)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "variant":
        return <GitMerge className="w-4 h-4" />;
      case "pattern":
        return <BarChart3 className="w-4 h-4" />;
      case "optimization":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            <div className="flex items-center space-x-2">
              {getTypeIcon(suggestion.type)}
              <h4 className="font-medium text-gray-900 dark:text-white">
                {suggestion.title || suggestion.pattern || "Varyant Grubu"}
              </h4>
            </div>

            <div
              className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(
                suggestion.confidence
              )}`}
            >
              %{Math.round(suggestion.confidence * 100)} güven
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {suggestion.description ||
              suggestion.reason ||
              "Benzer ürünler tespit edildi"}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{suggestion.products?.length || 0} ürün</span>
            {suggestion.potential_savings && (
              <span className="text-green-600">
                {suggestion.potential_savings} tasarruf
              </span>
            )}
            {showDetails && suggestion.analysis_time && (
              <span>{suggestion.analysis_time}ms</span>
            )}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 space-y-3">
              {suggestion.products && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Ürünler:
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestion.products.map((product, index) => (
                      <div
                        key={product.id || index}
                        className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-600 rounded"
                      >
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            SKU: {product.sku}
                          </p>
                        </div>
                        {product.price && (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            ₺{product.price.toLocaleString("tr-TR")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showDetails && suggestion.metadata && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Analiz Detayları:
                  </h5>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {Object.entries(suggestion.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span>
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onAccept}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            Kabul Et
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntelligentVariantPanel;
