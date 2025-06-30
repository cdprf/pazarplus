import React from "react";

/**
 * Analytics Skeleton Loaders
 * Provides consistent loading states for analytics components
 */

// Base skeleton component
const SkeletonBase = ({
  width = "100%",
  height = "20px",
  className = "",
  animate = true,
}) => (
  <div
    className={`bg-gray-200 rounded ${
      animate ? "animate-pulse" : ""
    } ${className}`}
    style={{ width, height }}
  />
);

// Metric card skeleton
export const MetricCardSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow border">
    <div className="flex items-center justify-between mb-4">
      <SkeletonBase width="60%" height="16px" />
      <SkeletonBase width="24px" height="24px" className="rounded-full" />
    </div>
    <SkeletonBase width="40%" height="32px" className="mb-2" />
    <SkeletonBase width="30%" height="14px" />
  </div>
);

// Chart skeleton
export const ChartSkeleton = ({ height = "300px" }) => (
  <div className="bg-white p-6 rounded-lg shadow border">
    <div className="flex items-center justify-between mb-4">
      <SkeletonBase width="40%" height="20px" />
      <SkeletonBase width="80px" height="32px" className="rounded" />
    </div>
    <div className="relative" style={{ height }}>
      <SkeletonBase width="100%" height="100%" className="rounded" />
      {/* Chart bars simulation */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between space-x-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBase
            key={i}
            width="12%"
            height={`${Math.random() * 60 + 20}%`}
            className="bg-gray-300"
          />
        ))}
      </div>
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white rounded-lg shadow border overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 border-b p-4">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBase key={i} width="20%" height="16px" />
        ))}
      </div>
    </div>
    {/* Rows */}
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBase
                key={colIndex}
                width={colIndex === 0 ? "25%" : "18%"}
                height="14px"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Dashboard skeleton - combines multiple skeleton types
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase width="200px" height="32px" />
        <SkeletonBase width="300px" height="16px" />
      </div>
      <SkeletonBase width="120px" height="40px" className="rounded" />
    </div>

    {/* Metrics grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>

    {/* Charts section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table section */}
    <TableSkeleton />
  </div>
);

// Analytics page skeleton
export const AnalyticsPageSkeleton = () => (
  <div className="container-fluid py-4">
    <div className="row mb-4">
      <div className="col">
        <SkeletonBase width="250px" height="36px" className="mb-3" />
        <div className="d-flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBase
              key={i}
              width="80px"
              height="32px"
              className="rounded"
            />
          ))}
        </div>
      </div>
    </div>

    <div className="row g-4">
      <div className="col-12">
        <DashboardSkeleton />
      </div>
    </div>
  </div>
);

// Loading overlay for existing components
export const LoadingOverlay = ({
  isLoading,
  children,
  skeletonComponent: SkeletonComponent,
}) => {
  if (isLoading && SkeletonComponent) {
    return <SkeletonComponent />;
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <span className="text-sm text-gray-600">Loading analytics...</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// Progressive loading hook
export const useProgressiveLoading = (steps = []) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  const nextStep = React.useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        setIsComplete(true);
        return prev;
      }
      return next;
    });
  }, [steps.length]);

  const reset = React.useCallback(() => {
    setCurrentStep(0);
    setIsComplete(false);
  }, []);

  return {
    currentStep,
    currentStepName: steps[currentStep],
    progress: steps.length > 0 ? (currentStep / steps.length) * 100 : 0,
    isComplete,
    nextStep,
    reset,
  };
};

const AnalyticsSkeletons = {
  SkeletonBase,
  MetricCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  AnalyticsPageSkeleton,
  LoadingOverlay,
  useProgressiveLoading,
};

export default AnalyticsSkeletons;
