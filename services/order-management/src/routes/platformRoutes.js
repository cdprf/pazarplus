// This file configures platform connection routes for the Order Management Service.
// It uses Express.js to define the routes and middleware for handling platform connections.
// It also uses express-validator for input validation and a custom authentication middleware for securing the routes.
const express = require('express');
const { body } = require('express-validator');
const platformConnectionController = require('../controllers/platformConnectionController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All platform routes should be protected
router.use(authenticateToken);

/**
 * @route GET /api/platforms
 * @desc Get all platform connections for the authenticated user
 * @access Private
 */
router.get('/', platformConnectionController.getAllConnections);

/**
 * @route GET /api/platforms/:id
 * @desc Get a specific platform connection
 * @access Private
 */
router.get('/:id', platformConnectionController.getConnection);

/**
 * @route POST /api/platforms
 * @desc Create a new platform connection
 * @access Private
 */
router.post(
  '/',
  [
    body('platformType').notEmpty().withMessage('Platform type is required'),
    body('name').notEmpty().withMessage('Connection name is required'),
    // Other validations depend on the platform type, can be handled conditionally in the controller
  ],
  platformConnectionController.createConnection
);

/**
 * @route PUT /api/platforms/:id
 * @desc Update a platform connection
 * @access Private
 */
router.put(
  '/:id',
  [
    // Validations can be more relaxed for updates since not all fields are required
    body('platformType').optional(),
    body('name').optional(),
  ],
  platformConnectionController.updateConnection
);

/**
 * @route DELETE /api/platforms/:id
 * @desc Delete a platform connection
 * @access Private
 */
router.delete('/:id', platformConnectionController.deleteConnection);

/**
 * @route POST /api/platforms/:id/test
 * @desc Test a platform connection
 * @access Private
 */
router.post('/:id/test', platformConnectionController.testConnection);

module.exports = router;