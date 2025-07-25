import React, { Suspense } from "react";
import LoadingSkeleton from "../ui/LoadingSkeleton";

/**
 * Optimized lazy route wrapper with performance monitoring
 */
const LazyRoute = ({ component: Component, fallback, ...props }) => {
  const defaultFallback = (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "60vh" }}
    >
      <LoadingSkeleton />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <Component {...props} />
    </Suspense>
  );
};

export default LazyRoute;
