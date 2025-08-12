# Pazar+ Platform

> **Advanced E-Commerce Order Management & Platform Integration System**

Pazar+ is a comprehensive e-commerce platform integration solution featuring intelligent product classification, multi-platform synchronization, and advanced shipping management capabilities. Built for enterprise-scale operations with sophisticated AI-powered pattern recognition and seamless marketplace integration across global markets.

## Key Features

### Intelligent Product Management
- **Enhanced SKU Classification** - AI-powered distinction between barcodes and SKU codes
- **Variant Detection System** - Automatic product variant grouping and relationship detection
- **Pattern Recognition Engine** - Advanced pattern analysis for hierarchical product structures
- **Bidirectional Synchronization** - Real-time data synchronization across multiple platforms

### Platform Integrations
- **Trendyol** - Major marketplace platform
- **Hepsiburada** - E-commerce marketplace  
- **N11** - Online marketplace platform
- **CSV Import/Export** - Flexible data management capabilities

### Advanced Shipping Management
- **Multi-Carrier Integration** - Support for various shipping providers
- **Smart Label Designer** - Multi-language support (Latin, Arabic, Cyrillic, Greek, Turkish, and more)
- **Template-based PDF Generation** - Customizable shipping documents
- **Unicode Text Processing** - Bidirectional text and mixed script handling

## Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)

### Database & Infrastructure
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

### DevOps & Deployment
![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

### Testing & Quality
![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)
![ESLint](https://img.shields.io/badge/eslint-3A33D1?style=for-the-badge&logo=eslint&logoColor=white)

## Project Architecture

```
├── client/                          # React Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── shipping/           # Shipping label designer
│   │   │   │   └── designer/       # Advanced text encoding utilities
│   │   │   └── forms/              # Custom form components
│   │   ├── utils/                  # Frontend utilities
│   │   └── styles/                 # Tailwind CSS configurations
│   └── public/                     # Static assets
├── server/                          # Express.js Backend
│   ├── controllers/                # API controllers
│   ├── models/                     # Database models (Sequelize)
│   ├── services/                   # Core business logic
│   │   ├── intelligent-sku-classifier-enhanced.js
│   │   ├── unified-product-intelligence-service.js
│   │   ├── variant-detection-service.js
│   │   ├── integrated-pattern-detection-engine.js
│   │   └── templateBasedPdfGenerator.js
│   ├── modules/
│   │   ├── auth/                   # Authentication system
│   │   └── order-management/       # Order processing
│   │       └── services/platforms/ # Platform-specific integrations
│   ├── middleware/                 # Express middleware
│   ├── routes/                     # API route definitions
│   └── utils/                      # Backend utilities
├── docs/                           # Comprehensive documentation
├── scripts/                        # Deployment & maintenance scripts
└── notebooks/                      # Data analysis notebooks
```

## Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **NPM** v8.0.0 or higher
- **PostgreSQL** v12.0 or higher
- **Git** version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Great0S/pazar-.git
   cd pazar+
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Database setup**
   ```bash
   # Create PostgreSQL database and user
   createdb pazar_plus_prod
   createuser pazar_user
   ```

4. **Environment configuration**
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   # Edit .env files with your configuration
   ```

5. **Start development environment**
   ```bash
   npm run dev
   ```

## Test Tour

Experience the platform with our live demo:

**Demo Website**: [yarukai.com](https://yarukai.com)

**Test Credentials**:
```
Email: admin@example.com
Password: FrVCxFsLb7Rfshn#
```

> **Note**: This is a demo environment for testing purposes. Please do not use real business data.

## Available Scripts

### Development
| Script | Description |
|--------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run server` | Start backend server only |
| `npm run client` | Start frontend client only |
| `npm run build` | Build production client bundle |

### Production
| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run start:prod` | Start with production environment |
| `npm run pm2:start` | Start with PM2 process manager |

### Testing & Quality
| Script | Description |
|--------|-------------|
| `npm test` | Run backend tests |
| `npm run test:all` | Run all tests (client + server) |
| `npm run lint` | Code linting |
| `npm run analyze-bundle` | Bundle size analysis |

### Database & Deployment
| Script | Description |
|--------|-------------|
| `npm run backup:db` | Backup database |
| `npm run setup` | Clean setup with dependency installation |

## Core Services

### Intelligent SKU Classifier
Advanced pattern recognition system for distinguishing between:
- **Barcodes** (EAN, UPC, Code128)
- **SKU Codes** (Custom product identifiers)  
- **Mixed formats** with intelligent confidence scoring

### Variant Detection System
Automatically detects and groups product variants based on:
- SKU pattern analysis
- Product name similarity  
- Platform-specific variant data
- Hierarchical product structures

### Multi-Language Text Processing
Sophisticated Unicode handling for global markets:
- **Bidirectional text** (Arabic, Hebrew, and other RTL languages)
- **Mixed scripts** (Latin + Arabic + Cyrillic + Asian scripts)
- **Font recommendations** by character set and region
- **Text normalization** and encoding for international shipping

## Platform Integration

### Supported Marketplaces
| Platform | Orders | Products | Inventory | Bidirectional Sync |
|----------|:------:|:--------:|:---------:|:------------------:|
| Trendyol | ✅ | ✅ | ✅ | ✅ |
| Hepsiburada | ✅ | ✅ | ✅ | ✅ |
| N11 | ✅ | ✅ | ✅ | ✅ |
| CSV Import | ✅ | ✅ | ✅ | ✅ |

### Shipping Carriers
- **Configurable Carriers** - Support for multiple shipping providers
- **API Integration** - RESTful API connections to carrier systems
- **Label Generation** - Automated shipping label creation
- **Tracking Integration** - Real-time package tracking capabilities

## API Documentation

### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
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
      "sku": "ABC123",
      "name": "Product Name",
      "barcode": "1234567890123"
    }
  ]
}
```

## Production Deployment

### VPS Setup (AlmaLinux)
```bash
# Automated setup script
./quick-vps-setup-almalinux.sh

# Manual PM2 configuration
npm run pm2:start
```

### Environment Configuration
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus_prod
DB_USER=pazar_user
DB_PASSWORD=your_secure_password

# Platform API Keys (Examples)
MARKETPLACE_API_KEY_1=your_marketplace_api_key
MARKETPLACE_API_KEY_2=your_second_marketplace_key
MARKETPLACE_API_KEY_3=your_third_marketplace_key

# Shipping Provider APIs (Configurable)
SHIPPING_PROVIDER_1_URL=https://api.shippingprovider1.com
SHIPPING_PROVIDER_2_URL=https://api.shippingprovider2.com
SHIPPING_PROVIDER_3_URL=https://api.shippingprovider3.com

# Security
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
```

## Development Tools

### Diagnostic Scripts
| Script | Purpose |
|--------|---------|
| `vps-pdf-diagnostic.js` | PDF generation troubleshooting |
| `debug-credentials-issue.js` | Platform credential validation |
| `test-bidirectional-sync.js` | Sync functionality testing |

### Maintenance Utilities  
| Script | Purpose |
|--------|---------|
| `cleanup-error-files.js` | Log file management |
| `emergency-shipping-fix.js` | Quick shipping fixes |
| `fix-product-sync-timeout.js` | Sync optimization |

## Contributing

We welcome contributions to the Pazar+ Platform. Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with appropriate tests
4. Ensure all tests pass (`npm run test:all`)
5. Run linting (`npm run lint:fix`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation for API changes
- Use semantic commit messages

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/Great0S/pazar-/issues)
- **Documentation**: See `/docs` directory for detailed guides
- **Repository**: [https://github.com/Great0S/pazar-](https://github.com/Great0S/pazar-)

---

**Enterprise E-Commerce Platform Integration for Global Markets**
