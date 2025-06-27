const axios = require("axios");
const crypto = require("crypto");
const debug = require("debug")("pazar:trendyol:questions");

class TrendyolQuestionService {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.supplierId = config.supplierId;
    this.sellerId = config.sellerId;
    this.baseURL = config.isTest
      ? "https://stageapigw.trendyol.com/integration/qna"
      : "https://apigw.trendyol.com/integration/qna";
  }

  /**
   * Get authentication headers for Trendyol API
   */
  getAuthHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(
        `${this.apiKey}:${this.apiSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Get customer questions from Trendyol
   * API: GET /sellers/{sellerId}/questions/filter
   * Updated per official documentation: https://developers.trendyol.com/docs/marketplace/soru-cevap-entegrasyonu/musteri-sorularini-cekme
   */
  async getQuestions(options = {}) {
    try {
      const {
        startDate,
        endDate,
        status, // WAITING_FOR_ANSWER, WAITING_FOR_APPROVE, ANSWERED, REPORTED, REJECTED
        page = 0,
        size = 50,
        barcode,
        orderByField = "CreatedDate",
        orderByDirection = "DESC",
      } = options;

      const params = {
        supplierId: this.supplierId, // Required parameter
        page,
        size,
        orderByField,
        orderByDirection,
      };

      if (startDate) params.startDate = new Date(startDate).getTime();
      if (endDate) params.endDate = new Date(endDate).getTime();
      if (status) params.status = status;
      if (barcode) params.barcode = barcode;

      const url = `${this.baseURL}/sellers/${this.sellerId}/questions/filter`;

      debug("Fetching questions from Trendyol:", { url, params });

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        params,
      });

      return this.normalizeQuestionsResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching questions from Trendyol:",
        error.response?.data || error.message
      );
      throw new Error(
        `Trendyol questions fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get customer questions from Trendyol in original format
   * Returns the exact structure that matches the examples provided
   */
  async getQuestionsInOriginalFormat(options = {}) {
    try {
      const {
        startDate,
        endDate,
        status, // WAITING_FOR_ANSWER, WAITING_FOR_APPROVE, ANSWERED, REPORTED, REJECTED
        page = 0,
        size = 50,
        barcode,
        orderByField = "CreatedDate",
        orderByDirection = "DESC",
      } = options;

      const params = {
        supplierId: this.supplierId, // Required parameter
        page,
        size,
        orderByField,
        orderByDirection,
      };

      if (startDate) params.startDate = new Date(startDate).getTime();
      if (endDate) params.endDate = new Date(endDate).getTime();
      if (status) params.status = status;
      if (barcode) params.barcode = barcode;

      const url = `${this.baseURL}/sellers/${this.sellerId}/questions/filter`;

      debug("Fetching questions from Trendyol (original format):", {
        url,
        params,
      });

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        params,
      });

      return this.normalizeQuestionsResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching questions from Trendyol (original format):",
        error.response?.data || error.message
      );
      throw new Error(
        `Trendyol questions fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get a specific question by ID
   * API: GET /sellers/{sellerId}/questions/{id}
   */
  async getQuestionById(questionId) {
    try {
      const url = `${this.baseURL}/sellers/${this.sellerId}/questions/${questionId}`;

      debug("Fetching question by ID from Trendyol:", { url, questionId });

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
      });

      return this.normalizeQuestionResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching question by ID from Trendyol:",
        error.response?.data || error.message
      );
      throw new Error(
        `Trendyol question fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Answer a customer question
   * API: POST /sellers/{sellerId}/questions/{id}/answers
   */
  async answerQuestion(questionId, answerText) {
    try {
      if (answerText.length < 10 || answerText.length > 2000) {
        throw new Error("Answer text must be between 10 and 2000 characters");
      }

      const url = `${this.baseURL}/sellers/${this.sellerId}/questions/${questionId}/answers`;

      debug("Answering question on Trendyol:", {
        url,
        questionId,
        answerLength: answerText.length,
      });

      const response = await axios.post(
        url,
        {
          text: answerText,
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
        "Error answering question on Trendyol:",
        error.response?.data || error.message
      );
      throw new Error(
        `Trendyol answer submission failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Normalize questions list response from Trendyol API
   * Keep the original Trendyol format as requested
   */
  normalizeQuestionsResponse(data) {
    return {
      content: data.content || [],
      page: data.page || 0,
      size: data.size || 0,
      totalElements: data.totalElements || 0,
      totalPages: data.totalPages || 0,
    };
  }

  /**
   * Normalize single question response
   * Return the original Trendyol format as requested
   */
  normalizeQuestionResponse(data) {
    return data;
  }

  /**
   * Normalize question data structure for internal use
   * This method converts the Trendyol API format to our internal database format
   * when storing in the database, but the API responses will use the original format
   */
  normalizeQuestionData(question) {
    // Generate question hash for similarity detection
    const questionHash = this.generateQuestionHash(question.text);

    return {
      platform: "trendyol",
      platform_question_id: question.id?.toString(),
      customer_id: question.customerId?.toString(),
      customer_name: question.userName || "",
      show_customer_name: question.showUserName,
      question_text: question.text,
      status: question.status,
      product_name: question.productName,
      product_main_id: question.productMainId?.toString(),
      product_image_url: question.imageUrl,
      product_web_url: question.webUrl,
      public: question.public,
      creation_date: new Date(question.creationDate),
      answered_date: question.answer?.creationDate
        ? new Date(question.answer.creationDate)
        : null,
      answered_date_message: question.answeredDateMessage,
      reported_date: question.reportedDate
        ? new Date(question.reportedDate)
        : null,
      report_reason: question.reportReason,
      rejected_date: question.rejectedDate
        ? new Date(question.rejectedDate)
        : null,
      reason: question.reason,
      question_hash: questionHash,
      raw_data: question,

      // Answer information if available
      answer: question.answer
        ? {
            platform_reply_id: question.answer.id?.toString(),
            reply_text: question.answer.text,
            has_private_info: question.answer.hasPrivateInfo,
            creation_date: new Date(question.answer.creationDate),
            reason: question.answer.reason,
            raw_data: question.answer,
          }
        : null,

      // Rejected answer information if available
      rejected_answer: question.rejectedAnswer
        ? {
            platform_reply_id: question.rejectedAnswer.id?.toString(),
            reply_text: question.rejectedAnswer.text,
            creation_date: new Date(question.rejectedAnswer.creationDate),
            reason: question.rejectedAnswer.reason,
          }
        : null,
    };
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
   * Get questions statistics
   */
  async getQuestionsStats(startDate, endDate) {
    try {
      // Fetch questions for different statuses
      const statuses = [
        "WAITING_FOR_ANSWER",
        "ANSWERED",
        "REJECTED",
        "REPORTED",
      ];
      const stats = {
        total_questions: 0,
        waiting_for_answer: 0,
        answered: 0,
        rejected: 0,
        reported: 0,
      };

      for (const status of statuses) {
        const response = await this.getQuestions({
          startDate,
          endDate,
          status,
          size: 1, // We only need the count
        });

        const count = response.pagination.totalElements;
        stats.total_questions += count;

        switch (status) {
          case "WAITING_FOR_ANSWER":
            stats.waiting_for_answer = count;
            break;
          case "ANSWERED":
            stats.answered = count;
            break;
          case "REJECTED":
            stats.rejected = count;
            break;
          case "REPORTED":
            stats.reported = count;
            break;
        }
      }

      return stats;
    } catch (error) {
      debug("Error getting questions stats from Trendyol:", error.message);
      throw error;
    }
  }
}

module.exports = TrendyolQuestionService;
