# Enhanced Product Management System

## Overview

A comprehensive product management system where each product has a main entry that acts as a base to derive multiple variants per platform, with shared stock management and flexible pricing.

## Architecture

### Core Concepts

1. **Main Product Entry**
   - Acts as the base product containing core information
   - Contains shared stock quantity
   - Defines default pricing and attributes
   - Manages media files (images, GIFs, videos)

2. **Platform Variants**
   - Derived from main product
   - Platform-specific differences (model, barcode, stock code suffix)
   - Can have platform-specific pricing or inherit from main product
   - Share stock with main product

3. **Stock Code Pattern**
   - Format: `{ProductType || {OwnBrand+ProductTypeInitials}}-ProductBrand{000}-{ORJ||VARIANTS}`
   - Examples: `NWK-APPL001-ORJ`, `NWK-APPL001-TR`, `K-LOG001-ORJ`
   - Auto-matching for synced products

### Database Schema Enhancements

#### Main Product Model

```javascript
{
  id: UUID (Primary Key),
  name: String,
  baseSku: String (Unique pattern),
  description: Text,
  category: String,
  brand: String,
  productType: String,
  
  // Stock Management (Shared across all variants)
  stockQuantity: Integer,
  minStockLevel: Integer,
  reservedStock: Integer,
  
  // Default Pricing
  basePrice: Decimal,
  baseCostPrice: Decimal,
  
  // Media Management
  media: JSON [{ type, url, alt, isPrimary, platforms[] }],
  
  // Platform Management
  publishedPlatforms: JSON,
  platformTemplates: JSON,
  
  // Auto-Learning
  learnedFields: JSON,
  categoryMappings: JSON,
  
  // Status
  isMainProduct: Boolean (true),
  hasVariants: Boolean,
  status: Enum,
  
  userId: UUID,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Platform Variant Model

```javascript
{
  id: UUID,
  mainProductId: UUID (Foreign Key),
  
  // Platform-specific Information
  platform: String (trendyol, hepsiburada, n11, etc.),
  platformSku: String,
  platformBarcode: String,
  variantSuffix: String,
  
  // Pricing (can override main product)
  useMainPrice: Boolean,
  platformPrice: Decimal,
  platformCostPrice: Decimal,
  
  // Platform-specific Attributes
  platformAttributes: JSON,
  platformCategory: String,
  platformTitle: String,
  platformDescription: Text,
  
  // Media (platform-specific or inherited)
  platformMedia: JSON,
  useMainMedia: Boolean,
  
  // Publication Status
  isPublished: Boolean,
  publishedAt: Timestamp,
  lastSyncAt: Timestamp,
  syncStatus: Enum,
  
  // Template Usage
  templateId: UUID,
  templateFields: JSON,
  
  status: Enum,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Platform Template Model

```javascript
{
  id: UUID,
  name: String,
  platform: String,
  category: String,
  
  // Required Fields
  requiredFields: JSON,
  optionalFields: JSON,
  fieldValidations: JSON,
  
  // Auto-learned Information
  learnedFromProducts: Integer,
  lastLearningUpdate: Timestamp,
  
  // Template Configuration
  defaultValues: JSON,
  fieldMappings: JSON,
  
  isActive: Boolean,
  userId: UUID,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Features

### 1. Inline Variant Dashboard

- Accessible from main product detail view
- Real-time stock management
- Platform-specific pricing controls
- Media management per platform
- Bulk operations interface

### 2. Shared Stock Management

- Single stock pool for all variants
- Real-time stock tracking
- Automatic stock reservation system
- Low stock alerts

### 3. Auto Pattern Learning

- Learns from existing products
- Detects stock code patterns
- Auto-matches synced products
- Suggests variant groupings

### 4. Bulk Operations

- Bulk publish to platforms
- Bulk price updates
- Bulk media uploads
- Bulk attribute changes

### 5. Media Management

- Support for images, GIFs, videos
- Platform-specific media optimization
- Drag-and-drop upload interface
- Media compression and resizing

### 6. Platform Integration

- Auto-learns platform requirements
- Creates platform-specific templates
- Handles platform-specific validation
- Syncs product status and inventory

## Implementation Progress Tracking

- [ ] Enhanced Database Models
- [ ] Stock Management Service
- [ ] Platform Template System
- [ ] Auto Pattern Learning
- [ ] Inline Variant Dashboard
- [ ] Media Management System
- [ ] Bulk Operations Interface
- [ ] Platform Integration
- [ ] Automated Testing
- [ ] Documentation
