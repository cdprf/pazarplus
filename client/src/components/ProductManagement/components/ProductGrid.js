import React from "react";
import ProductCard from "./ProductCard";

const ProductGrid = ({
  products,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  selectedProducts,
  onSelectProduct,
  showMoreMenu,
  onToggleMoreMenu,
  onInlineEdit,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onImageClick={onImageClick}
          isSelected={selectedProducts.includes(product.id)}
          onSelect={onSelectProduct}
          showMoreMenu={showMoreMenu}
          onToggleMoreMenu={onToggleMoreMenu}
          onInlineEdit={onInlineEdit}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
