# Contributing to Pazar+

Thank you for your interest in contributing to Pazar+! This document provides guidelines and information for contributors.

## Table of Contents

- [Contributing to Pazar+](#contributing-to-pazar)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
  - [Development Setup](#development-setup)
  - [Making Changes](#making-changes)
  - [Submitting Changes](#submitting-changes)
  - [Coding Standards](#coding-standards)
    - [JavaScript/Node.js](#javascriptnodejs)
    - [React/Frontend](#reactfrontend)
    - [Database](#database)
    - [API Design](#api-design)
  - [Testing](#testing)
    - [Running Tests](#running-tests)
    - [Test Guidelines](#test-guidelines)
    - [Test Types](#test-types)
  - [Platform Integration](#platform-integration)
  - [Documentation](#documentation)
  - [Getting Help](#getting-help)
  - [Recognition](#recognition)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/pazar-.git`
3. Add the original repository as upstream: `git remote add upstream https://github.com/Great0S/pazar-.git`

## Development Setup

1. **Prerequisites**:
   - Node.js 16+ and npm
   - PostgreSQL 12+
   - Git

2. **Installation**:
   ```bash
   # Install dependencies
   npm run install:all
   
   # Copy environment configuration
   cp server/.env.example server/.env
   cp .env.example .env
   
   # Configure your environment variables
   # Edit server/.env with your database settings
   ```

3. **Database Setup**:
   ```bash
   # Create database
   createdb pazar_plus_dev
   
   # Run migrations
   cd server && npm run migrate
   ```

4. **Start Development**:
   ```bash
   npm run dev
   ```

## Making Changes

1. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Branch Naming Convention**:
   - `feature/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation updates
   - `refactor/` - Code refactoring
   - `test/` - Adding or updating tests

3. **Commit Messages**:
   - Use clear and descriptive commit messages
   - Start with a verb in present tense
   - Keep first line under 50 characters
   - Add detailed description if needed

   ```
   Add order synchronization for N11 platform
   
   - Implement N11 API client
   - Add order status mapping
   - Include error handling for API failures
   ```

## Submitting Changes

1. **Before Submitting**:
   - Ensure all tests pass: `npm test`
   - Run linting: `npm run lint`
   - Update documentation if needed
   - Test your changes thoroughly

2. **Pull Request Process**:
   - Push your branch to your fork
   - Create a pull request against the `main` branch
   - Fill out the pull request template
   - Link any related issues

3. **Pull Request Guidelines**:
   - Provide a clear description of changes
   - Include screenshots for UI changes
   - Add tests for new functionality
   - Update documentation as needed

## Coding Standards

### JavaScript/Node.js
- Use ES6+ features
- Follow consistent indentation (2 spaces)
- Use meaningful variable names
- Add comments for complex logic
- Handle errors properly

### React/Frontend
- Use functional components with hooks
- Follow component naming conventions
- Implement proper error boundaries
- Use TypeScript when possible

### Database
- Use migrations for schema changes
- Add proper indexes
- Follow naming conventions
- Include rollback functionality

### API Design
- Follow RESTful principles
- Use consistent response formats
- Implement proper error handling
- Add input validation
- Document endpoints

## Testing

### Running Tests
```bash
# All tests
npm test

# Server tests only
npm run test:server

# Client tests only
npm run test:client

# Watch mode
npm run test:watch
```

### Test Guidelines
- Write tests for new features
- Maintain good test coverage
- Use descriptive test names
- Mock external dependencies
- Test both success and error cases

### Test Types
- **Unit Tests**: Individual functions/components
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Full user workflows

## Platform Integration

When adding new marketplace platforms:

1. Follow the existing platform service pattern
2. Implement all required methods
3. Add proper error handling
4. Include rate limiting considerations
5. Add configuration documentation
6. Write comprehensive tests

## Documentation

- Update README.md for major changes
- Add JSDoc comments for functions
- Update API documentation
- Include example usage
- Document configuration options

## Getting Help

- Check existing issues and discussions
- Join our community discussions
- Read the documentation thoroughly
- Ask questions in pull requests

## Recognition

Contributors will be acknowledged in:
- The project README
- Release notes for significant contributions
- Special recognition for major features

Thank you for contributing to Pazar+!
