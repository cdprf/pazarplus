import React from "react";

const SimpleFilterPanel = ({
  filters = {},
  onFilterChange,
  onClearFilters,
  categories = [],
  brands = [],
}) => {
  const handleFilterChange = (key, value) => {
    onFilterChange?.({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== "" && value !== "all");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="form-group">
        <label className="form-label">Category</label>
        <select 
          className="form-input"
          value={filters.category || ""}
          onChange={(e) => handleFilterChange("category", e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Status</label>
        <select 
          className="form-input"
          value={filters.status || ""}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Min Price</label>
        <input 
          type="number"
          className="form-input"
          placeholder="0.00"
          value={filters.minPrice || ""}
          onChange={(e) => handleFilterChange("minPrice", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Max Price</label>
        <input 
          type="number"
          className="form-input"
          placeholder="999999"
          value={filters.maxPrice || ""}
          onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Min Stock</label>
        <input 
          type="number"
          className="form-input"
          placeholder="0"
          value={filters.minStock || ""}
          onChange={(e) => handleFilterChange("minStock", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Max Stock</label>
        <input 
          type="number"
          className="form-input"
          placeholder="999999"
          value={filters.maxStock || ""}
          onChange={(e) => handleFilterChange("maxStock", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Platform</label>
        <select 
          className="form-input"
          value={filters.platform || "all"}
          onChange={(e) => handleFilterChange("platform", e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="trendyol">Trendyol</option>
          <option value="hepsiburada">Hepsiburada</option>
          <option value="n11">N11</option>
        </select>
      </div>

      <div className="form-group flex items-end">
        {hasActiveFilters && (
          <button 
            className="btn btn-ghost w-full"
            onClick={onClearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default SimpleFilterPanel;