import React from "react";
import { Globe } from "lucide-react";
import { Badge, Tooltip } from "../../ui";

// Platform configuration
const PLATFORM_CONFIG = {
  trendyol: {
    label: "Trendyol",
    variant: "warning",
    color: "#F27A1A",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-orange-500" />,
  },
  hepsiburada: {
    label: "Hepsiburada",
    variant: "info",
    color: "#FF6000",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-blue-500" />,
  },
  n11: {
    label: "N11",
    variant: "secondary",
    color: "#A855F7",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-purple-500" />,
  },
  amazon: {
    label: "Amazon",
    variant: "primary",
    color: "#FF9900",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-yellow-500" />,
  },
  local: {
    label: "Yerel",
    variant: "outline",
    color: "#6B7280",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  },
  csv: {
    label: "CSV",
    variant: "outline",
    color: "#6B7280",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  },
};

/**
 * Enhanced platform badges function that shows source platform + variant platforms
 * @param {Object} product - Product object
 * @returns {Array} Array of platform objects with enhanced information
 */
export const getEnhancedPlatformBadges = (product) => {
  const platformsMap = new Map();

  // First, add source platform (where the product originally came from)
  if (product.sourcePlatform && PLATFORM_CONFIG[product.sourcePlatform]) {
    platformsMap.set(product.sourcePlatform, {
      ...PLATFORM_CONFIG[product.sourcePlatform],
      isSource: true,
      connectionName: product.connectionName,
      sku: product.sku,
    });
  }

  // Add platforms from sources array (for products imported from platforms)
  if (product.sources && Array.isArray(product.sources)) {
    product.sources.forEach((source) => {
      if (source.platform && PLATFORM_CONFIG[source.platform]) {
        platformsMap.set(source.platform, {
          ...PLATFORM_CONFIG[source.platform],
          isSource: !platformsMap.has(source.platform), // Mark as source if not already added
          connectionName: source.connectionName,
          sku: source.sku,
          stockQuantity: source.stockQuantity,
        });
      }
    });
  }

  // Add platforms from platform variants (where this product has variants published)
  if (product.platformVariants && Array.isArray(product.platformVariants)) {
    product.platformVariants.forEach((variant) => {
      if (variant.platform && PLATFORM_CONFIG[variant.platform]) {
        if (!platformsMap.has(variant.platform)) {
          platformsMap.set(variant.platform, {
            ...PLATFORM_CONFIG[variant.platform],
            isSource: false,
            isVariant: true,
            isPublished: variant.isPublished,
            syncStatus: variant.syncStatus,
            platformSku: variant.platformSku,
          });
        } else {
          // Update existing entry to show it has variants
          const existing = platformsMap.get(variant.platform);
          existing.isVariant = true;
          existing.isPublished = variant.isPublished;
          existing.syncStatus = variant.syncStatus;
          existing.platformSku = variant.platformSku;
        }
      }
    });
  }

  // Add platforms from legacy platforms field
  if (product.platforms && typeof product.platforms === "object") {
    Object.entries(product.platforms).forEach(([platformKey, platformData]) => {
      if (
        platformData?.enabled &&
        PLATFORM_CONFIG[platformKey] &&
        !platformsMap.has(platformKey)
      ) {
        platformsMap.set(platformKey, {
          ...PLATFORM_CONFIG[platformKey],
          isSource: false,
          isVariant: true,
          sku: platformData.platformSku,
          price: platformData.price,
        });
      }
    });
  }

  // If no platforms found, show as local
  if (platformsMap.size === 0) {
    platformsMap.set("local", {
      ...PLATFORM_CONFIG.local,
      isSource: true,
      isVariant: false,
    });
  }

  return Array.from(platformsMap.values());
};

/**
 * Enhanced Platform Badges Component
 * Shows source platform plus any platforms where the product has variants
 * @param {Object} props
 * @param {Object} props.product - Product object
 * @param {string} props.size - Badge size ('sm' | 'md' | 'lg')
 * @param {number} props.maxVisible - Maximum number of badges to show before truncating
 * @returns {JSX.Element}
 */
export const EnhancedPlatformBadges = ({
  product,
  size = "sm",
  maxVisible = 3,
}) => {
  const platforms = getEnhancedPlatformBadges(product);

  if (platforms.length === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  const visiblePlatforms = platforms.slice(0, maxVisible);
  const hiddenCount = platforms.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visiblePlatforms.map((platform, index) => {
        const key = `${platform.label}-${index}`;

        // Determine badge variant based on status
        let badgeVariant = platform.variant;
        let statusIndicator = null;
        let title = platform.label;

        if (platform.isSource) {
          title += " (Kaynak Platform)";
        }

        if (platform.isVariant) {
          if (platform.isPublished) {
            badgeVariant = "success";
            statusIndicator = (
              <span className="w-2 h-2 bg-green-500 rounded-full ml-1" />
            );
            title += " - Varyant Yayında";
          } else if (platform.syncStatus === "syncing") {
            badgeVariant = "info";
            statusIndicator = (
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-1" />
            );
            title += " - Senkronize Ediliyor";
          } else {
            title += " - Varyant Mevcut";
          }
        }

        if (platform.connectionName) {
          title += ` (${platform.connectionName})`;
        }

        if (platform.sku || platform.platformSku) {
          title += ` - SKU: ${platform.sku || platform.platformSku}`;
        }

        const badgeSize =
          size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs";

        return (
          <Tooltip key={key} content={title}>
            <Badge
              variant={badgeVariant}
              className={`flex items-center gap-1 ${badgeSize} cursor-help`}
            >
              {platform.icon}
              <span>{platform.label}</span>
              {statusIndicator}
            </Badge>
          </Tooltip>
        );
      })}

      {hiddenCount > 0 && (
        <Badge
          variant="secondary"
          className={`${size === "sm" ? "text-xs" : "text-xs"}`}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
};

export default EnhancedPlatformBadges;
