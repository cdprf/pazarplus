/**
 * Swagger configuration for API documentation
 */
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Swagger specification
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pazar+ Order Management API",
      version: "1.0.0",
      description: `
        API documentation for the Order Management module of Pazar+ e-commerce platform.
        
        ## Authentication
        This API uses JWT Bearer token authentication. To access protected endpoints:
        
        1. First, get a development token by making a POST request to \`/api/auth/dev-token\`
        2. Copy the token from the response
        3. Click the "Authorize" button below and enter: \`Bearer YOUR_TOKEN_HERE\`
        4. Click "Authorize" and "Close"
        
        Example token request:
        \`\`\`bash
        curl -X POST http://localhost:5001/api/auth/dev-token
        \`\`\`
      `,
      contact: {
        name: "Pazar+ Development Team",
      },
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js", "./models/*.js"],
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
      docExpansion: "list",
      filter: true,
      displayRequestDuration: true,
      persistAuthorization: true,
    },
    customCss: `
      /* Custom styling for Swagger UI */
      .swagger-ui .topbar { background-color: #2c3e50; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .btn.authorize { background-color: #27ae60; color: white; }
      .swagger-ui .btn.authorize svg { fill: white; }
      
      /* Highlight the auth section */
      .swagger-ui .auth-wrapper { 
        background: #f8f9fa;
        border: 2px solid #27ae60;
        border-radius: 8px;
        margin: 10px 0;
        padding: 10px;
      }
      
      /* Add a notice about authentication */
      .swagger-ui .info .main::after {
        content: "🔑 Don't forget to authorize first! Use POST /api/auth/dev-token to get a token, then click Authorize above.";
        display: block;
        background: #fff3cd;
        color: #856404;
        padding: 15px;
        border-radius: 4px;
        margin-top: 20px;
        font-weight: bold;
        border-left: 4px solid #ffc107;
        border: 1px solid #ffeaa7;
      }
    `,
  };

  // Mount Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerUiOptions)
  );
};

module.exports = {
  specs,
  swaggerUi,
  initializeSwagger,
};
