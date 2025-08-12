# Pazar+ Documentation

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.1.0-blue.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)

Welcome to the comprehensive documentation for Pazar+, an advanced e-commerce order management and platform integration system.

## Quick Start

New to Pazar+? Start here:

- **[Getting Started Guide](./getting-started.md)** - Complete setup guide for beginners
- **[Live Demo](https://yarukai.com)** - Test the platform immediately
  - Email: `admin@example.com`
  - Password: `FrVCxFsLb7Rfshn#`

## Core Documentation

### Essential Guides
- **[Getting Started](./getting-started.md)** - Installation and first steps
- **[User Guide](./user-guide.md)** - Complete feature walkthrough
- **[API Reference](./api-reference.md)** - Comprehensive API documentation
- **[Deployment Guide](./deployment-guide.md)** - Production deployment instructions

### Integration & Setup
- **[Platform Integration](./platform-integration.md)** - Marketplace connection guide
- **[Turkish Shipping Integration](./turkish-shipping-integration.md)** - Shipping carrier setup
- **[Authentication Strategy](./authentication-strategy.md)** - Security and auth setup

### Specialized Topics
- **[Analytics System](./ANALYTICS_SYSTEM.md)** - Business intelligence features
- **[Order Management Service](./order-management-service.md)** - Order processing details
- **[Design System Guide](./design-system-guide.md)** - UI/UX guidelines
- **[Performance Optimization](./performance-optimization.md)** - Speed and efficiency tips

### Troubleshooting & Support
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions
- **[Platform Operations Guide](./platform-operations-guide.md)** - Operational procedures

## Quick Navigation

### By User Type

**Developers**:
- [Getting Started](./getting-started.md#option-2-local-development-setup) - Local development setup
- [API Reference](./api-reference.md) - REST API documentation
- [Deployment Guide](./deployment-guide.md) - Production deployment

**Business Users**:
- [User Guide](./user-guide.md) - Complete feature guide
- [Live Demo](https://yarukai.com) - Test environment
- [Platform Integration](./platform-integration.md) - Marketplace setup

**System Administrators**:
- [Deployment Guide](./deployment-guide.md) - Server setup
- [Troubleshooting Guide](./troubleshooting.md) - Issue resolution
- [Performance Optimization](./performance-optimization.md) - System tuning

### By Feature

**Product Management**:
- [Intelligent Classification](./user-guide.md#intelligent-product-classification) - AI-powered SKU/barcode detection
- [Variant Detection](./user-guide.md#variant-detection) - Product relationship mapping
- [Bulk Operations](./user-guide.md#product-importexport) - CSV import/export

**Order Processing**:
- [Order Management](./user-guide.md#order-management) - Complete order workflow
- [Platform Sync](./platform-integration.md#real-time-synchronization) - Multi-platform integration
- [Status Tracking](./user-guide.md#order-status-management) - Order lifecycle

**Shipping & Labels**:
- [Label Generation](./user-guide.md#shipping-management) - Multi-language labels
- [Carrier Integration](./turkish-shipping-integration.md) - Shipping providers
- [International Support](./user-guide.md#advanced-text-processing) - Unicode handling

**Analytics & Reporting**:
- [Dashboard Analytics](./user-guide.md#analytics--reporting) - Business metrics
- [Custom Reports](./ANALYTICS_SYSTEM.md) - Advanced reporting
- [Performance Monitoring](./troubleshooting.md#system-monitoring) - System health

## Technical Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │   PostgreSQL    │
│   (Frontend)    │────│   (Backend)     │────│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │              ┌─────────────────┐
         │              ┌─────────────────┐      │      Redis      │
         │              │  AI Services    │      │    (Cache)      │
         │              │  - SKU Classifier│      └─────────────────┘
         │              │  - Variant Detect│               │
         │              │  - Pattern Engine│               │
         │              └─────────────────┘               │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Marketplace   │    │   Shipping      │    │   File Storage  │
│   APIs          │────│   Providers     │────│   (Labels/Docs) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Technologies
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white)

- **Frontend**: React 19, TailwindCSS, Recharts
- **Backend**: Node.js, Express.js, Sequelize ORM
- **Database**: PostgreSQL, Redis
- **Infrastructure**: Nginx, PM2, AlmaLinux
- **AI/ML**: Custom classification algorithms
- **Integration**: REST APIs, WebSockets, Webhooks

## Feature Matrix

| Feature | Status | Documentation |
|---------|:------:|---------------|
| Product Classification | ![Status](https://img.shields.io/badge/status-active-success) | [User Guide](./user-guide.md#intelligent-product-classification) |
| Variant Detection | ![Status](https://img.shields.io/badge/status-active-success) | [User Guide](./user-guide.md#variant-detection) |
| Multi-Platform Sync | ![Status](https://img.shields.io/badge/status-active-success) | [Platform Integration](./platform-integration.md) |
| Order Management | ![Status](https://img.shields.io/badge/status-active-success) | [User Guide](./user-guide.md#order-management) |
| Shipping Labels | ![Status](https://img.shields.io/badge/status-active-success) | [User Guide](./user-guide.md#shipping-management) |
| Real-time Analytics | ![Status](https://img.shields.io/badge/status-active-success) | [Analytics System](./ANALYTICS_SYSTEM.md) |
| API Integration | ![Status](https://img.shields.io/badge/status-active-success) | [API Reference](./api-reference.md) |
| Multi-language Support | ![Status](https://img.shields.io/badge/status-active-success) | [User Guide](./user-guide.md#multi-language-text-processing) |
| Webhook Support | ![Status](https://img.shields.io/badge/status-active-success) | [Platform Integration](./platform-integration.md#webhook-integration) |
| Performance Monitoring | ![Status](https://img.shields.io/badge/status-active-success) | [Troubleshooting](./troubleshooting.md#system-monitoring) |

## Key Features

### Intelligent Product Management
- **AI-Powered Classification**: Automatically distinguish between SKUs and barcodes
- **Variant Detection**: Group related products based on patterns
- **Pattern Recognition**: Advanced analysis of product hierarchies
- **Confidence Scoring**: Machine learning confidence metrics

### Platform Integration
- **Multi-Marketplace Support**: Trendyol, Hepsiburada, N11, and more
- **Bidirectional Sync**: Real-time data synchronization
- **Error Handling**: Robust retry and recovery mechanisms
- **Rate Limiting**: Respect platform API limits

### Advanced Shipping
- **Multi-Language Labels**: Support for 20+ languages and scripts
- **Unicode Handling**: Bidirectional text and mixed scripts
- **Carrier Integration**: Multiple shipping providers
- **Template System**: Customizable label designs

### Business Intelligence
- **Real-time Dashboards**: Live business metrics
- **Custom Reports**: Flexible reporting engine
- **Performance Analytics**: Platform and product insights
- **Export Capabilities**: Multiple data formats

## API Quick Reference

### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "FrVCxFsLb7Rfshn#"
}
```

### Product Classification
```http
POST /api/products/classify
Authorization: Bearer <token>
Content-Type: application/json

{
  "products": [
    {
      "id": "prod_1",
      "sku": "ABC123",
      "name": "Product Name"
    }
  ]
}
```

### Order Management
```http
GET /api/orders?platform=trendyol&status=pending
Authorization: Bearer <token>
```

For complete API documentation, see [API Reference](./api-reference.md).

## Emergency Procedures

### Quick Diagnostics
```bash
# Check system health
curl -s http://localhost:3000/api/health | jq '.'

# Test database connection
psql -h localhost -U pazar_user -d pazar_plus_prod -c "SELECT 1;"

# Check application logs
pm2 logs pazar-plus-prod --lines 50
```

### Common Issues
- **Login Problems**: [Authentication Troubleshooting](./troubleshooting.md#authentication-issues)
- **Sync Failures**: [Platform Connection Issues](./troubleshooting.md#platform-connection-issues)
- **Performance**: [Performance Optimization](./troubleshooting.md#performance-issues)

## Support & Community

### Getting Help
- **Documentation**: Complete guides and references
- **GitHub Issues**: Bug reports and feature requests
- **Live Demo**: Test environment for learning
- **API Explorer**: Interactive API testing

### Contact Information
- **Email**: support@pazar-plus.com
- **Live Chat**: Available during business hours
- **Emergency**: 24/7 hotline for critical issues
- **GitHub**: [https://github.com/Great0S/pazar-](https://github.com/Great0S/pazar-)

### Community Resources
- **Knowledge Base**: Searchable help articles
- **Video Tutorials**: Step-by-step guides
- **Best Practices**: Implementation guidelines
- **Case Studies**: Real-world examples

## Learning Path

### Beginner (Start Here)
1. **[Live Demo](https://yarukai.com)** - Get familiar with the interface
2. **[Getting Started](./getting-started.md)** - Set up your environment
3. **[User Guide](./user-guide.md#dashboard-overview)** - Learn basic features
4. **[First Integration](./platform-integration.md#general-setup-process)** - Connect a platform

### Intermediate
1. **[Advanced Features](./user-guide.md#advanced-features)** - Explore automation
2. **[API Integration](./api-reference.md)** - Build custom integrations
3. **[Performance Tuning](./performance-optimization.md)** - Optimize your setup
4. **[Custom Reports](./ANALYTICS_SYSTEM.md)** - Create business insights

### Advanced
1. **[Production Deployment](./deployment-guide.md)** - Deploy at scale
2. **[Custom Development](./api-reference.md#sdks-and-examples)** - Extend the platform
3. **[System Administration](./troubleshooting.md#system-monitoring)** - Manage operations
4. **[Integration Patterns](./platform-integration.md#advanced-features)** - Complex workflows

## Version History

### Latest Release
- **Version**: 1.0.0
- **Release Date**: August 2025
- **Key Features**: Full platform integration, AI classification, multi-language support

### Upcoming Features
- **Advanced ML Models**: Enhanced classification accuracy
- **Mobile App**: Native mobile application
- **API v2**: Enhanced REST API with GraphQL support
- **Enterprise Features**: Advanced security and compliance

---

**Welcome to Pazar+!** Start with our [Getting Started Guide](./getting-started.md) or try the [Live Demo](https://yarukai.com) to experience the platform immediately.
