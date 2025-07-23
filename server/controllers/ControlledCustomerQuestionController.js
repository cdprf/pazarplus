// Customer Question Controller with controlled platform service initialization
const { validationResult } = require("express-validator");
const SimplifiedCustomerQuestionService = require("../services/SimplifiedCustomerQuestionService");
const debug = require("debug")("pazar:controller:questions:controlled");

class ControlledCustomerQuestionController {
  constructor() {
    // Start with simplified service, add platforms gradually
    this.questionService = new SimplifiedCustomerQuestionService();
    this.initialized = true;
    this.platformInitializationLevel = 0; // 0=none, 1=trendyol, 2=hepsiburada, 3=n11
    debug("ControlledCustomerQuestionController instantiated");
  }

  /**
   * Get platform credentials from database
   */
  async getPlatformCredentials(platformType) {
    try {
      const { PlatformConnection } = require("../models");

      // Find active connection for this platform type
      const connection = await PlatformConnection.findOne({
        where: {
          platformType: platformType,
          isActive: true,
          status: "active",
        },
        order: [
          ["isDefault", "DESC"],
          ["lastTestedAt", "DESC"],
        ],
      });

      if (!connection) {
        debug(`No active ${platformType} connection found in database`);
        return null;
      }

      debug(
        `Found ${platformType} connection in database (ID: ${connection.id})`
      );

      // Extract credentials and build config
      const credentials = connection.credentials;
      if (!credentials) {
        debug(`No credentials found for ${platformType} connection`);
        return null;
      }

      // Build platform-specific config
      const baseConfig = {
        enabled: true,
        isTest: connection.environment !== "production",
        environment: connection.environment,
        connectionId: connection.id,
      };

      // Platform-specific credential mapping
      switch (platformType) {
        case "trendyol":
          return {
            ...baseConfig,
            apiKey: credentials.apiKey,
            apiSecret: credentials.apiSecret || credentials.secretKey,
            sellerId: credentials.sellerId,
            supplierId: credentials.supplierId,
          };

        case "hepsiburada":
          return {
            ...baseConfig,
            apiKey: credentials.apiKey,
            apiSecret: credentials.apiSecret || credentials.secretKey,
            merchantId: credentials.merchantId,
            username: credentials.username,
            password: credentials.password,
          };

        case "n11":
          return {
            ...baseConfig,
            apiKey: credentials.apiKey,
            apiSecret: credentials.apiSecret || credentials.secretKey,
            companyCode: credentials.companyCode,
          };

        default:
          debug(`Unknown platform type: ${platformType}`);
          return null;
      }
    } catch (error) {
      debug(`Error getting ${platformType} credentials:`, error.message);
      return null;
    }
  }

  /**
   * Initialize platform services one by one for testing
   */
  async initializePlatformServices(level = 1) {
    if (this.platformInitializationLevel >= level) {
      debug(`Platform initialization level ${level} already reached`);
      return true;
    }

    try {
      debug(`Initializing platform services to level ${level}`);

      // Level 1: Add Trendyol (usually most stable)
      if (level >= 1 && this.platformInitializationLevel < 1) {
        debug("Adding Trendyol service...");
        const TrendyolQuestionService = require("../services/TrendyolQuestionService");

        // Fetch credentials from platform_connections table
        const trendyolConfig = await this.getPlatformCredentials("trendyol");
        if (!trendyolConfig) {
          debug("Trendyol credentials not found in platform_connections table");
          return false;
        }

        if (!trendyolConfig.apiKey || !trendyolConfig.apiSecret) {
          debug("Trendyol credentials incomplete:", {
            hasApiKey: !!trendyolConfig.apiKey,
            hasApiSecret: !!trendyolConfig.apiSecret,
            hasSellerId: !!trendyolConfig.sellerId,
            hasSupplier: !!trendyolConfig.supplierId,
          });
          return false;
        }

        try {
          this.questionService.platformServices.trendyol =
            new TrendyolQuestionService(trendyolConfig);
          debug(
            "Trendyol service added successfully with database credentials"
          );
          this.platformInitializationLevel = 1;
        } catch (error) {
          debug("Failed to add Trendyol service:", error.message);
          return false;
        }
      }

      // Level 2: Add HepsiBurada
      if (level >= 2 && this.platformInitializationLevel < 2) {
        debug("Adding HepsiBurada service...");
        const HepsiBuradaQuestionService = require("../services/HepsiBuradaQuestionService");

        // Fetch credentials from platform_connections table
        const hepsiburadaConfig = await this.getPlatformCredentials(
          "hepsiburada"
        );
        if (!hepsiburadaConfig) {
          debug(
            "HepsiBurada credentials not found in platform_connections table"
          );
          return false;
        }

        if (!hepsiburadaConfig.apiKey || !hepsiburadaConfig.apiSecret) {
          debug("HepsiBurada credentials incomplete");
          return false;
        }

        try {
          this.questionService.platformServices.hepsiburada =
            new HepsiBuradaQuestionService(hepsiburadaConfig);
          debug(
            "HepsiBurada service added successfully with database credentials"
          );
          this.platformInitializationLevel = 2;
        } catch (error) {
          debug("Failed to add HepsiBurada service:", error.message);
          return false;
        }
      }

      // Level 3: Add N11 (most problematic)
      if (level >= 3 && this.platformInitializationLevel < 3) {
        debug("Adding N11 service...");
        const N11QuestionService = require("../services/N11QuestionService");

        // Fetch credentials from platform_connections table
        const n11Config = await this.getPlatformCredentials("n11");
        if (!n11Config) {
          debug("N11 credentials not found in platform_connections table");
          return false;
        }

        if (!n11Config.apiKey || !n11Config.apiSecret) {
          debug("N11 credentials incomplete");
          return false;
        }

        try {
          // Add timeout protection for N11
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("N11 service initialization timeout")),
              5000
            );
          });

          const initPromise = Promise.resolve(
            new N11QuestionService(n11Config)
          );

          this.questionService.platformServices.n11 = await Promise.race([
            initPromise,
            timeoutPromise,
          ]);

          debug("N11 service added successfully with real credentials");
          this.platformInitializationLevel = 3;
        } catch (error) {
          debug("Failed to add N11 service:", error.message);
          return false;
        }
      }

      debug(
        `Platform initialization completed at level ${this.platformInitializationLevel}`
      );
      return true;
    } catch (error) {
      debug("Error during platform initialization:", error.message);
      return false;
    }
  }

  /**
   * Get questions with platform service integration
   */
  async getQuestions(req, res) {
    debug("Getting questions with controlled platform services");
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        platform,
        status,
        assigned_to,
        customer_name,
        priority,
        start_date,
        end_date,
        page = 1,
        limit = 20,
        sort_by = "creation_date",
        sort_order = "DESC",
        with_platforms = "false", // New parameter to control platform integration
        search,
      } = req.query;

      // If platform integration is requested, try to initialize
      if (with_platforms === "true" && this.platformInitializationLevel === 0) {
        debug("Platform integration requested, initializing services...");
        const initialized = await this.initializePlatformServices(1); // Start with level 1
        if (!initialized) {
          debug(
            "Platform initialization failed, continuing with basic service"
          );
        }
      }

      const options = {
        platform,
        status,
        assigned_to: assigned_to ? parseInt(assigned_to) : undefined,
        customer_name,
        priority,
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order?.toUpperCase() || "DESC",
        search,
      };

      const result = await this.questionService.getQuestions(options);

      // Add metadata about platform services
      const responseData = {
        success: true,
        data: result.questions,
        pagination: result.pagination,
        meta: {
          platformServicesLevel: this.platformInitializationLevel,
          availablePlatforms: Object.keys(
            this.questionService.platformServices
          ),
        },
      };

      res.json(responseData);
    } catch (error) {
      debug("Error getting questions:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get questions",
        error: error.message,
      });
    }
  }

  /**
   * Test endpoint to manually initialize platform services
   */
  async initializePlatforms(req, res) {
    try {
      debug("Manual platform initialization requested");

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { level = 1 } = req.body;

      const success = await this.initializePlatformServices(parseInt(level));

      res.json({
        success: true,
        message: `Platform initialization ${success ? "successful" : "failed"}`,
        data: {
          currentLevel: this.platformInitializationLevel,
          requestedLevel: parseInt(level),
          availablePlatforms: Object.keys(
            this.questionService.platformServices
          ),
        },
      });
    } catch (error) {
      debug("Error initializing platforms:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to initialize platforms",
        error: error.message,
      });
    }
  }

  /**
   * Get questions for a specific customer
   */
  async getQuestionsByCustomer(req, res) {
    try {
      const { email } = req.params;
      debug(`Getting questions for customer: ${email}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        status,
        platform,
        page = 1,
        limit = 20,
        sort_by = "creation_date",
        sort_order = "DESC",
      } = req.query;

      const options = {
        status,
        platform,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order,
      };

      const result = await this.questionService.getQuestionsByCustomer(
        email,
        options
      );

      res.json({
        success: true,
        data: result.questions,
        pagination: result.pagination,
        meta: {
          platformServicesLevel: this.platformInitializationLevel,
        },
      });
    } catch (error) {
      debug("Error getting questions by customer:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get questions for customer",
        error: error.message,
      });
    }
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(req, res) {
    try {
      const { id } = req.params;
      debug(`Getting question with ID: ${id}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const question = await this.questionService.getQuestionById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      res.json({
        success: true,
        data: question,
        meta: {
          platformServicesLevel: this.platformInitializationLevel,
        },
      });
    } catch (error) {
      debug("Error getting question:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get question",
        error: error.message,
      });
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(req, res) {
    try {
      debug("Getting question statistics");

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { timeframe = "30d" } = req.query;

      const stats = await this.questionService.getQuestionStats(timeframe);

      res.json({
        success: true,
        data: stats,
        meta: {
          platformServicesLevel: this.platformInitializationLevel,
          availablePlatforms: Object.keys(
            this.questionService.platformServices
          ),
        },
      });
    } catch (error) {
      debug("Error getting question statistics:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get question statistics",
        error: error.message,
      });
    }
  }

  /**
   * Update question status
   */
  async updateQuestionStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      debug(`Updating question ${id} status to: ${status}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const updatedQuestion = await this.questionService.updateQuestionStatus(
        id,
        status
      );

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      res.json({
        success: true,
        message: "Question status updated successfully",
        data: updatedQuestion,
      });
    } catch (error) {
      debug("Error updating question status:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to update question status",
        error: error.message,
      });
    }
  }

  /**
   * Get reply templates
   */
  async getReplyTemplates(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    try {
      debug("Getting reply templates");
      const { category } = req.query;

      // For now, return mock templates since we don't have a database table
      const mockTemplates = [
        {
          id: 1,
          name: "Standard Product Info",
          content:
            "Merhaba {customer_name}, ürün hakkında bilgi vermek isteriz...",
          category: "product_info",
          platforms: ["trendyol", "hepsiburada", "n11"],
          keywords: ["ürün", "bilgi", "özellik"],
          variables: ["customer_name", "product_name"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Shipping Information",
          content: "Merhaba {customer_name}, kargo durumu hakkında bilgi...",
          category: "shipping",
          platforms: ["trendyol", "hepsiburada"],
          keywords: ["kargo", "sevkiyat", "teslimat"],
          variables: ["customer_name", "order_number"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Return Policy",
          content: "İade politikamız hakkında detaylı bilgi...",
          category: "returns",
          platforms: ["trendyol", "hepsiburada", "n11"],
          keywords: ["iade", "değişim", "garanti"],
          variables: ["customer_name"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Filter by category if provided
      let templates = mockTemplates;
      if (category) {
        templates = mockTemplates.filter(
          (template) => template.category === category
        );
      }

      res.json({
        success: true,
        message: "Reply templates retrieved successfully",
        data: {
          templates,
          total: templates.length,
          categories: ["product_info", "shipping", "returns", "general"],
        },
      });
    } catch (error) {
      debug("Error getting reply templates:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get reply templates",
        error: error.message,
      });
    }
  }

  /**
   * Save reply template
   */
  async saveReplyTemplate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    try {
      debug("Saving reply template");

      const { title, name, content, category = "general" } = req.body;

      // Use 'name' if provided, otherwise fall back to 'title' for backward compatibility
      const templateName = name || title;

      if (!templateName) {
        return res.status(400).json({
          success: false,
          message: "Template name is required",
        });
      }

      // For now, simulate saving (since we're using mock data)
      // In a real implementation, this would save to a database
      const newTemplate = {
        id: Date.now(), // Simple ID generation for mock
        name: templateName.trim(),
        content: content.trim(),
        category,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      debug("Template saved successfully:", newTemplate.id);

      res.status(201).json({
        success: true,
        message: "Reply template saved successfully",
        data: newTemplate,
      });
    } catch (error) {
      debug("Error saving reply template:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to save reply template",
        error: error.message,
      });
    }
  }

  /**
   * Sync questions from platforms
   */
  async syncQuestions(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    try {
      debug("Starting question sync from platforms");

      const { platforms, start_date, end_date } = req.body;

      // Initialize platform services if not already done
      if (this.platformInitializationLevel === 0) {
        debug("Initializing platform services for sync...");
        const initialized = await this.initializePlatformServices(1); // At least level 1
        if (!initialized) {
          return res.status(500).json({
            success: false,
            message: "Failed to initialize platform services for sync",
          });
        }
      }

      const options = {};
      if (start_date) {
        options.startDate = new Date(start_date);
      }
      if (end_date) {
        options.endDate = new Date(end_date);
      }
      if (platforms) {
        options.platforms = platforms;
      }

      debug("Starting question sync with options:", options);

      // Check if the SimplifiedCustomerQuestionService has a sync method
      let result;
      if (typeof this.questionService.syncAllQuestions === "function") {
        result = await this.questionService.syncAllQuestions(options);

        // Handle the case where no platforms are configured
        if (!result.success && result.errors.length > 0) {
          const noPlatformsError = result.errors.find((error) =>
            error.includes("No platform services available")
          );

          if (noPlatformsError) {
            return res.status(200).json({
              success: false,
              message: "No platform connections configured",
              data: {
                totalSynced: 0,
                platforms: {},
                errors: result.errors,
                suggestion:
                  "Please configure platform connections in the settings before syncing questions.",
              },
            });
          }
        }
      } else {
        // Fallback: manually sync from available platform services
        result = await this.manualSyncFromPlatforms(options);
      }

      res.json({
        success: result.success,
        message: `Synced ${result.totalSynced || 0} questions`,
        data: {
          ...result,
          platformServicesLevel: this.platformInitializationLevel,
          availablePlatforms: Object.keys(
            this.questionService.platformServices
          ),
        },
      });
    } catch (error) {
      debug("Error syncing questions:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to sync questions",
        error: error.message,
      });
    }
  }

  /**
   * Manual sync from available platform services
   */
  async manualSyncFromPlatforms(options = {}) {
    try {
      debug("Performing manual sync from platform services");

      const results = {
        success: true,
        totalSynced: 0,
        platformResults: {},
        errors: [],
      };

      const availablePlatforms = Object.keys(
        this.questionService.platformServices
      );
      debug("Available platforms for sync:", availablePlatforms);

      for (const platformName of availablePlatforms) {
        try {
          const platformService =
            this.questionService.platformServices[platformName];
          debug(`Syncing from ${platformName}...`);

          // Get questions from platform
          const platformResponse = await platformService.getQuestions(options);

          // Handle different response formats - Trendyol returns content, others may return different formats
          let platformQuestions = [];
          if (platformName === "trendyol") {
            // Trendyol now returns {content: [...], page, size, totalElements, totalPages}
            platformQuestions = platformResponse.content || [];
          } else {
            // Other platforms might return {questions: [...], pagination: {...}}
            platformQuestions =
              platformResponse.questions || platformResponse.content || [];
          }

          if (platformQuestions && platformQuestions.length > 0) {
            // Save to database (simplified version)
            const { CustomerQuestion } = require("../models");

            let savedCount = 0;
            for (const question of platformQuestions) {
              try {
                // Check if question already exists
                const existing = await CustomerQuestion.findOne({
                  where: {
                    platform: platformName,
                    platform_question_id:
                      question.platform_question_id || question.id,
                  },
                });

                if (!existing) {
                  // Handle different platform formats
                  let questionData;
                  if (platformName === "trendyol") {
                    // Original Trendyol format
                    questionData = {
                      platform: platformName,
                      platform_question_id: question.id?.toString(),
                      customer_id: question.customerId?.toString(),
                      customer_name: question.userName || "",
                      question_text: question.text,
                      status: question.status || "WAITING_FOR_ANSWER",
                      creation_date: question.creationDate
                        ? new Date(question.creationDate)
                        : new Date(),
                      product_name: question.productName,
                      product_main_id: question.productMainId,
                      product_image_url: question.imageUrl,
                      product_web_url: question.webUrl,
                      public: question.public,
                      show_customer_name: question.showUserName,
                      answered_date_message: question.answeredDateMessage,
                      raw_data: question,
                    };
                  } else {
                    // Other platforms with normalized format
                    questionData = {
                      platform: platformName,
                      platform_question_id:
                        question.platform_question_id || question.id,
                      customer_id: question.customer_id,
                      customer_name:
                        question.customer_name || question.userName,
                      question_text: question.question_text || question.text,
                      status: question.status || "WAITING_FOR_ANSWER",
                      creation_date:
                        question.creation_date ||
                        question.createdDate ||
                        new Date(),
                      product_name: question.product_name,
                      product_sku: question.product_sku,
                      raw_data: question,
                    };
                  }

                  await CustomerQuestion.create(questionData);
                  savedCount++;
                }
              } catch (saveError) {
                debug(
                  `Error saving question from ${platformName}:`,
                  saveError.message
                );
              }
            }

            results.platformResults[platformName] = {
              fetched: platformQuestions.length,
              saved: savedCount,
            };
            results.totalSynced += savedCount;

            debug(
              `${platformName}: fetched ${platformQuestions.length}, saved ${savedCount}`
            );
          } else {
            results.platformResults[platformName] = {
              fetched: 0,
              saved: 0,
              message: "No new questions found",
            };
            debug(`${platformName}: no questions found`);
          }
        } catch (platformError) {
          debug(`Error syncing from ${platformName}:`, platformError.message);
          results.errors.push({
            platform: platformName,
            error: platformError.message,
          });
          results.platformResults[platformName] = {
            error: platformError.message,
          };
        }
      }

      return results;
    } catch (error) {
      debug("Error in manual sync:", error.message);
      return {
        success: false,
        error: error.message,
        totalSynced: 0,
      };
    }
  }

  /**
   * Test platform connectivity
   */
  async testPlatformConnectivity(req, res) {
    try {
      debug("Testing platform connectivity");

      const { platform } = req.params;

      const results = {
        success: true,
        platform: platform,
        timestamp: new Date(),
        databaseConnection: null,
        apiConnection: null,
        error: null,
      };

      // Test database connection for platform
      try {
        const credentials = await this.getPlatformCredentials(platform);
        if (credentials) {
          results.databaseConnection = {
            status: "success",
            message: "Platform credentials found in database",
            config: {
              hasApiKey: !!credentials.apiKey,
              hasApiSecret: !!credentials.apiSecret,
              isTest: credentials.isTest,
            },
          };
        } else {
          results.databaseConnection = {
            status: "failed",
            message: "No active platform connection found in database",
          };
        }
      } catch (dbError) {
        results.databaseConnection = {
          status: "error",
          message: dbError.message,
        };
      }

      // Test API connectivity if credentials are available
      if (results.databaseConnection?.status === "success") {
        try {
          // Initialize platform service for testing
          const initResult = await this.initializePlatformServices(
            platform === "trendyol" ? 1 : platform === "hepsiburada" ? 2 : 3
          );

          if (initResult && this.questionService.platformServices[platform]) {
            // Try to make a simple API call
            const platformService =
              this.questionService.platformServices[platform];

            // Test with minimal date range to avoid too much data
            const testOptions = {
              page: 0,
              size: 1,
              startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              endDate: new Date(),
            };

            const testResponse = await platformService.getQuestions(
              testOptions
            );

            results.apiConnection = {
              status: "success",
              message: "API connection successful",
              testResult: {
                questionsFound: Array.isArray(testResponse)
                  ? testResponse.length
                  : 0,
                responseType: typeof testResponse,
              },
            };
          } else {
            results.apiConnection = {
              status: "failed",
              message: "Platform service initialization failed",
            };
          }
        } catch (apiError) {
          results.apiConnection = {
            status: "error",
            message: `API test failed: ${apiError.message}`,
            errorType: apiError.constructor.name,
          };
        }
      }

      res.json(results);
    } catch (error) {
      debug("Error testing platform connectivity:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to test platform connectivity",
        error: error.message,
      });
    }
  }

  /**
   * Reply to a question
   */
  async replyToQuestion(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { text, type = "answer", template_id, attachments } = req.body;
      const userId = req.user?.id || "38d86fd2-bf87-4271-b49d-f1a7645ee4ef"; // Handle case where user is not authenticated

      const replyData = {
        text,
        type,
        template_id: template_id ? parseInt(template_id) : undefined,
        attachments,
      };

      debug(`Replying to question ${id} with type ${type}`);

      const reply = await this.questionService.replyToQuestion(
        parseInt(id),
        replyData,
        userId
      );

      res.json({
        success: true,
        message: "Reply sent successfully",
        data: reply,
      });
    } catch (error) {
      debug("Error replying to question:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to send reply",
        error: error.message,
      });
    }
  }
}

module.exports = ControlledCustomerQuestionController;
