// Global test setup for Jest
process.env.NODE_ENV = 'test';
process.env.PORT = 3002; // Use a different port for testing
process.env.DB_STORAGE = ':memory:'; // Use in-memory SQLite for tests

// Set longer timeout for integration tests
jest.setTimeout(30000);