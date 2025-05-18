const request = require('supertest');
const App = require('../../src/app');
const { sequelize } = require('../../src/models');

let app;
let server;
let token;

beforeAll(async () => {
  // Initialize the application
  const application = new App();
  app = application.getApp();
  
  // Connect to the test database (in-memory SQLite)
  await sequelize.sync({ force: true });
  
  // Create a test user and get authentication token
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    });
  
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password: 'Password123!'
    });
  
  token = loginResponse.body.token;
});

afterAll(async () => {
  // Clean up database
  await sequelize.close();
});

describe('Order API', () => {
  // Test getting order stats
  test('GET /api/orders/stats should return order statistics', async () => {
    const response = await request(app)
      .get('/api/orders/stats')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('totalOrders');
  });
  
  // Test fetching all orders
  test('GET /api/orders should return paginated orders', async () => {
    const response = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data.orders)).toBe(true);
  });
  
  // Add more tests for CRUD operations on orders
});