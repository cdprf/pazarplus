import React from "react";
import { Eye, Edit, Trash2, ArrowUpDown } from "lucide-react";

const SimpleProductTable = ({
  products = [],
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  sortField,
  sortOrder,
  onSort,
}) => {
  const handleSort = (field) => {
    onSort?.(field);
  };

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
    <table className="table table-sortable table-selectable">
      <thead className="table-header">
        <tr>
          <th className="table-th table-th-checkbox">
            <input 
              type="checkbox" 
              className="table-checkbox"
              checked={selectedProducts.length === products.length && products.length > 0}
              onChange={() => onSelectAll?.()}
            />
          </th>
          <th className="table-th table-th-sortable" onClick={() => handleSort('name')}>
            Product
            <ArrowUpDown className="h-4 w-4 ml-1 inline" />
          </th>
          <th className="table-th table-th-sortable" onClick={() => handleSort('sku')}>
            SKU
            <ArrowUpDown className="h-4 w-4 ml-1 inline" />
          </th>
          <th className="table-th table-th-sortable" onClick={() => handleSort('price')}>
            Price
            <ArrowUpDown className="h-4 w-4 ml-1 inline" />
          </th>
          <th className="table-th table-th-sortable" onClick={() => handleSort('stockQuantity')}>
            Stock
            <ArrowUpDown className="h-4 w-4 ml-1 inline" />
          </th>
          <th className="table-th">Status</th>
          <th className="table-th">Category</th>
          <th className="table-th">Actions</th>
        </tr>
      </thead>
      <tbody className="table-body">
        {products.map((product) => (
          <tr key={product.id} className="table-row">
            <td className="table-td">
              <input 
                type="checkbox" 
                className="table-checkbox"
                checked={selectedProducts.includes(product.id)}
                onChange={() => onSelectProduct?.(product.id)}
              />
            </td>
            <td className="table-td">
              <div className="flex items-center">
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-10 w-10 rounded-md object-cover mr-3 cursor-pointer"
                    onClick={() => onImageClick?.(product.images[0], product.name, product)}
                  />
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {product.name}
                  </div>
                  {product.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {product.description}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="table-td">
              <span className="font-mono text-sm">{product.sku}</span>
            </td>
            <td className="table-td">
              <div className="currency-display">
                <span className="currency-amount">{product.price}</span>
                <span className="currency-code">TRY</span>
              </div>
            </td>
            <td className="table-td">
              <span className={`${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                {product.stockQuantity}
              </span>
            </td>
            <td className="table-td">
              <span className={`badge ${getStatusBadge(product.status)}`}>
                {product.status === 'active' ? 'Active' : 
                 product.status === 'inactive' ? 'Inactive' : 
                 product.status === 'draft' ? 'Draft' : 
                 product.status}
              </span>
            </td>
            <td className="table-td">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {product.category}
              </span>
            </td>
            <td className="table-td">
              <div className="table-actions">
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SimpleProductTable;