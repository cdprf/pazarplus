import React from "react";

const LoadingState = () => (
  <div className="text-center py-12">
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Ürünler yükleniyor
    </h3>
    <p className="text-gray-600">
      Ürünleriniz hazırlanıyor, lütfen bekleyin...
    </p>
  </div>
);

export default LoadingState;
