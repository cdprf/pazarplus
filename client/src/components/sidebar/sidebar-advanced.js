// Complete Implementation of throttle and isExpanded Features
// Add these to your sidebar-advanced.js file

import React, {
  memo,
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import { debounce, throttle } from "lodash";
import { Link } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "../../utils/cn";
import { Badge } from "../ui";
import { SidebarSection } from "./sidebar-components";

const MemoizedSidebarLink = memo(
  ({ item, isActive, onNavigate, isCollapsed, level = 0 }) => {
    const [showSubItems, setShowSubItems] = useState(isActive);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const handleClick = async (e) => {
      if (hasSubItems && !isCollapsed) {
        e.preventDefault();
        setShowSubItems(!showSubItems);
      }

      if (onNavigate) onNavigate();
    };

    return (
      <div className="space-y-1">
        <Link
          to={item.href}
          onClick={
            hasSubItems && !isCollapsed ? handleClick : () => handleClick()
          }
          className={cn(
            "nav-item group relative block px-3 py-2.5 rounded-lg text-sm font-medium",
            "transition-all duration-200 ease-in-out transform",
            "hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]",
            isActive && !hasSubItems
              ? "nav-item-active bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
            isCollapsed && "justify-center px-2 py-3"
          )}
          data-tooltip={isCollapsed ? item.name : undefined}
        >
          <div className="flex items-center relative">
            <item.icon
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isCollapsed ? "mr-0" : "mr-3"
              )}
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="truncate font-medium">{item.name}</span>
                {item.badge && (
                  <Badge variant="info" size="sm" className="ml-2">
                    {item.badge}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.isActive === nextProps.isActive &&
      prevProps.isCollapsed === nextProps.isCollapsed &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.badge === nextProps.item.badge &&
      prevProps.item.href === nextProps.item.href
    );
  }
);

// Enhanced Mobile Detection Hook with throttled resize
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize with current window size
    return typeof window !== "undefined" ? window.innerWidth < 1024 : false;
  });

  // ✅ Using throttle for performance optimization
  const throttledResize = useMemo(
    () =>
      throttle(() => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);

        // Optional: Add analytics tracking
        if (window.gtag) {
          window.gtag("event", "screen_size_change", {
            screen_type: mobile ? "mobile" : "desktop",
            screen_width: window.innerWidth,
          });
        }
      }, 150), // Throttle to max 150ms intervals for smooth performance
    []
  );

  useEffect(() => {
    // Initial check
    throttledResize();

    // Add event listener
    window.addEventListener("resize", throttledResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", throttledResize);
      throttledResize.cancel(); // Cancel any pending throttled calls
    };
  }, [throttledResize]);

  return isMobile;
};

// Enhanced Navigation Search with Expandable Functionality
const useNavigationSearch = (navigationSections) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchIndex = useMemo(() => {
    const items = [];
    navigationSections.forEach((section) => {
      section.items?.forEach((item) => {
        items.push({
          ...item,
          sectionTitle: section.title,
          searchText: `${item.name} ${item.description || ""} ${
            section.title || ""
          }`.toLowerCase(),
        });

        item.subItems?.forEach((subItem) => {
          items.push({
            ...subItem,
            parentName: item.name,
            sectionTitle: section.title,
            searchText: `${subItem.name} ${item.name} ${
              section.title || ""
            }`.toLowerCase(),
          });
        });
      });
    });
    return items;
  }, [navigationSections]);

  // ✅ Using debounce for search performance
  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        if (!query.trim()) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);

        setTimeout(() => {
          const lowercaseQuery = query.toLowerCase();
          const results = searchIndex
            .filter((item) => item.searchText.includes(lowercaseQuery))
            .slice(0, 10);

          setSearchResults(results);
          setIsSearching(false);
        }, 150);
      }, 300), // Debounce search by 300ms
    [searchIndex]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasResults: searchResults.length > 0,
  };
};

const useAdvancedSidebarAnalytics = () => {
  const analyticsQueue = useRef([]);
  const analyticsRef = useRef({
    interactions: 0,
    mostUsedItems: {},
    sessionStartTime: Date.now(),
    collapseToggles: 0,
  });

  // ✅ Using debounce to batch analytics events
  const debouncedAnalyticsSend = useMemo(
    () =>
      debounce(() => {
        if (analyticsQueue.current.length === 0) return;

        const events = [...analyticsQueue.current];
        analyticsQueue.current = [];

        // Send batched events to analytics service
        if (window.gtag) {
          window.gtag("event", "sidebar_interaction_batch", {
            events: events,
            session_duration:
              Date.now() - analyticsRef.current.sessionStartTime,
          });
        }

        // Store in localStorage for offline analytics
        const storedAnalytics = JSON.parse(
          localStorage.getItem("sidebar_analytics") || "{}"
        );
        events.forEach((event) => {
          storedAnalytics[event.timestamp] = event;
        });

        const sortedEvents = Object.entries(storedAnalytics)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .slice(0, 100);

        localStorage.setItem(
          "sidebar_analytics",
          JSON.stringify(Object.fromEntries(sortedEvents))
        );
      }, 2000),
    []
  );

  const trackInteraction = useCallback(
    (action, itemName, metadata = {}) => {
      const analytics = analyticsRef.current;

      analytics.interactions++;

      if (itemName) {
        analytics.mostUsedItems[itemName] =
          (analytics.mostUsedItems[itemName] || 0) + 1;
      }

      if (action === "collapse_toggle") {
        analytics.collapseToggles++;
      }

      analyticsQueue.current.push({
        action,
        itemName,
        timestamp: Date.now(),
        sessionDuration: Date.now() - analytics.sessionStartTime,
        ...metadata,
      });

      debouncedAnalyticsSend();
    },
    [debouncedAnalyticsSend]
  );

  const getAnalytics = useCallback(() => {
    return {
      ...analyticsRef.current,
      sessionDuration: Date.now() - analyticsRef.current.sessionStartTime,
      queuedEvents: analyticsQueue.current.length,
    };
  }, []);

  useEffect(() => {
    return () => {
      debouncedAnalyticsSend.cancel();
    };
  }, [debouncedAnalyticsSend]);

  return { trackInteraction, getAnalytics };
};

// Enhanced Scroll Performance Hook using throttle
const useScrollPerformance = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState("down");
  const [scrollPosition, setScrollPosition] = useState(0);
  const lastScrollTop = useRef(0);

  // ✅ Using throttle for scroll performance
  const throttledScrollHandler = useMemo(
    () =>
      throttle((element) => {
        if (!element) return;

        const scrollTop = element.scrollTop;
        const direction = scrollTop > lastScrollTop.current ? "down" : "up";

        setScrollDirection(direction);
        setScrollPosition(scrollTop);
        setIsScrolling(true);

        lastScrollTop.current = scrollTop;

        // Auto-hide scrolling state after scroll stops
        setTimeout(() => setIsScrolling(false), 150);
      }, 16), // 60fps throttling for smooth scroll tracking
    []
  );

  const attachScrollListener = useCallback(
    (element) => {
      if (!element) return;

      const handleScroll = () => throttledScrollHandler(element);
      element.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        element.removeEventListener("scroll", handleScroll);
        throttledScrollHandler.cancel();
      };
    },
    [throttledScrollHandler]
  );

  return {
    isScrolling,
    scrollDirection,
    scrollPosition,
    attachScrollListener,
  };
};

// Global Keyboard Shortcuts Hook using throttle
const useGlobalKeyboardShortcuts = (
  isCollapsed,
  toggleCollapse,
  expandSearch
) => {
  // ✅ Using throttle to prevent rapid-fire keyboard events
  const throttledKeyHandler = useMemo(
    () =>
      throttle((event) => {
        // Ctrl/Cmd + B - Toggle sidebar collapse
        if ((event.ctrlKey || event.metaKey) && event.key === "b") {
          event.preventDefault();
          toggleCollapse();
          return;
        }

        // Ctrl/Cmd + K - Open search
        if ((event.ctrlKey || event.metaKey) && event.key === "k") {
          event.preventDefault();
          expandSearch();
          return;
        }

        // ESC - Close expanded elements
        if (event.key === "Escape") {
          // Close any expanded overlays
          document.dispatchEvent(new CustomEvent("close-overlays"));
          return;
        }
      }, 100), // Throttle keyboard events to prevent spam
    [toggleCollapse, expandSearch]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip if user is typing in an input
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      throttledKeyHandler(event);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      throttledKeyHandler.cancel();
    };
  }, [throttledKeyHandler]);
};

// Advanced Lazy Loading Component for Navigation Sections
const LazyNavigationSection = memo(({ sectionId, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px", // Start loading 50px before it comes into view
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasLoaded]);

  return (
    <div ref={sectionRef} className="min-h-[60px]">
      {isVisible ? (
        <SidebarSection {...props} />
      ) : (
        <div className="animate-pulse space-y-2 p-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      )}
    </div>
  );
});

// Enhanced Search Component with Advanced Features
const NavigationSearch = ({ isCollapsed, navigationSections, onNavigate }) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasResults,
  } = useNavigationSearch(navigationSections);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Enhanced keyboard navigation for search results
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (!hasResults) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && searchResults[selectedIndex]) {
            const result = searchResults[selectedIndex];
            onNavigate?.(result);
            setSearchQuery("");
            setIsExpanded(false);
            setSelectedIndex(-1);
          }
          break;
        case "Escape":
          setSearchQuery("");
          setIsExpanded(false);
          setSelectedIndex(-1);
          searchRef.current?.blur();
          break;
          default:
            break;
      }
    },
    [hasResults, searchResults, selectedIndex, onNavigate, setSearchQuery]
  );

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsExpanded(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (isCollapsed) {
    return (
      <button
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors tooltip-trigger"
        onClick={() => setIsExpanded(true)}
        title="Search navigation (Ctrl+K)"
        aria-label="Search navigation"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search navigation... (Ctrl+K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={() => setIsExpanded(true)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          aria-expanded={isExpanded}
          aria-haspopup="listbox"
          aria-controls="search-results"
          role="combobox"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Enhanced Search Results */}
      {isExpanded && (hasResults || isSearching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                <span>Searching navigation...</span>
              </div>
            </div>
          ) : hasResults ? (
            <div
              className="py-2 max-h-64 overflow-y-auto"
              ref={resultsRef}
              role="listbox"
            >
              {searchResults.map((result, index) => (
                <button
                  key={`${result.href}-${index}`}
                  onClick={() => {
                    onNavigate?.(result);
                    setSearchQuery("");
                    setIsExpanded(false);
                    setSelectedIndex(-1);
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left",
                    selectedIndex === index &&
                      "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                  )}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <result.icon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.name}
                    </div>
                    {result.parentName && (
                      <div className="text-xs text-gray-500 truncate">
                        in {result.parentName}
                      </div>
                    )}
                  </div>
                  {result.sectionTitle && (
                    <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {result.sectionTitle}
                    </div>
                  )}
                  {result.badge && (
                    <Badge variant="info" size="sm" className="ml-2">
                      {result.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <div className="text-sm text-gray-500">
                No results found for "{searchQuery}"
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Try searching for pages, features, or sections
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Progressive Web App Support Hook
const usePWASupport = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallPromptEvent(e);
      setCanInstall(true);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPromptEvent(null);
      deferredPrompt.current = null;

      // Track installation
      if (window.gtag) {
        window.gtag("event", "pwa_installed", {
          method: "browser_prompt",
        });
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt.current) return false;

    try {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;

      if (outcome === "accepted") {
        setCanInstall(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error("PWA installation failed:", error);
      return false;
    } finally {
      deferredPrompt.current = null;
      setInstallPromptEvent(null);
    }
  };

  return { canInstall, isInstalled, installApp, installPromptEvent };
};

// Advanced Notification System Hook
const useNotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  });

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (window.gtag) {
        window.gtag("event", "notification_permission", {
          permission_status: result,
        });
      }

      return result === "granted";
    } catch (error) {
      console.error("Notification permission request failed:", error);
      return false;
    }
  };

  const showNotification = useCallback(
    (title, options = {}) => {
      if (permission !== "granted") return null;

      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: options.tag || "default",
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          options.onClick?.();
        };

        notification.onclose = () => {
          options.onClose?.();
        };

        // Auto-close after specified duration
        if (options.duration && options.duration > 0) {
          setTimeout(() => notification.close(), options.duration);
        }

        return notification;
      } catch (error) {
        console.error("Failed to show notification:", error);
        return null;
      }
    },
    [permission]
  );

  const addInAppNotification = useCallback(
    (notification) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification = {
        id,
        timestamp: Date.now(),
        type: "info",
        ...notification,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 10));

      // Auto-remove after delay
      const duration = notification.duration || 5000;
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [removeNotification]
  );

  return {
    notifications,
    permission,
    requestPermission,
    showNotification,
    addInAppNotification,
    removeNotification,
    clearAllNotifications,
  };
};

// Enhanced Accessibility Features Hook
const useAccessibilityFeatures = () => {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("accessibility-preferences");
      return saved
        ? JSON.parse(saved)
        : {
            highContrast: false,
            reducedMotion: false,
            fontSize: "normal",
            announcements: true,
          };
    } catch {
      return {
        highContrast: false,
        reducedMotion: false,
        fontSize: "normal",
        announcements: true,
      };
    }
  });

  // Detect system preferences
  useEffect(() => {
    const updateSystemPreferences = () => {
      const highContrast = window.matchMedia(
        "(prefers-contrast: high)"
      ).matches;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      setPreferences((prev) => ({
        ...prev,
        systemHighContrast: highContrast,
        systemReducedMotion: reducedMotion,
      }));
    };

    updateSystemPreferences();

    const contrastQuery = window.matchMedia("(prefers-contrast: high)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    contrastQuery.addEventListener("change", updateSystemPreferences);
    motionQuery.addEventListener("change", updateSystemPreferences);

    return () => {
      contrastQuery.removeEventListener("change", updateSystemPreferences);
      motionQuery.removeEventListener("change", updateSystemPreferences);
    };
  }, []);

  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, [key]: value };
      localStorage.setItem(
        "accessibility-preferences",
        JSON.stringify(newPrefs)
      );
      return newPrefs;
    });
  }, []);

  const announceToScreenReader = useCallback(
    (message, priority = "polite") => {
      if (!preferences.announcements) return;

      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", priority);
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = message;

      document.body.appendChild(announcement);

      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    },
    [preferences.announcements]
  );

  const focusElement = useCallback(
    (selector, options = {}) => {
      const element = document.querySelector(selector);
      if (element) {
        element.focus(options);

        // Announce focus change if requested
        if (options.announce) {
          announceToScreenReader(
            `Focused on ${
              element.getAttribute("aria-label") ||
              element.textContent ||
              "element"
            }`
          );
        }
      }
    },
    [announceToScreenReader]
  );

  return {
    preferences,
    updatePreference,
    announceToScreenReader,
    focusElement,
    highContrast: preferences.highContrast || preferences.systemHighContrast,
    reducedMotion: preferences.reducedMotion || preferences.systemReducedMotion,
    fontSize: preferences.fontSize,
  };
};

// Performance Monitoring Hook with Advanced Metrics
const usePerformanceMonitoring = () => {
  const metricsRef = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    memoryUsage: [],
    navigationTiming: null,
  });

  const [performanceData, setPerformanceData] = useState(null);

  const trackRender = useCallback((componentName = "Sidebar") => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      const metrics = metricsRef.current;
      metrics.renderCount++;
      metrics.lastRenderTime = renderTime;

      // Calculate rolling average
      const count = metrics.renderCount;
      metrics.averageRenderTime =
        (metrics.averageRenderTime * (count - 1) + renderTime) / count;

      // Track slow renders (> 16ms for 60fps)
      if (renderTime > 16) {
        metrics.slowRenders++;
      }

      // Log performance warnings in development
      if (process.env.NODE_ENV === "development" && renderTime > 50) {
        console.warn(
          `Slow ${componentName} render: ${renderTime.toFixed(2)}ms`
        );
      }

      // Track memory usage periodically
      if (performance.memory && metrics.renderCount % 10 === 0) {
        metrics.memoryUsage.push({
          timestamp: Date.now(),
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        });

        // Keep only last 20 memory samples
        if (metrics.memoryUsage.length > 20) {
          metrics.memoryUsage.shift();
        }
      }
    };
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    const metrics = metricsRef.current;

    // Get navigation timing if available
    if (performance.getEntriesByType) {
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries.length > 0) {
        metrics.navigationTiming = navEntries[0];
      }
    }

    return {
      ...metrics,
      sessionDuration: Date.now() - (metrics.sessionStartTime || Date.now()),
      slowRenderPercentage:
        metrics.renderCount > 0
          ? ((metrics.slowRenders / metrics.renderCount) * 100).toFixed(2)
          : 0,
      memoryTrend:
        metrics.memoryUsage.length > 1
          ? metrics.memoryUsage[metrics.memoryUsage.length - 1].usedJSHeapSize -
            metrics.memoryUsage[0].usedJSHeapSize
          : 0,
    };
  }, []);

  // Update performance data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceData(getPerformanceMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);

  return {
    trackRender,
    getPerformanceMetrics,
    performanceData,
  };
};

// Export all enhanced components and hooks
export {
  MemoizedSidebarLink,
  LazyNavigationSection,
  NavigationSearch,
  useMobileDetection,
  useNavigationSearch,
  useAdvancedSidebarAnalytics,
  useScrollPerformance,
  useGlobalKeyboardShortcuts,
  usePWASupport,
  useNotificationSystem,
  useAccessibilityFeatures,
  usePerformanceMonitoring,
};
