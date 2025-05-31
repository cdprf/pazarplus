import React, { memo, useMemo } from "react";

// Performance optimization wrapper for sidebar navigation
const SidebarPerformanceOptimization = memo(({ children }) => {
  return <div className="sidebar-navigation-wrapper">{children}</div>;
});

SidebarPerformanceOptimization.displayName = "SidebarPerformanceOptimization";

// Memoized navigation item component to prevent unnecessary re-renders
export const MemoizedNavigationItem = memo(
  ({ item, location, onNavigate, isCollapsed }) => {
    const isActive = useMemo(() => {
      if (item.href === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(item.href);
    }, [item.href, location.pathname]);

    return (
      <div className={`navigation-item ${isActive ? "active" : ""}`}>
        {/* Navigation item content would go here */}
      </div>
    );
  }
);

MemoizedNavigationItem.displayName = "MemoizedNavigationItem";

export { SidebarPerformanceOptimization };
export default SidebarPerformanceOptimization;
