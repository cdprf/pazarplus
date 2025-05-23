/**
 * Swagger configuration for API documentation
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger specification
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pazar+ Order Management API',
      version: '1.0.0',
      description: `
        API documentation for the Order Management module of Pazar+ e-commerce platform.
        
        ## Authentication
        For development and testing purposes, all API requests are automatically authenticated.
        You don't need to manually add an authentication token to your requests.
      `,
      contact: {
        name: 'Pazar+ Development Team'
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ],
};

// Generate Swagger specification
const specs = swaggerJsdoc(options);

/**
 * Initialize Swagger documentation
 */
const initializeSwagger = (app) => {
  // Set up Swagger UI
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      displayRequestDuration: true,
      persistAuthorization: true
    },
    customCss: `
      /* Custom styling for Swagger UI */
      .swagger-ui .topbar { background-color: #2c3e50; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .btn.authorize { background-color: #27ae60; color: white; }
      .swagger-ui .btn.authorize svg { fill: white; }
      
      /* Hide the Authorize button since we auto-authenticate */
      .swagger-ui .auth-wrapper { 
        display: none;
      }
      
      /* Add a notice about auto-authentication */
      .swagger-ui .info .main::after {
        content: "All API endpoints are automatically authenticated for testing";
        display: block;
        background: #e8f5e9;
        color: #2e7d32;
        padding: 10px;
        border-radius: 4px;
        margin-top: 20px;
        font-weight: bold;
        border-left: 4px solid #2e7d32;
      }
    `
  };
  
  // Mount Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
};

module.exports = { 
  specs, 
  swaggerUi, 
  initializeSwagger
};