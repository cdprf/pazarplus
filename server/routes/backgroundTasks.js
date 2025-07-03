const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const BackgroundTaskController = require("../controllers/BackgroundTaskController");
const { auth } = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  console.log("🔍 BackgroundTasks route middleware - checking auth");
  console.log(
    "Authorization header:",
    req.headers.authorization ? "Present" : "Missing"
  );
  next();
});

router.use(auth);

// Validation rules
const createTaskValidation = [
  body("taskType")
    .isIn([
      "order_fetching",
      "product_sync",
      "inventory_sync",
      "bulk_operation",
      "analytics_update",
      "customer_sync",
      "shipping_label_generation",
      "report_generation",
      "data_export",
      "data_import",
    ])
    .withMessage("Invalid task type"),
  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority"),
  body("config").optional().isObject().withMessage("Config must be an object"),
  body("scheduledFor")
    .optional()
    .isISO8601()
    .withMessage("Invalid scheduled date"),
  body("platformConnectionId")
    .optional()
    .isInt()
    .withMessage("Platform connection ID must be an integer"),
  body("maxRetries")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("Max retries must be between 0 and 10"),
  body("parentTaskId")
    .optional()
    .isUUID()
    .withMessage("Parent task ID must be a valid UUID"),
  body("dependsOnTaskIds")
    .optional()
    .isArray()
    .withMessage("Depends on task IDs must be an array"),
];

const updateProgressValidation = [
  param("id").isUUID().withMessage("Task ID must be a valid UUID"),
  body("current")
    .isInt({ min: 0 })
    .withMessage("Current must be a non-negative integer"),
  body("total")
    .isInt({ min: 1 })
    .withMessage("Total must be a positive integer"),
  body("message").optional().isString().withMessage("Message must be a string"),
  body("phase").optional().isString().withMessage("Phase must be a string"),
];

const taskIdValidation = [
  param("id").isUUID().withMessage("Task ID must be a valid UUID"),
];

const addLogValidation = [
  param("id").isUUID().withMessage("Task ID must be a valid UUID"),
  body("level")
    .isIn(["debug", "info", "warn", "error"])
    .withMessage("Invalid log level"),
  body("message").notEmpty().withMessage("Log message is required"),
  body("data").optional().isObject().withMessage("Log data must be an object"),
];

const bulkOperationValidation = [
  body("taskIds")
    .isArray({ min: 1 })
    .withMessage("Task IDs array is required and must not be empty"),
  body("taskIds.*").isUUID().withMessage("All task IDs must be valid UUIDs"),
  body("action")
    .isIn(["start", "pause", "resume", "cancel", "retry"])
    .withMessage("Invalid bulk action"),
];

// Routes

// GET /api/background-tasks - Get tasks with pagination and filtering
router.get(
  "/",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isString()
      .withMessage("Status must be a string"),
    query("taskType")
      .optional()
      .isString()
      .withMessage("Task type must be a string"),
    query("priority")
      .optional()
      .isString()
      .withMessage("Priority must be a string"),
    query("platformConnectionId")
      .optional()
      .isInt()
      .withMessage("Platform connection ID must be an integer"),
    query("search")
      .optional()
      .isString()
      .withMessage("Search term must be a string"),
    query("sortBy")
      .optional()
      .isString()
      .withMessage("Sort field must be a string"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Sort order must be asc or desc"),
    query("dateFrom")
      .optional()
      .isISO8601()
      .withMessage("Date from must be a valid date"),
    query("dateTo")
      .optional()
      .isISO8601()
      .withMessage("Date to must be a valid date"),
  ],
  BackgroundTaskController.getTasks
);

// GET /api/background-tasks/stats - Get task statistics
router.get(
  "/stats",
  [
    query("timeframe")
      .optional()
      .isIn(["1h", "6h", "24h", "7d", "30d"])
      .withMessage("Invalid timeframe"),
  ],
  BackgroundTaskController.getStats
);

// GET /api/background-tasks/queue - Get queued tasks (admin only)
router.get(
  "/queue",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("taskType")
      .optional()
      .isString()
      .withMessage("Task type must be a string"),
    query("priority")
      .optional()
      .isString()
      .withMessage("Priority must be a string"),
    query("platformConnectionId")
      .optional()
      .isInt()
      .withMessage("Platform connection ID must be an integer"),
  ],
  BackgroundTaskController.getQueue
);

// GET /api/background-tasks/:id - Get task by ID
router.get(
  "/:id",
  [
    ...taskIdValidation,
    query("includeChildren")
      .optional()
      .isBoolean()
      .withMessage("Include children must be a boolean"),
  ],
  BackgroundTaskController.getTaskById
);

// POST /api/background-tasks - Create new task
router.post("/", createTaskValidation, BackgroundTaskController.createTask);

// PATCH /api/background-tasks/:id/progress - Update task progress
router.patch(
  "/:id/progress",
  updateProgressValidation,
  BackgroundTaskController.updateProgress
);

// POST /api/background-tasks/:id/logs - Add log entry
router.post("/:id/logs", addLogValidation, BackgroundTaskController.addLog);

// PATCH /api/background-tasks/:id/start - Start task
router.patch(
  "/:id/start",
  taskIdValidation,
  BackgroundTaskController.startTask
);

// PATCH /api/background-tasks/:id/complete - Complete task
router.patch(
  "/:id/complete",
  taskIdValidation,
  BackgroundTaskController.completeTask
);

// PATCH /api/background-tasks/:id/fail - Fail task
router.patch("/:id/fail", taskIdValidation, BackgroundTaskController.failTask);

// PATCH /api/background-tasks/:id/cancel - Cancel task
router.patch(
  "/:id/cancel",
  taskIdValidation,
  BackgroundTaskController.cancelTask
);

// PATCH /api/background-tasks/:id/retry - Retry task
router.patch(
  "/:id/retry",
  taskIdValidation,
  BackgroundTaskController.retryTask
);

// PATCH /api/background-tasks/:id/pause - Pause task
router.patch(
  "/:id/pause",
  taskIdValidation,
  BackgroundTaskController.pauseTask
);

// PATCH /api/background-tasks/:id/resume - Resume task
router.patch(
  "/:id/resume",
  taskIdValidation,
  BackgroundTaskController.resumeTask
);

// POST /api/background-tasks/bulk - Bulk operations
router.post(
  "/bulk",
  bulkOperationValidation,
  BackgroundTaskController.bulkOperation
);

// DELETE /api/background-tasks/cleanup - Cleanup old tasks (admin only)
router.delete(
  "/cleanup",
  [
    body("olderThanDays")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Older than days must be between 1 and 365"),
    body("statuses")
      .optional()
      .isArray()
      .withMessage("Statuses must be an array"),
  ],
  BackgroundTaskController.cleanupTasks
);

// PATCH /api/background-tasks/timeouts - Handle task timeouts (admin only)
router.patch("/timeouts", BackgroundTaskController.handleTimeouts);

// DELETE /api/background-tasks/:id - Delete task (admin only)
router.delete("/:id", taskIdValidation, BackgroundTaskController.deleteTask);

module.exports = router;
