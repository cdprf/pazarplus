const axios = require("axios");
const crypto = require("crypto");
const debug = require("debug")("pazar:hepsiburada:questions");

class HepsiBuradaQuestionService {
  constructor(config) {
    this.username = config.username; // Used as User-Agent
    this.apiKey = config.apiKey; // Used for Basic auth
    this.merchantId = config.merchantId;
    this.baseURL = config.isTest
      ? "https://oms-external-sit.hepsiburada.com/packages/merchantid"
      : "https://oms-external.hepsiburada.com/packages/merchantid";

    // HepsiBurada uses specific base URL for Ask to Seller API
    // Updated per official documentation: https://developers.hepsiburada.com/hepsiburada/reference/soru-listesi
    // Authentication: User-Agent (username), merchantId, Authorization (Basic merchantId:apiKey)
    this.qaBaseURL = config.isTest
      ? "https://api-asktoseller-merchant-sit.hepsiburada.com/api/v1.0"
      : "https://api-asktoseller-merchant.hepsiburada.com/api/v1.0";
  }

  /**
   * Get authentication headers for HepsiBurada API
   */
  getAuthHeaders() {
    return {
      "User-Agent": this.username,
      merchantId: this.merchantId,
      Authorization: `Basic ${Buffer.from(
        `${this.merchantId}:${this.apiKey}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Get customer questions from HepsiBurada
   * Based on the "Satıcıya Sor" (Ask Seller) API
   */
  async getQuestions(options = {}) {
    try {
      const {
        status = [1], // 1: Waiting for answer, 2: Answered, 3: Rejected, 4: Auto-closed
        page = 1,
        size = 50,
        sortBy = 0, // 0: Question date, 1: Last update date
        desc = true,
        startDate,
        endDate,
        orderNumber,
        issueNumber,
        subject,
      } = options;

      const params = {
        status: Array.isArray(status) ? status : [status],
        page,
        size,
        sortBy,
        desc,
      };

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderNumber) params.orderNumber = orderNumber;
      if (issueNumber) params.issueNumber = issueNumber;
      if (subject) params.subject = subject;

      const url = `${this.qaBaseURL}/issues`;

      debug("Fetching questions from HepsiBurada:", { url, params });

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        params,
      });

      return this.normalizeQuestionsResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching questions from HepsiBurada:",
        error.response?.data || error.message
      );
      throw new Error(
        `HepsiBurada questions fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get a specific question by issue number
   */
  async getQuestionByNumber(issueNumber) {
    try {
      const url = `${this.qaBaseURL}/issues/${issueNumber}`;

      debug("Fetching question by number from HepsiBurada:", {
        url,
        issueNumber,
      });

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
      });

      return this.normalizeQuestionResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching question by number from HepsiBurada:",
        error.response?.data || error.message
      );
      throw new Error(
        `HepsiBurada question fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Answer a customer question
   */
  async answerQuestion(issueNumber, answerText, attachments = []) {
    try {
      if (answerText.length < 10 || answerText.length > 2000) {
        throw new Error("Answer text must be between 10 and 2000 characters");
      }

      // Validate attachment formats
      const allowedFormats = [".jpg", ".pdf", ".docx", ".xlsx", ".bmp", ".png"];
      for (const attachment of attachments) {
        const extension = attachment
          .toLowerCase()
          .substring(attachment.lastIndexOf("."));
        if (!allowedFormats.includes(extension)) {
          throw new Error(
            `Invalid attachment format: ${extension}. Allowed: ${allowedFormats.join(
              ", "
            )}`
          );
        }
      }

      const url = `${this.qaBaseURL}/issues/${issueNumber}/answer`;

      debug("Answering question on HepsiBurada:", {
        url,
        issueNumber,
        answerLength: answerText.length,
        attachmentCount: attachments.length,
      });

      const requestData = {
        content: answerText,
      };

      if (attachments.length > 0) {
        requestData.files = attachments;
      }

      const response = await axios.post(url, requestData, {
        headers: this.getAuthHeaders(),
      });

      return {
        success: response.status === 200,
        response: response.data,
      };
    } catch (error) {
      debug(
        "Error answering question on HepsiBurada:",
        error.response?.data || error.message
      );
      throw new Error(
        `HepsiBurada answer submission failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Report a question as inappropriate
   */
  async reportQuestion(issueNumber, reason) {
    try {
      const url = `${this.qaBaseURL}/${this.merchantId}/${issueNumber}/reject`;

      debug("Reporting question on HepsiBurada:", { url, issueNumber, reason });

      const response = await axios.post(
        url,
        {
          reason: reason,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: response.status === 200,
        response: response.data,
      };
    } catch (error) {
      debug(
        "Error reporting question on HepsiBurada:",
        error.response?.data || error.message
      );
      throw new Error(
        `HepsiBurada question report failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get questions statistics by status
   */
  async getQuestionsCount() {
    try {
      // Use the same endpoint as getQuestions but with a count parameter
      const url = `${this.qaBaseURL}/issues/count`;

      debug("Fetching questions count from HepsiBurada:", { url });

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      debug(
        "Error fetching questions count from HepsiBurada:",
        error.response?.data || error.message
      );

      // If count endpoint doesn't exist, calculate from regular questions endpoint
      try {
        debug(
          "Trying alternative method: fetching questions with size=1 to get count"
        );
        const questionsResponse = await this.getQuestions({ page: 1, size: 1 });

        return {
          total_questions: questionsResponse.questions?.length || 0,
          waiting_for_answer: 0,
          answered: 0,
          rejected: 0,
        };
      } catch (fallbackError) {
        throw new Error(
          `HepsiBurada questions count fetch failed: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  }

  /**
   * Normalize questions list response from HepsiBurada API
   */
  normalizeQuestionsResponse(data) {
    if (!data || !Array.isArray(data)) {
      return { questions: [], pagination: null };
    }

    return {
      questions: data.map((q) => this.normalizeQuestionData(q)),
      pagination: null, // HepsiBurada might not provide pagination info in this format
    };
  }

  /**
   * Normalize single question response
   */
  normalizeQuestionResponse(data) {
    return this.normalizeQuestionData(data);
  }

  /**
   * Normalize question data structure for internal use
   */
  normalizeQuestionData(question) {
    // Generate question hash for similarity detection
    const questionHash = this.generateQuestionHash(question.lastContent || "");

    // Determine expire date (2 business days from creation)
    const expireDate = question.expireDate
      ? new Date(question.expireDate)
      : this.calculateExpireDate(question.createdAt);

    return {
      platform: "hepsiburada",
      platform_question_id: question.issueNumber?.toString(),
      customer_id: question.customerId?.toString(),
      customer_name: this.extractCustomerName(question),
      show_customer_name: true, // HepsiBurada doesn't have this field explicitly
      question_text: question.lastContent || "",
      status: this.mapHepsiBuradaStatus(question.status),
      product_name: question.product?.name,
      product_sku: question.product?.sku,
      product_stock_code: question.product?.stockCode,
      product_image_url: question.product?.imageUrl,
      order_number: question.orderNumber,
      line_item_id: question.lineItemId,
      public: true, // Default to public
      creation_date: new Date(question.createdAt),
      answered_date: this.getAnsweredDate(question),
      expire_date: expireDate,
      last_modified_at: question.lastModifiedAt
        ? new Date(question.lastModifiedAt)
        : null,
      subject_id: question.subject?.id,
      subject_description: question.subject?.description,
      merchant_id: question.merchant?.id,
      merchant_name: question.merchant?.name,
      question_hash: questionHash,
      raw_data: question,

      // Conversations/replies
      conversations:
        question.conversations?.map((conv) => ({
          platform_reply_id: conv.id?.toString(),
          reply_text: conv.content,
          from_type:
            conv.from?.toLowerCase() === "customer" ? "customer" : "merchant",
          creation_date: new Date(conv.createdAt),
          customer_feedback: conv.customerFeedback,
          reject_reason: conv.rejectReason,
          attachments: conv.files || [],
        })) || [],
    };
  }

  /**
   * Map HepsiBurada status to our internal status
   */
  mapHepsiBuradaStatus(status) {
    const statusMapping = {
      WaitingforAnswer: "WAITING_FOR_ANSWER",
      Answered: "ANSWERED",
      Rejected: "REJECTED",
      AutoClosed: "AUTO_CLOSED",
    };

    return statusMapping[status] || status;
  }

  /**
   * Extract customer name from conversations
   */
  extractCustomerName(question) {
    // Try to find customer name from conversations
    const customerConversation = question.conversations?.find(
      (conv) => conv.from?.toLowerCase() === "customer"
    );

    return (
      customerConversation?.customerName ||
      question.customerName ||
      `Customer ${question.customerId}`
    );
  }

  /**
   * Get answered date from conversations
   */
  getAnsweredDate(question) {
    const merchantReply = question.conversations?.find(
      (conv) => conv.from?.toLowerCase() === "merchant"
    );

    return merchantReply ? new Date(merchantReply.createdAt) : null;
  }

  /**
   * Calculate expire date (2 business days from creation)
   */
  calculateExpireDate(createdAt) {
    const created = new Date(createdAt);
    let businessDays = 0;
    let currentDate = new Date(created);

    while (businessDays < 2) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }

    return currentDate;
  }

  /**
   * Generate a hash for question similarity detection
   */
  generateQuestionHash(questionText) {
    // Normalize text: lowercase, remove punctuation, sort words
    const normalizedText = questionText
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((word) => word.length > 2) // Remove very short words
      .sort()
      .join(" ");

    return crypto.createHash("md5").update(normalizedText).digest("hex");
  }

  /**
   * Create a test question (only available in test environment)
   */
  async createTestQuestion(issueCount = 1) {
    try {
      if (!this.baseURL.includes("sit")) {
        throw new Error(
          "Test question creation is only available in test environment"
        );
      }

      const url = `${this.qaBaseURL}/${this.merchantId}/test`;

      debug("Creating test question on HepsiBurada:", { url, issueCount });

      const response = await axios.post(
        url,
        {
          issueCount: issueCount,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: response.status === 200,
        response: response.data,
      };
    } catch (error) {
      debug(
        "Error creating test question on HepsiBurada:",
        error.response?.data || error.message
      );
      throw new Error(
        `HepsiBurada test question creation failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }
}

module.exports = HepsiBuradaQuestionService;
