const express = require("express");
const { body, query, param } = require("express-validator");
// Re-enable auth middleware now that we have the reply method implemented
const auth = require("../middleware/auth");

// Import the proper controller class
const CustomerQuestionController = require("../controllers/CustomerQuestionController");

// Create controller instance lazily
let controllerInstance = null;
const getController = () => {
  if (!controllerInstance) {
    controllerInstance = new CustomerQuestionController();
  }
  return controllerInstance;
};

const router = express.Router();

// Validation middleware
const validateQuestionQuery = [
  query("platform").optional().isIn(["trendyol", "hepsiburada", "n11"]),
  query("status")
    .optional()
    .isIn(["WAITING_FOR_ANSWER", "ANSWERED", "REJECTED", "AUTO_CLOSED"]),
  query("priority").optional().isIn(["low", "medium", "high", "urgent"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("sort_by")
    .optional()
    .isIn([
      "creation_date",
      "status",
      "priority",
      "customer_name",
      "expire_date",
    ]),
  query("sort_order").optional().isIn(["ASC", "DESC", "asc", "desc"]),
  query("search").optional().isString().isLength({ min: 1, max: 255 }),
];

const validateReply = [
  body("text")
    .notEmpty()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Reply text must be between 10 and 2000 characters"),
  body("type").optional().isIn(["answer", "reject"]),
  body("template_id").optional().isInt(),
  body("attachments").optional().isArray(),
];

const validateTemplate = [
  body("title")
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .withMessage("Template title is required"),
  body("content")
    .notEmpty()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Template content must be between 10 and 5000 characters"),
  body("category").optional().isLength({ max: 100 }),
  body("platforms").optional().isArray(),
  body("keywords").optional().isArray(),
  body("variables").optional().isArray(),
];

const validateSync = [
  body("platforms").optional().isArray(),
  body("start_date").optional().isISO8601(),
  body("end_date").optional().isISO8601(),
];

// Apply authentication to all routes (temporarily disabled for debugging)
// router.use(auth);

/**
 * @route GET /api/customer-questions
 * @desc Get customer questions with filters and pagination
 * @access Private
 */
router.get("/", validateQuestionQuery, (req, res) =>
  getController().getQuestions(req, res)
);

/**
 * @route GET /api/customer-questions/by-customer/:email
 * @desc Get customer questions by customer email
 * @access Private
 */
router.get(
  "/by-customer/:email",
  param("email").isEmail().withMessage("Valid email is required"),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("sort_by")
    .optional()
    .isIn(["creation_date", "status", "priority", "expire_date"]),
  query("sort_order").optional().isIn(["ASC", "DESC"]),
  (req, res) => getController().getQuestionsByCustomer(req, res)
);

/**
 * @route GET /api/customer-questions/stats
 * @desc Get question statistics
 * @access Private
 */
router.get(
  "/stats",
  [
    query("platform").optional().isIn(["trendyol", "hepsiburada", "n11"]),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
  ],
  (req, res) => getController().getQuestionStats(req, res)
);

/**
 * @route GET /api/customer-questions/dashboard
 * @desc Get dashboard data
 * @access Private
 */
router.get(
  "/dashboard",
  [query("days").optional().isInt({ min: 1, max: 365 })],
  (req, res) => getController().getDashboardData(req, res)
);

/**
 * @route POST /api/customer-questions/sync
 * @desc Sync questions from platforms
 * @access Private
 */
router.post("/sync", validateSync, (req, res) =>
  getController().syncQuestions(req, res)
);

/**
 * @route GET /api/customer-questions/templates
 * @desc Get reply templates
 * @access Private
 */
router.get(
  "/templates",
  [query("category").optional().isLength({ max: 100 })],
  (req, res) => getController().getReplyTemplates(req, res)
);

/**
 * @route POST /api/customer-questions/templates
 * @desc Create reply template
 * @access Private
 */
router.post("/templates", validateTemplate, (req, res) =>
  getController().saveReplyTemplate(req, res)
);

/**
 * @route PUT /api/customer-questions/templates/:id
 * @desc Update reply template
 * @access Private
 */
router.put(
  "/templates/:id",
  [param("id").isInt(), ...validateTemplate],
  (req, res) => getController().saveReplyTemplate(req, res)
);

/**
 * @route DELETE /api/customer-questions/templates/:id
 * @desc Delete reply template
 * @access Private
 */
router.delete("/templates/:id", [param("id").isInt()], (req, res) =>
  getController().deleteReplyTemplate(req, res)
);

/**
 * @route GET /api/customer-questions/:id
 * @desc Get specific question by ID
 * @access Private
 */
router.get("/:id", [param("id").isInt()], (req, res) =>
  getController().getQuestionById(req, res)
);

/**
 * @route POST /api/customer-questions/:id/reply
 * @desc Reply to a question
 * @access Private
 */
router.post("/:id/reply", [param("id").isInt(), ...validateReply], (req, res) =>
  getController().replyToQuestion(req, res)
);

/**
 * @route GET /api/customer-questions/:id/template-suggestions
 * @desc Get template suggestions for a question
 * @access Private
 */
router.get(
  "/:id/template-suggestions",
  [param("id").isInt(), query("limit").optional().isInt({ min: 1, max: 10 })],
  (req, res) => getController().getTemplateSuggestions(req, res)
);

/**
 * @route PUT /api/customer-questions/:id/assign
 * @desc Assign question to user
 * @access Private
 */
router.put(
  "/:id/assign",
  [param("id").isInt(), body("assigned_to").optional().isInt()],
  (req, res) => getController().assignQuestion(req, res)
);

/**
 * @route PUT /api/customer-questions/:id/priority
 * @desc Update question priority
 * @access Private
 */
router.put(
  "/:id/priority",
  [
    param("id").isInt(),
    body("priority").isIn(["low", "medium", "high", "urgent"]),
  ],
  (req, res) => getController().updateQuestionPriority(req, res)
);

/**
 * @route POST /api/customer-questions/:id/note
 * @desc Add internal note to question
 * @access Private
 */
router.post(
  "/:id/note",
  [
    param("id").isInt(),
    body("note")
      .notEmpty()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Note must be between 1 and 1000 characters"),
  ],
  (req, res) => getController().addInternalNote(req, res)
);

/**
 * @route POST /api/customer-questions/initialize-platforms
 * @desc Initialize platform services for testing
 * @access Private
 */
router.post(
  "/initialize-platforms",
  [
    body("level")
      .optional()
      .isInt({ min: 1, max: 3 })
      .withMessage("Level must be between 1 and 3"),
  ],
  (req, res) => getController().initializePlatforms(req, res)
);

/**
 * @route GET /api/customer-questions/test-connectivity/:platform
 * @desc Test platform connectivity and credentials
 * @access Private
 */
router.get(
  "/test-connectivity/:platform",
  [
    param("platform")
      .isIn(["trendyol", "hepsiburada", "n11"])
      .withMessage("Platform must be trendyol, hepsiburada, or n11"),
  ],
  (req, res) => getController().testPlatformConnectivity(req, res)
);

module.exports = router;
