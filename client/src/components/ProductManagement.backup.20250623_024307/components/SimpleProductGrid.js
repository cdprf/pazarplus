import React from "react";
import { Eye, Edit, Trash2 } from "lucide-react";

const SimpleProductGrid = ({
  products = [],
  selectedProducts = [],
  onSelectProduct,
  onView,
  onEdit,
  onDelete,
  onImageClick,
}) => {
  const getStatusBadge = (status) => {
    const statusMap = {
      active: "badge-success",
      inactive: "badge-danger", 
      draft: "badge-warning",
      pending: "badge-info"
    };
    return statusMap[status] || "badge-secondary";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <div key={product.id} className="card card-interactive">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <input 
                type="checkbox" 
                className="table-checkbox"
                checked={selectedProducts.includes(product.id)}
                onChange={() => onSelectProduct?.(product.id)}
              />
              <span className={`badge ${getStatusBadge(product.status)}`}>
                {product.status === 'active' ? 'Active' : 
                 product.status === 'inactive' ? 'Inactive' : 
                 product.status === 'draft' ? 'Draft' : 
                 product.status}
              </span>
            </div>
          </div>
          
          <div className="card-body">
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-48 object-cover rounded-md mb-4 cursor-pointer"
                onClick={() => onImageClick?.(product.images[0], product.name, product)}
              />
            )}
            
            <h3 className="card-title text-base mb-2">{product.name}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                <span className="font-mono">{product.sku}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Price:</span>
                <div className="currency-display">
                  <span className="currency-amount">{product.price}</span>
                  <span className="currency-code">TRY</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                <span className={`${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {product.stockQuantity}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                <span className="text-sm">{product.category}</span>
              </div>
            </div>
            
            {product.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          
          <div className="card-footer">
            <div className="card-actions">
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => onView?.(product)}
                title="View"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => onEdit?.(product)}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button 
                className="btn btn-sm btn-ghost text-red-600 hover:text-red-700"
                onClick={() => onDelete?.(product.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimpleProductGrid;