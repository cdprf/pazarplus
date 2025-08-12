# Pazar+ Design System Consistency Guide

![Design System](https://img.shields.io/badge/design%20system-comprehensive-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)
![Consistency](https://img.shields.io/badge/consistency-enforced-success.svg)

## **Design System Implementation Prompt**

You are working on the Pazar+ e-commerce order management platform. Ensure ALL components, pages, and UI elements follow this comprehensive design system for consistency across the entire application.

## **Core Design Principles**

### **1. Visual Hierarchy**

- Use consistent heading sizes: `text-3xl`, `text-2xl`, `text-xl`, `text-lg` for h1-h4
- Apply proper font weights: `font-bold` for headings, `font-medium` for emphasis, `font-normal` for body
- Maintain consistent spacing with Tailwind scale: `space-y-6`, `space-y-4`, `space-y-2`

### **2. Enhanced Color System**

```css
/* Primary Colors */
--primary-50: #eff6ff
--primary-100: #dbeafe
--primary-500: #3b82f6 (Main brand color)
--primary-600: #2563eb (Hover states)
--primary-700: #1d4ed8 (Active states)
--primary-900: #1e3a8a

/* Status Colors */
--success-50: #f0fdf4
--success-500: #22c55e (Success states)
--success-600: #16a34a

--warning-50: #fffbeb
--warning-500: #f59e0b (Warning states)
--warning-600: #d97706

--danger-50: #fef2f2
--danger-500: #ef4444 (Error/danger states)
--danger-600: #dc2626

/* Neutral Colors */
--gray-50 to --gray-900 (Full grayscale palette)

/* Semantic Colors */
--info-500: #06b6d4
--indigo-500: #6366f1
--purple-500: #8b5cf6
--pink-500: #ec4899
```

### **3. Dark Mode Implementation**

- ALWAYS implement both light and dark themes using CSS variables
- Use `dark:` prefixes for all dark mode variants
- Test theme switching functionality in every component
- Apply backdrop blur effects: `backdrop-blur-xl` for overlays

## **Enhanced Component Standards**

### **Button System**

```jsx
// Primary Button
<button className="btn btn-primary">
  Primary Action
</button>

// Secondary Button
<button className="btn btn-secondary">
  Secondary Action
</button>

// Ghost Button
<button className="btn btn-ghost">
  Ghost Action
</button>

// Danger Button
<button className="btn btn-danger">
  Delete Action
</button>

// Loading State
<button className="btn btn-primary" disabled>
  <LoadingSpinner className="mr-2" />
  Loading...
</button>

// With Icon
<button className="btn btn-primary">
  <PlusIcon className="h-4 w-4 mr-2" />
  Add Item
</button>
```

### **Enhanced Card Components**

```jsx
// Basic Card
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Card Title</h3>
    <p className="card-subtitle">Optional subtitle</p>
  </div>
  <div className="card-body">
    {/* Content */}
  </div>
  <div className="card-footer">
    <div className="card-actions">
      <button className="btn btn-ghost">Cancel</button>
      <button className="btn btn-primary">Save</button>
    </div>
  </div>
</div>

// Interactive Card with hover effects
<div className="card card-interactive">
  {/* Content */}
</div>

// Status Card
<div className="card card-status-success">
  {/* Success content */}
</div>
```

### **Form Elements**

```jsx
// Form Group with Label and Input
<div className="form-group">
  <label className="form-label" htmlFor="email">
    Email Address
    <span className="form-required">*</span>
  </label>
  <input 
    id="email"
    type="email"
    className="form-input" 
    placeholder="Enter your email"
    required
  />
  <div className="form-help">
    We'll never share your email with anyone else.
  </div>
</div>

// Input with validation states
<div className="form-group">
  <label className="form-label">Username</label>
  <input className="form-input form-input-error" />
  <div className="form-error">Username is required</div>
</div>

<div className="form-group">
  <label className="form-label">Valid Input</label>
  <input className="form-input form-input-success" />
  <div className="form-success">Looks good!</div>
</div>
```

### **Enhanced Status Badges**

```jsx
<span className="badge badge-pending">Pending</span>
<span className="badge badge-processing">Processing</span>
<span className="badge badge-shipped">Shipped</span>
<span className="badge badge-delivered">Delivered</span>
<span className="badge badge-cancelled">Cancelled</span>

// With icons
<span className="badge badge-success">
  <CheckIcon className="h-3 w-3 mr-1" />
  Completed
</span>

// Pill variant
<span className="badge badge-pill badge-info">New Feature</span>

// Large variant
<span className="badge badge-lg badge-warning">Important</span>
```

### **Navigation Components**

```jsx
// Sidebar Navigation Item
<a className="nav-item nav-item-active">
  <HomeIcon className="nav-icon" />
  <span className="nav-text">Dashboard</span>
  <span className="nav-badge">3</span>
</a>

// Breadcrumb Navigation
<nav className="breadcrumb">
  <a href="/" className="breadcrumb-item">Home</a>
  <span className="breadcrumb-separator">/</span>
  <a href="/orders" className="breadcrumb-item">Orders</a>
  <span className="breadcrumb-separator">/</span>
  <span className="breadcrumb-item breadcrumb-current">Order Details</span>
</nav>

// Tab Navigation
<div className="tabs">
  <button className="tab tab-active">Overview</button>
  <button className="tab">Details</button>
  <button className="tab">History</button>
</div>
```

## 📱 **Enhanced Layout & Responsive Design**

### **Container System**

```jsx
// Page Container
<div className="page-container">
  <div className="page-header">
    <h1 className="page-title">Page Title</h1>
    <div className="page-actions">
      <button className="btn btn-primary">Primary Action</button>
    </div>
  </div>
  <div className="page-content">
    {/* Main content */}
  </div>
</div>

// Section Container
<section className="section">
  <div className="section-header">
    <h2 className="section-title">Section Title</h2>
    <p className="section-subtitle">Section description</p>
  </div>
  <div className="section-content">
    {/* Section content */}
  </div>
</section>
```

### **Grid System**

```jsx
// Responsive Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* Grid items */}
</div>

// Dashboard Grid
<div className="dashboard-grid">
  <div className="dashboard-stat">
    <div className="stat-icon stat-icon-primary">
      <ShoppingCartIcon />
    </div>
    <div className="stat-content">
      <div className="stat-value">1,234</div>
      <div className="stat-label">Total Orders</div>
    </div>
  </div>
</div>
```

## 🎭 **Enhanced Animation & Transitions**

### **Standard Transitions**

```css
.transition-base { transition: all 0.2s ease-in-out; }
.transition-colors { transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out; }
.transition-transform { transition: transform 0.2s ease-in-out; }
.transition-shadow { transition: box-shadow 0.3s ease-in-out; }
```

### **Hover Effects**

```jsx
// Card hover
<div className="card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

// Button hover with ripple effect
<button className="btn btn-primary hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200">

// Link hover
<a className="text-primary hover:text-primary-600 hover:underline transition-colors">
```

### **Loading & Animation States**

```jsx
// Skeleton Loader
<div className="skeleton skeleton-text"></div>
<div className="skeleton skeleton-avatar"></div>
<div className="skeleton skeleton-card"></div>

// Fade in animation
<div className="animate-fade-in">Content</div>

// Slide in animation
<div className="animate-slide-in-left">Content</div>

// Pulse for loading states
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-full rounded"></div>
```

## 🖱️ **Enhanced Interactive Elements**

### **Dropdown Menus**

```jsx
<div className="dropdown">
  <button className="dropdown-trigger">
    Options
    <ChevronDownIcon className="dropdown-chevron" />
  </button>
  <div className="dropdown-content">
    <a className="dropdown-item">
      <EditIcon className="dropdown-icon" />
      Edit
    </a>
    <a className="dropdown-item">
      <ShareIcon className="dropdown-icon" />
      Share
    </a>
    <div className="dropdown-divider"></div>
    <a className="dropdown-item dropdown-item-danger">
      <TrashIcon className="dropdown-icon" />
      Delete
    </a>
  </div>
</div>
```

### **Modal System**

```jsx
<div className="modal modal-open">
  <div className="modal-backdrop" onClick={closeModal}></div>
  <div className="modal-container">
    <div className="modal-header">
      <h3 className="modal-title">Modal Title</h3>
      <button className="modal-close" onClick={closeModal}>
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
    <div className="modal-body">
      {/* Modal content */}
    </div>
    <div className="modal-footer">
      <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
      <button className="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### **Toast Notifications**

```jsx
<div className="toast toast-success">
  <div className="toast-icon">
    <CheckCircleIcon className="h-5 w-5" />
  </div>
  <div className="toast-content">
    <div className="toast-title">Success!</div>
    <div className="toast-message">Your changes have been saved.</div>
  </div>
  <button className="toast-close">
    <XMarkIcon className="h-4 w-4" />
  </button>
</div>

<div className="toast toast-error">
  <div className="toast-icon">
    <ExclamationCircleIcon className="h-5 w-5" />
  </div>
  <div className="toast-content">
    <div className="toast-title">Error!</div>
    <div className="toast-message">Something went wrong.</div>
  </div>
  <button className="toast-close">
    <XMarkIcon className="h-4 w-4" />
  </button>
</div>
```

## **E-commerce Specific Components**

### **Order Status Pipeline**

```jsx
// Order Status Flow
<div className="order-pipeline">
  <div className="pipeline-step pipeline-step-completed">
    <div className="pipeline-icon">
      <CheckIcon className="h-4 w-4" />
    </div>
    <span className="pipeline-label">New</span>
  </div>
  <div className="pipeline-connector pipeline-connector-completed"></div>
  <div className="pipeline-step pipeline-step-active">
    <div className="pipeline-icon">
      <ClockIcon className="h-4 w-4" />
    </div>
    <span className="pipeline-label">Processing</span>
  </div>
  <div className="pipeline-connector"></div>
  <div className="pipeline-step">
    <div className="pipeline-icon">
      <TruckIcon className="h-4 w-4" />
    </div>
    <span className="pipeline-label">Shipped</span>
  </div>
</div>
```

### **Platform Badges**

```jsx
// Platform-specific badges with icons
<span className="platform-badge platform-trendyol">
  <TrendyolIcon className="platform-icon" />
  Trendyol
</span>

<span className="platform-badge platform-hepsiburada">
  <HepsiburadaIcon className="platform-icon" />
  Hepsiburada
</span>

<span className="platform-badge platform-n11">
  <N11Icon className="platform-icon" />
  N11
</span>
```

### **Currency Display**

```jsx
// Consistent currency formatting
<div className="currency-display">
  <span className="currency-amount">1,234.56</span>
  <span className="currency-code">TRY</span>
</div>

// Large currency display
<div className="currency-display currency-display-lg">
  <span className="currency-amount">1,234.56</span>
  <span className="currency-code">TRY</span>
</div>
```

### **Shipping Address Card**

```jsx
<div className="shipping-address-card">
  <div className="address-header">
    <MapPinIcon className="address-icon" />
    <span className="address-title">Shipping Address</span>
  </div>
  <div className="address-content">
    <div className="address-name">John Doe</div>
    <div className="address-street">123 Main Street</div>
    <div className="address-city">Istanbul, Turkey 34000</div>
    <div className="address-phone">
      <PhoneIcon className="h-4 w-4 mr-1" />
      +90 555 123 4567
    </div>
  </div>
</div>
```

## 📊 **Advanced Data Display**

### **Enhanced Table System**

```jsx
// Advanced table with all features
<div className="data-table">
  <div className="table-toolbar">
    <div className="table-search">
      <SearchIcon className="search-icon" />
      <input className="search-input" placeholder="Search orders..." />
    </div>
    <div className="table-filters">
      <select className="filter-select">
        <option>All Status</option>
        <option>Pending</option>
        <option>Processing</option>
      </select>
    </div>
    <div className="table-actions">
      <div className="bulk-actions">
        <span className="bulk-count">5 selected</span>
        <button className="btn btn-sm btn-primary">Accept</button>
        <button className="btn btn-sm btn-danger">Delete</button>
      </div>
    </div>
  </div>
  
  <div className="table-container">
    <table className="table table-sortable table-selectable">
      <thead className="table-header">
        <tr>
          <th className="table-th table-th-checkbox">
            <input type="checkbox" className="table-checkbox" />
          </th>
          <th className="table-th table-th-sortable" data-sort="orderNumber">
            Order #
            <ArrowUpDownIcon className="sort-icon" />
          </th>
          <th className="table-th">Customer</th>
          <th className="table-th table-th-sortable" data-sort="amount">
            Amount
            <ArrowUpDownIcon className="sort-icon" />
          </th>
          <th className="table-th">Actions</th>
        </tr>
      </thead>
      <tbody className="table-body">
        <tr className="table-row table-row-selected">
          <td className="table-td">
            <input type="checkbox" className="table-checkbox" checked />
          </td>
          <td className="table-td">
            <div className="order-number">#12345</div>
            <div className="order-date">2024-01-15</div>
          </td>
          <td className="table-td">
            <div className="customer-info">
              <div className="customer-name">John Doe</div>
              <div className="customer-email">john@example.com</div>
            </div>
          </td>
          <td className="table-td">
            <div className="currency-display">1,234.56 TRY</div>
          </td>
          <td className="table-td">
            <div className="table-actions">
              <button className="btn btn-sm btn-ghost">
                <EyeIcon className="h-4 w-4" />
              </button>
              <button className="btn btn-sm btn-ghost">
                <EditIcon className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div className="table-pagination">
    <div className="pagination-info">
      Showing 1-20 of 150 results
    </div>
    <div className="pagination-controls">
      <button className="btn btn-sm btn-ghost" disabled>
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <button className="btn btn-sm btn-primary">1</button>
      <button className="btn btn-sm btn-ghost">2</button>
      <button className="btn btn-sm btn-ghost">3</button>
      <button className="btn btn-sm btn-ghost">
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
</div>
```

### **Virtual Scrolling Container**

```jsx
// For large datasets
<div className="virtual-scroll-container" data-item-height="60">
  <div className="virtual-scroll-viewport">
    {/* Virtualized content */}
  </div>
</div>
```

### **Empty States**

```jsx
// Standard empty state
<div className="empty-state">
  <div className="empty-state-icon">
    <InboxIcon className="h-16 w-16" />
  </div>
  <h3 className="empty-state-title">No orders found</h3>
  <p className="empty-state-description">
    Get started by creating your first order
  </p>
  <div className="empty-state-actions">
    <button className="btn btn-primary">
      <PlusIcon className="h-4 w-4 mr-2" />
      Create Order
    </button>
  </div>
</div>

// Search empty state
<div className="empty-state empty-state-search">
  <div className="empty-state-icon">
    <SearchIcon className="h-16 w-16" />
  </div>
  <h3 className="empty-state-title">No results found</h3>
  <p className="empty-state-description">
    Try adjusting your search or filter criteria
  </p>
  <div className="empty-state-actions">
    <button className="btn btn-ghost">Clear filters</button>
  </div>
</div>
```

## ⚡ **Performance & Loading States**

### **Progressive Loading**

```jsx
// Progressive content loading
<div className="progressive-loader">
  <div className="loader-skeleton">
    <div className="skeleton skeleton-title"></div>
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-text"></div>
  </div>
  <div className="loader-content" data-loaded="false">
    {/* Actual content */}
  </div>
</div>
```

### **Enhanced Skeleton Loading**

```jsx
// Table skeleton
<div className="skeleton-table">
  <div className="skeleton-table-header">
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-text"></div>
    <div className="skeleton skeleton-text"></div>
  </div>
  <div className="skeleton-table-body">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="skeleton-table-row">
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
    ))}
  </div>
</div>

// Card skeleton
<div className="skeleton-card">
  <div className="skeleton skeleton-avatar"></div>
  <div className="skeleton skeleton-title"></div>
  <div className="skeleton skeleton-text"></div>
  <div className="skeleton skeleton-text"></div>
</div>
```

### **Loading Overlays**

```jsx
// Inline loading
<div className="loading-overlay loading-overlay-inline">
  <div className="loading-spinner loading-spinner-sm"></div>
  <span className="loading-text">Updating...</span>
</div>

// Full page loading
<div className="loading-overlay loading-overlay-fullscreen">
  <div className="loading-content">
    <div className="loading-spinner loading-spinner-lg"></div>
    <div className="loading-title">Loading orders...</div>
    <div className="loading-subtitle">Please wait</div>
  </div>
</div>

// Background sync indicator
<div className="sync-indicator">
  <div className="sync-icon">
    <RefreshIcon className="h-4 w-4 animate-spin" />
  </div>
  <span className="sync-text">Syncing...</span>
</div>
```

## **Enhanced Error Handling**

### **Error States**

```jsx
// Inline error
<div className="error-state error-state-inline">
  <div className="error-icon">
    <ExclamationTriangleIcon className="h-4 w-4" />
  </div>
  <span className="error-text">Failed to load</span>
  <button className="btn btn-sm btn-ghost error-retry">Retry</button>
</div>

// Page error
<div className="error-state error-state-page">
  <div className="error-content">
    <div className="error-icon">
      <ExclamationTriangleIcon className="h-16 w-16" />
    </div>
    <h1 className="error-title">Something went wrong</h1>
    <p className="error-description">We encountered an unexpected error.</p>
    <div className="error-actions">
      <button className="btn btn-primary">Try Again</button>
      <button className="btn btn-ghost">Go Home</button>
    </div>
  </div>
</div>

// Network error
<div className="error-state error-state-network">
  <div className="error-icon">
    <WifiIcon className="h-16 w-16" />
  </div>
  <h3 className="error-title">Connection lost</h3>
  <p className="error-description">Check your internet connection</p>
  <button className="btn btn-primary">Retry</button>
</div>
```

### **Form Validation**

```jsx
// Enhanced form validation
<div className="form-group form-group-error">
  <label className="form-label">Email Address</label>
  <div className="form-input-wrapper">
    <input className="form-input form-input-error" />
    <div className="form-input-icon">
      <ExclamationCircleIcon className="h-4 w-4" />
    </div>
  </div>
  <div className="form-error">
    <ExclamationCircleIcon className="h-3 w-3 mr-1" />
    Please enter a valid email address
  </div>
</div>

// Success validation
<div className="form-group form-group-success">
  <label className="form-label">Username</label>
  <div className="form-input-wrapper">
    <input className="form-input form-input-success" />
    <div className="form-input-icon">
      <CheckCircleIcon className="h-4 w-4" />
    </div>
  </div>
  <div className="form-success">
    <CheckCircleIcon className="h-3 w-3 mr-1" />
    Username is available
  </div>
</div>
```e="toast-icon">
    <CheckCircleIcon className="h-5 w-5" />
  </div>
  <div className="toast-content">
    <div className="toast-title">Success!</div>
    <div className="toast-message">Your changes have been saved.</div>
  </div>
  <button className="toast-close">
    <XMarkIcon className="h-4 w-4" />
  </button>
</div>
```

## ♿ **Enhanced Accessibility Standards**

### **Focus Management**

```jsx
// Focus trap for modals
const focusTrapRef = useFocusTrap(isOpen);

// Skip links
<a href="#main-content" className="skip-link">Skip to main content</a>

// Proper focus indicators
.focus-visible:focus {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900;
}
```

### **ARIA Implementation**

```jsx
// Proper labeling
<button 
  aria-label="Close modal"
  aria-describedby="modal-description"
>

// Status announcements
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Expandable content
<button
  aria-expanded={isOpen}
  aria-controls="expandable-content"
>
```

## 📊 **Enhanced Data Display**

### **Tables**

```jsx
<div className="table-container">
  <table className="table">
    <thead className="table-header">
      <tr>
        <th className="table-th">Column 1</th>
        <th className="table-th table-th-sortable" onClick={sort}>
          Column 2
          <ChevronUpDownIcon className="table-sort-icon" />
        </th>
      </tr>
    </thead>
    <tbody className="table-body">
      <tr className="table-row">
        <td className="table-td">Data 1</td>
        <td className="table-td">Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

### **Empty States**

```jsx
<div className="empty-state">
  <div className="empty-state-icon">
    <InboxIcon className="h-16 w-16 text-gray-400" />
  </div>
  <h3 className="empty-state-title">No orders found</h3>
  <p className="empty-state-description">
    Get started by creating your first order
  </p>
  <div className="empty-state-actions">
    <button className="btn btn-primary">
      <PlusIcon className="h-4 w-4 mr-2" />
      Create Order
    </button>
  </div>
</div>
```

## 🚨 **Enhanced Error Handling**

### **Error Messages**

```jsx
// Inline Error
<div className="error-inline">
  <ExclamationCircleIcon className="error-icon" />
  <span className="error-text">This field is required</span>
</div>

// Page Error
<div className="error-page">
  <div className="error-content">
    <h1 className="error-title">Something went wrong</h1>
    <p className="error-description">We encountered an unexpected error.</p>
    <div className="error-actions">
      <button className="btn btn-primary" onClick={retry}>Try Again</button>
      <button className="btn btn-ghost" onClick={goHome}>Go Home</button>
    </div>
  </div>
</div>
```

## **CSS Custom Properties Integration**

```css
/* Enhanced color system */
:root {
  /* Brand colors */
  --brand-primary: #3b82f6;
  --brand-secondary: #8b5cf6;
  --brand-accent: #06b6d4;
  
  /* Semantic colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #06b6d4;
  
  /* Surface colors */
  --surface-primary: #ffffff;
  --surface-secondary: #f8fafc;
  --surface-tertiary: #f1f5f9;
  
  /* Border colors */
  --border-primary: #e2e8f0;
  --border-secondary: #cbd5e1;
  
  /* Text colors */
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-tertiary: #64748b;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  
  /* Border radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  
  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --surface-primary: #0f172a;
  --surface-secondary: #1e293b;
  --surface-tertiary: #334155;
  --border-primary: #334155;
  --border-secondary: #475569;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
}
```

## 📋 **Implementation Checklist**

When creating or updating any component:

- [ ] **Colors**: Uses CSS custom properties for theming
- [ ] **Dark Mode**: Implements both light/dark variants
- [ ] **Typography**: Follows font hierarchy and scales
- [ ] **Spacing**: Uses consistent spacing scale
- [ ] **Responsive**: Works on all screen sizes
- [ ] **Accessibility**: Proper focus states, ARIA labels, keyboard navigation
- [ ] **Animations**: Smooth transitions and hover effects
- [ ] **Loading States**: Skeleton loaders or spinners
- [ ] **Error States**: Proper error messaging and recovery
- [ ] **Empty States**: User-friendly empty state designs
- [ ] **Interactive**: Proper hover and active states
- [ ] **Form Validation**: Clear validation messages
- [ ] **Navigation**: Consistent active states
- [ ] **Performance**: Optimized rendering and animations
- [ ] **Testing**: Cross-browser and device testing

## **Quality Assurance**

### **Component Testing Requirements**

1. **Visual Regression**: Screenshot testing for consistency
2. **Accessibility Testing**: Screen reader and keyboard navigation
3. **Responsive Testing**: All breakpoints and orientations
4. **Theme Testing**: Light and dark mode switching
5. **Performance Testing**: Animation smoothness and load times
6. **Browser Testing**: Chrome, Firefox, Safari, Edge

### **Code Standards**

- [ ] TypeScript types for all props
- [ ] PropTypes or TypeScript interfaces
- [ ] JSDoc comments for complex components
- [ ] Storybook stories for component documentation
- [ ] Unit tests for component logic
- [ ] Integration tests for user interactions

---

**Remember**: Every pixel matters. Consistency creates trust, and trust drives conversions. The Pazar+ platform should feel cohesive, professional, and delightful to use across every interaction.

## ♿ **Enhanced Accessibility Standards**

### **Focus Management**

```jsx
// Focus trap for modals
const focusTrapRef = useFocusTrap(isOpen);

// Skip links
<a href="#main-content" className="skip-link">Skip to main content</a>

// Proper focus indicators
.focus-visible:focus {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900;
}
```

### **ARIA Implementation**

```jsx
// Proper labeling
<button 
  aria-label="Close modal"
  aria-describedby="modal-description"
>

// Status announcements
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Expandable content
<button
  aria-expanded={isOpen}
  aria-controls="expandable-content"
>

// Table accessibility
<table role="table" aria-label="Orders table">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">
        Order Number
      </th>
    </tr>
  </thead>
</table>
```

## 🎨 **TypeScript Integration**

### **Component Interfaces**

```typescript
// Button component props
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

// Order interface
interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  platform: 'trendyol' | 'hepsiburada' | 'n11';
  status: OrderStatus;
  totalAmount: number;
  currency: 'TRY' | 'USD' | 'EUR';
  orderDate: Date;
  items: OrderItem[];
  shippingAddress?: Address;
}

// Status types
type OrderStatus = 
  | 'new'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';
```

## **Testing Guidelines**

### **Component Testing**

```jsx
// Button component test
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct variant class', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 📋 **Implementation Checklist**

When creating or updating any component:

- [ ] **Colors**: Uses CSS custom properties for theming
- [ ] **Dark Mode**: Implements both light/dark variants
- [ ] **Typography**: Follows font hierarchy and scales
- [ ] **Spacing**: Uses consistent spacing scale
- [ ] **Responsive**: Works on all screen sizes
- [ ] **Accessibility**: Proper focus states, ARIA labels, keyboard navigation
- [ ] **Animations**: Smooth transitions and hover effects
- [ ] **Loading States**: Skeleton loaders or spinners
- [ ] **Error States**: Proper error messaging and recovery
- [ ] **Empty States**: User-friendly empty state designs
- [ ] **Interactive**: Proper hover and active states
- [ ] **Form Validation**: Clear validation messages
- [ ] **Navigation**: Consistent active states
- [ ] **Performance**: Optimized rendering and animations
- [ ] **Testing**: Cross-browser and device testing
- [ ] **TypeScript**: Proper type definitions
- [ ] **Documentation**: Component usage examples

## **Migration Guide**

### **From Legacy Components**

```jsx
// Before (legacy)
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Save
</button>

// After (design system)
<button className="btn btn-primary">
  Save
</button>

// Before (legacy badge)
<span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
  Pending
</span>

// After (design system)
<span className="badge badge-pending">
  Pending
</span>
```

---

**Remember**: Every pixel matters. Consistency creates trust, and trust drives conversions. The Pazar+ platform should feel cohesive, professional, and delightful to use across every interaction.
