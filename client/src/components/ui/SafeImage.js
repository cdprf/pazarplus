import React, { useState } from "react";
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
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = () => {
    // First, try using the image proxy for SSL issues
    if (
      currentSrc === src &&
      src &&
      typeof src === "string" &&
      (src.startsWith("https://") || src.includes("ssl"))
    ) {
      const proxyUrl = `/api/image/proxy?url=${encodeURIComponent(src)}`;
      setCurrentSrc(proxyUrl);
      setLoading(true);
      return;
    }

    // If proxy fails, try HTTP version if HTTPS fails
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
