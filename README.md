# Pazar+ Platform

Order management system for e-commerce platforms integration.

## Project Structure

```plaintext
├── client/                 # React frontend application
├── server/                 # Express backend application
│   ├── middleware/         # Express middleware
│   ├── modules/            # Feature modules
│   │   ├── auth/           # Authentication module
│   │   ├── order-management/  # Order management module
│   ├── config/             # Server configuration
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
├── shared/                 # Shared code between client and server
├── docs/                   # Project documentation
├── scripts/                # Utility scripts
├── notebooks/              # Data analysis notebooks
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- NPM or Yarn
- PostgreSQL (v12 or later)

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/pazar-plus.git
   cd pazar-plus
   ```

2. Install dependencies

   ```bash
   npm run install:all
   ```

3. Set up environment variables

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

4. Start development servers

   ```bash
   npm run dev
   ```

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start development servers (client and server)
- `npm run server`: Start the server in development mode
- `npm run client`: Start the client in development mode
- `npm run build`: Build the client for production
- `npm run test`: Run tests
- `npm run lint`: Run linting

## Documentation

For more detailed information, please refer to the [docs](./docs) directory.
