/**
 * Image utilities for handling external images with SSL certificate issues
 */
import React from "react";

/**
 * Get the current server base URL
 */
const getServerBaseUrl = () => {
  if (process.env.REACT_APP_SERVER_HOST) {
    return `http://${process.env.REACT_APP_SERVER_HOST}`;
  }

  // In development, assume server is on same host but different port
  if (process.env.NODE_ENV === "development") {
    const currentHost = window.location.hostname;
    return `http://${currentHost}:5001`;
  }

  // In production, use same origin
  return window.location.origin;
};

/**
 * List of domains known to have SSL certificate issues
 */
const PROBLEMATIC_DOMAINS = [
  "salmanbilgisayar.sentos.com.tr",
  "sentos.com.tr",
  // Add more as needed
];

/**
 * Check if an image URL needs to be proxied due to SSL issues
 * @param {string} imageUrl - The image URL to check
 * @returns {boolean} - Whether the URL should be proxied
 */
export const shouldProxyImage = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return false;

  // Don't proxy data URLs, relative URLs, or blob URLs
  if (
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("/") ||
    imageUrl.startsWith("./") ||
    imageUrl.startsWith("blob:")
  ) {
    return false;
  }

  // Don't proxy localhost or local network URLs
  if (
    imageUrl.includes("localhost") ||
    imageUrl.includes("127.0.0.1") ||
    /192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\./.test(imageUrl)
  ) {
    return false;
  }

  // Check for known problematic domains
  return PROBLEMATIC_DOMAINS.some((domain) => imageUrl.includes(domain));
};

/**
 * Convert an external image URL to use the local image proxy
 * @param {string} imageUrl - The original external image URL
 * @returns {string} - The proxied image URL or original URL if no proxy needed
 */
export const getProxiedImageUrl = (imageUrl) => {
  if (!imageUrl || !shouldProxyImage(imageUrl)) {
    return imageUrl;
  }

  const baseUrl = getServerBaseUrl();
  const encodedUrl = encodeURIComponent(imageUrl);
  return `${baseUrl}/api/image-proxy?url=${encodedUrl}`;
};

/**
 * Component wrapper for images that automatically handles SSL certificate issues
 */
export const SafeImage = ({ src, alt, onError, onLoad, ...props }) => {
  const [imageSrc, setImageSrc] = React.useState(src);
  const [hasTriedProxy, setHasTriedProxy] = React.useState(false);

  // Reset state when src changes
  React.useEffect(() => {
    setImageSrc(src);
    setHasTriedProxy(false);
  }, [src]);

  const handleError = (event) => {
    // If original image failed and we haven't tried proxy yet, try proxy
    if (!hasTriedProxy && shouldProxyImage(src)) {
      console.log(`Image failed to load, trying proxy: ${src}`);
      setHasTriedProxy(true);
      setImageSrc(getProxiedImageUrl(src));
    } else {
      // Call original onError if provided
      if (onError) {
        onError(event);
      }
    }
  };

  const handleLoad = (event) => {
    if (onLoad) {
      onLoad(event);
    }
  };

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

/**
 * Hook for managing image loading with automatic proxy fallback
 */
export const useImageWithProxy = (originalUrl) => {
  const [src, setSrc] = React.useState(originalUrl);
  const [isLoading, setIsLoading] = React.useState(!!originalUrl);
  const [hasError, setHasError] = React.useState(false);
  const [hasTriedProxy, setHasTriedProxy] = React.useState(false);

  React.useEffect(() => {
    if (!originalUrl) {
      setSrc("");
      setIsLoading(false);
      setHasError(false);
      setHasTriedProxy(false);
      return;
    }

    // Start with original URL
    setSrc(originalUrl);
    setIsLoading(true);
    setHasError(false);
    setHasTriedProxy(false);
  }, [originalUrl]);

  const handleError = React.useCallback(() => {
    if (!hasTriedProxy && shouldProxyImage(originalUrl)) {
      console.log(`Image failed to load, trying proxy: ${originalUrl}`);
      setHasTriedProxy(true);
      setSrc(getProxiedImageUrl(originalUrl));
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [originalUrl, hasTriedProxy]);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  return {
    src,
    isLoading,
    hasError,
    onError: handleError,
    onLoad: handleLoad,
  };
};

// For backwards compatibility, also export individual functions
const imageUtils = {
  shouldProxyImage,
  getProxiedImageUrl,
  SafeImage,
  useImageWithProxy,
  getServerBaseUrl,
};

export default imageUtils;
