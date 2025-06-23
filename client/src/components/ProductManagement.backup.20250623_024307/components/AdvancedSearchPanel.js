import React, { useState } from "react";
import { Search, X, History, Clock, Tag, ChevronDown } from "lucide-react";
import { Card, CardContent } from "../../ui/Card";
import { Button } from "../../ui/Button";

/**
 * Advanced Search Panel Component
 * Provides enhanced search capabilities with history, suggestions, and advanced filters
 */
const AdvancedSearchPanel = ({
  value = "",
  onChange,
  onSearch,
  onClear,
  recentSearches = [],
  searchSuggestions = [],
  isOpen = false,
  onToggle,
  className = "",
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showHistory, setShowHistory] = useState(false);

  // Handle input change with local state
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  // Handle search submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(localValue);
  };

  // Handle selecting a recent search
  const handleSelectRecent = (searchTerm) => {
    setLocalValue(searchTerm);
    onChange?.(searchTerm);
    onSearch?.(searchTerm);
    setShowHistory(false);
  };

  // Handle clearing the search
  const handleClear = () => {
    setLocalValue("");
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={localValue}
            onChange={handleChange}
            placeholder="Ürün adı, SKU, barkod veya açıklama ile ara..."
            className="w-full pl-10 pr-20 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onFocus={() => setShowHistory(true)}
          />
          <div className="absolute right-2 flex items-center space-x-1">
            {localValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <History className="h-4 w-4" />
            </button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="ml-1 px-3 py-1"
            >
              Ara
            </Button>
          </div>
        </div>
      </form>

      {/* Search History and Suggestions Dropdown */}
      {showHistory && (isOpen || localValue) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-30">
          <CardContent className="p-0">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-medium text-gray-500">
                    Son Aramalar
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Temizle
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => handleSelectRecent(search.term)}
                    >
                      <div className="flex items-center">
                        <Clock className="h-3.5 w-3.5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">
                          {search.term}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {search.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {searchSuggestions.length > 0 && (
              <div className="p-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">
                  Öneriler
                </h3>
                <div className="space-y-1">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center p-1.5 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => handleSelectRecent(suggestion)}
                    >
                      <Search className="h-3.5 w-3.5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Search Options */}
            <div className="p-2 border-t border-gray-100">
              <div
                className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-md cursor-pointer"
                onClick={onToggle}
              >
                <div className="flex items-center">
                  <Tag className="h-3.5 w-3.5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-blue-600">
                    Gelişmiş Arama
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-blue-500 transition-transform ${
                    isOpen ? "transform rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearchPanel;