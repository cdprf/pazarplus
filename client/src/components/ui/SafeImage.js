import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";

const SafeImage = ({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  onClick,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine the best initial URL to try
  const getInitialUrl = (originalSrc) => {
    if (!originalSrc || typeof originalSrc !== "string") return null;

    const knownProblematicDomains = [
      "salmanbilgisayar.sentos.com.tr",
      "n11scdn3.akamaized.net",
      "productimages.hepsiburada.net",
    ];

    // If it's from a known problematic domain, use proxy directly
    if (
      knownProblematicDomains.some((domain) => originalSrc.includes(domain))
    ) {
      return `/api/image/proxy?url=${encodeURIComponent(originalSrc)}`;
    }

    return originalSrc;
  };

  const [currentSrc, setCurrentSrc] = useState(getInitialUrl(src));

  // Reset state when src prop changes
  useEffect(() => {
    setImageError(false);
    setLoading(true);
    setCurrentSrc(getInitialUrl(src));
  }, [src]);

  const handleError = () => {
    // If we started with the proxy and it failed, try the original URL
    if (currentSrc && currentSrc.includes("/api/image/proxy")) {
      const originalUrl = new URLSearchParams(currentSrc.split("?")[1]).get(
        "url"
      );
      if (originalUrl && originalUrl !== src) {
        setCurrentSrc(originalUrl);
        setLoading(true);
        return;
      }
    }

    // If this is the original source, try proxy
    if (currentSrc === src && src && typeof src === "string") {
      const shouldUseProxy = src.startsWith("https://");

      if (shouldUseProxy && !currentSrc.includes("/api/image/proxy")) {
        const proxyUrl = `/api/image/proxy?url=${encodeURIComponent(src)}`;
        setCurrentSrc(proxyUrl);
        setLoading(true);
        return;
      }
    }

    // Try HTTP version as last resort
    if (
      currentSrc &&
      typeof currentSrc === "string" &&
      currentSrc.startsWith("https://") &&
      !currentSrc.includes("/api/image/proxy")
    ) {
      const httpUrl = currentSrc.replace("https://", "http://");
      setCurrentSrc(httpUrl);
      setLoading(true);
      return;
    }

    // If all attempts fail, show fallback
    setImageError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (imageError || !src || typeof src !== "string") {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-600 flex items-center justify-center ${
          fallbackClassName || className
        }`}
      >
        <Package className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div
          className={`bg-gray-200 dark:bg-gray-600 flex items-center justify-center ${
            fallbackClassName || className
          }`}
        >
          <div className="animate-pulse">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} ${loading ? "hidden" : ""}`}
        onError={handleError}
        onLoad={handleLoad}
        onClick={onClick}
        {...props}
      />
    </>
  );
};

export default SafeImage;
