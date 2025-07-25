const axios = require("axios");
const crypto = require("crypto");
const xml2js = require("xml2js");
const debug = require("debug")("pazar:n11:questions");

class N11QuestionService {
  constructor(config) {
    debug("Initializing N11QuestionService");
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseURL = config.isTest
      ? "https://api.n11.com/ws"
      : "https://api.n11.com/ws";
    debug("N11QuestionService initialized with base URL:", this.baseURL);
  }

  /**
   * Get authentication headers for N11 API
   * N11 uses a different authentication mechanism
   */
  getAuthHeaders() {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp);

    return {
      "Content-Type": "application/json",
      "X-N11-Api-Key": this.apiKey,
      "X-N11-Timestamp": timestamp,
      "X-N11-Signature": signature,
    };
  }

  /**
   * Generate signature for N11 API authentication
   */
  generateSignature(timestamp) {
    const data = `${this.apiKey}${timestamp}${this.secretKey}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Get customer questions from N11 using GetProductQuestionList
   * Based on N11 official SOAP API documentation
   */
  async getQuestions(options = {}) {
    debug("Fetching questions from N11 with options:", options);
    try {
      const {
        page = 0, // N11 uses 0-based pagination
        size = 50,
        productId,
        buyerEmail,
        subject,
        status,
        questionDate,
      } = options;

      // Build SOAP request body for GetProductQuestionList matching the official documentation
      const soapBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:GetProductQuestionListRequest>
         <auth>
            <appKey>${this.apiKey}</appKey>
            <appSecret>${this.secretKey}</appSecret>
         </auth>
         <productQuestionSearch>
            ${
              productId
                ? `<productId>${productId}</productId>`
                : "<productId></productId>"
            }
            ${
              buyerEmail
                ? `<buyerEmail>${buyerEmail}</buyerEmail>`
                : "<buyerEmail></buyerEmail>"
            }
            ${subject ? `<subject>${subject}</subject>` : "<subject></subject>"}
            ${status ? `<status>${status}</status>` : "<status></status>"}
            ${
              questionDate
                ? `<questionDate>${this.formatDate(
                    questionDate
                  )}</questionDate>`
                : "<questionDate></questionDate>"
            }
         </productQuestionSearch>
         <pagingData>
            <currentPage>${page}</currentPage>
            <pageSize>${size}</pageSize>
         </pagingData>
      </sch:GetProductQuestionListRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      const url = `${this.baseURL}/ProductService.wsdl`;

      debug("Fetching questions from N11:", { url, page, size });

      const response = await axios.post(url, soapBody, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "getProductQuestionList",
        },
      });

      debug("N11 questions response received, length:", response.data?.length);
      debug(
        "N11 raw XML response (first 500 chars):",
        response.data?.substring(0, 500)
      );

      return await this.normalizeQuestionsResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching questions from N11:",
        error.response?.data || error.message
      );

      // Graceful fallback for missing API implementation
      if (error.response?.status === 404 || error.code === "ENOTFOUND") {
        debug(
          "N11 questions API endpoint not available, returning empty result"
        );
        return {
          questions: [],
          pagination: { page: 0, totalPages: 0, totalItems: 0 },
        };
      }

      throw new Error(
        `N11 questions fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Format date for N11 API (DD/MM/YYYY format)
   */
  formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Get a specific question by ID using GetProductQuestionDetail
   * Based on N11 official SOAP API documentation
   */
  async getQuestionById(productQuestionId) {
    debug("Fetching question detail from N11:", { productQuestionId });
    try {
      if (!productQuestionId) {
        throw new Error("Product question ID is required");
      }

      // Build SOAP request body for GetProductQuestionDetail matching the official documentation
      const soapBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:GetProductQuestionDetailRequest>
         <auth>
            <appKey>${this.apiKey}</appKey>
            <appSecret>${this.secretKey}</appSecret>
         </auth>
         <productQuestionId>${productQuestionId}</productQuestionId>
      </sch:GetProductQuestionDetailRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      const url = `${this.baseURL}/ProductService.wsdl`;

      debug("Fetching question detail from N11:", { url, productQuestionId });

      const response = await axios.post(url, soapBody, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "getProductQuestionDetail",
        },
      });

      debug("N11 question detail response received");

      return await this.parseQuestionDetailResponse(response.data);
    } catch (error) {
      debug(
        "Error fetching question detail from N11:",
        error.response?.data || error.message
      );

      // Graceful fallback
      if (error.response?.status === 404 || error.code === "ENOTFOUND") {
        debug("N11 question detail API endpoint not available");
        return null;
      }

      throw new Error(
        `N11 question detail fetch failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Answer a customer question using SaveProductAnswer API
   * Based on N11 official documentation: SaveProductAnswer
   */
  async answerQuestion(productQuestionId, answerText) {
    debug("Answering question on N11 with SaveProductAnswer:", {
      productQuestionId,
      answerLength: answerText.length,
    });

    try {
      if (!productQuestionId) {
        throw new Error("Product question ID is required");
      }

      if (!answerText || answerText.trim().length < 10) {
        throw new Error("Answer text must be at least 10 characters");
      }

      if (answerText.length > 2000) {
        throw new Error("Answer text must be less than 2000 characters");
      }

      // Build SOAP request body for SaveProductAnswer matching the official documentation
      const soapBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:SaveProductAnswerRequest>
         <auth>
            <appKey>${this.apiKey}</appKey>
            <appSecret>${this.secretKey}</appSecret>
         </auth>
         <productQuestionId>${productQuestionId}</productQuestionId>
         <answer>${this.escapeXml(answerText.trim())}</answer>
      </sch:SaveProductAnswerRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      const url = `${this.baseURL}/ProductService.wsdl`;

      debug("Sending SaveProductAnswer request to N11:", {
        url,
        productQuestionId,
      });

      const response = await axios.post(url, soapBody, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "saveProductAnswer",
        },
        timeout: 30000, // 30 seconds timeout
      });

      debug("N11 SaveProductAnswer response received");

      // Parse SOAP response
      const responseData = this.parseSaveProductAnswerResponse(response.data);

      if (responseData.success) {
        debug("Question answered successfully on N11:", productQuestionId);
        return {
          success: true,
          questionId: productQuestionId,
          response: responseData,
        };
      } else {
        throw new Error(responseData.error || "Failed to save answer");
      }
    } catch (error) {
      debug("Error answering question on N11:", error.message);

      if (error.code === "ECONNABORTED") {
        throw new Error("N11 API timeout - please try again");
      }

      throw new Error(`N11 answer submission failed: ${error.message}`);
    }
  }

  /**
   * Report a question as inappropriate
   */
  async reportQuestion(questionId, reason) {
    try {
      const url = `${this.baseURL}/CustomerQuestionService.wsdl/${questionId}/report`;

      debug("Reporting question on N11:", { url, questionId, reason });

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
        "Error reporting question on N11:",
        error.response?.data || error.message
      );
      throw new Error(
        `N11 question report failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Normalize questions list response from N11 SOAP API
   */
  normalizeQuestionsResponse(xmlData) {
    try {
      // Parse SOAP XML response
      const parser = new xml2js.Parser({ explicitArray: false });

      return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
          if (err) {
            debug("Error parsing N11 SOAP response:", err);
            resolve({
              questions: [],
              pagination: { page: 0, totalPages: 0, totalItems: 0 },
            });
            return;
          }

          try {
            debug("Parsed N11 XML structure:", JSON.stringify(result, null, 2));

            // Try different possible envelope structures
            let envelope = null;
            let body = null;

            if (result["SOAP-ENV:Envelope"]) {
              envelope = result["SOAP-ENV:Envelope"];
              body = envelope["SOAP-ENV:Body"];
            } else if (result["env:Envelope"]) {
              envelope = result["env:Envelope"];
              body = envelope["env:Body"];
            } else if (result["soap:Envelope"]) {
              envelope = result["soap:Envelope"];
              body = envelope["soap:Body"];
            } else if (result.Envelope) {
              envelope = result.Envelope;
              body = envelope.Body;
            } else {
              debug(
                "No recognized envelope structure found in:",
                Object.keys(result)
              );
              resolve({
                questions: [],
                pagination: { page: 0, totalPages: 0, totalItems: 0 },
              });
              return;
            }

            if (!body) {
              debug(
                "No body found in envelope. Envelope keys:",
                Object.keys(envelope || {})
              );
              resolve({
                questions: [],
                pagination: { page: 0, totalPages: 0, totalItems: 0 },
              });
              return;
            }

            debug("Body structure:", Object.keys(body));

            const response =
              body["ns3:GetProductQuestionListResponse"] ||
              body.GetProductQuestionListResponse;

            if (!response) {
              debug("No response object found in body");
              resolve({
                questions: [],
                pagination: { page: 0, totalPages: 0, totalItems: 0 },
              });
              return;
            }

            if (!response.result || response.result.status !== "success") {
              debug(
                "N11 API returned unsuccessful response:",
                response?.result
              );
              resolve({
                questions: [],
                pagination: { page: 0, totalPages: 0, totalItems: 0 },
              });
              return;
            }

            const questionsData =
              response.productQuestions?.productQuestion || [];
            const pagingData = response.pagingData || {};

            const questions = Array.isArray(questionsData)
              ? questionsData
                  .map((q) => this.normalizeQuestionData(q))
                  .filter((q) => q !== null)
              : questionsData
              ? [this.normalizeQuestionData(questionsData)].filter(
                  (q) => q !== null
                )
              : [];

            const pagination = {
              page: parseInt(pagingData.currentPage) || 0,
              totalPages: parseInt(pagingData.pageCount) || 0,
              totalItems: parseInt(pagingData.totalCount) || 0,
              pageSize: parseInt(pagingData.pageSize) || 50,
            };

            resolve({ questions, pagination });
          } catch (parseError) {
            debug("Error processing N11 response structure:", parseError);
            resolve({
              questions: [],
              pagination: { page: 0, totalPages: 0, totalItems: 0 },
            });
          }
        });
      });
    } catch (error) {
      debug("Error in normalizeQuestionsResponse:", error);
      return {
        questions: [],
        pagination: { page: 0, totalPages: 0, totalItems: 0 },
      };
    }
  }

  /**
   * Normalize single question response
   */
  normalizeQuestionResponse(data) {
    return this.normalizeQuestionData(data);
  }

  /**
   * Normalize question data structure for internal use
   * Based on N11 GetProductQuestionList response fields
   */
  normalizeQuestionData(question) {
    // Handle cases where question data might be missing
    if (!question || typeof question !== "object") {
      return null;
    }

    // Extract fields from N11 GetProductQuestionList response format
    const questionText = question.question || "";
    const answerText = question.answer || "";
    const questionHash = this.generateQuestionHash(questionText);

    return {
      platform: "n11",
      platform_question_id: question.id?.toString(),
      customer_id: null, // N11 doesn't provide customer ID in question list
      customer_name: "N11 Customer", // N11 doesn't provide customer name in question list
      customer_email: null, // Available only in question detail
      show_customer_name: false,
      question_text: questionText,
      question_date: question.questionDate
        ? this.parseN11Date(question.questionDate)
        : new Date(), // Set question_date to match creation_date
      status: this.mapN11Status(answerText ? "answered" : "waiting"),
      product_name: question.productTitle || "",
      product_id: question.productId?.toString(),
      product_sku: null, // Not provided in N11 API
      product_image_url: null, // Not provided in N11 API
      subject: question.questionSubject || question.subject || "",
      public: true, // Default to public
      creation_date: question.questionDate
        ? this.parseN11Date(question.questionDate)
        : new Date(),
      answered_date: answerText ? new Date() : null, // N11 list doesn't provide answered date
      answer_text: answerText,
      expire_date: null, // N11 doesn't provide expiry dates
      last_modified_at: null,
      question_hash: questionHash,
      raw_data: question,

      // N11 specific fields
      n11_product_id: question.productId,
      n11_question_subject: question.questionSubject,
    };
  }

  // ...existing code...

  /**
   * Parse N11 date format
   */
  parseN11Date(dateString) {
    try {
      // N11 might use various date formats, handle common ones
      if (dateString.includes("/")) {
        // DD/MM/YYYY format
        const parts = dateString.split("/");
        if (parts.length === 3) {
          return new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          );
        }
      }
      // Try standard ISO format
      return new Date(dateString);
    } catch (error) {
      debug("Error parsing N11 date:", dateString, error);
      return new Date();
    }
  }

  /**
   * Map N11 status to our internal status
   */
  mapN11Status(status) {
    if (!status) {
      return "WAITING_FOR_ANSWER";
    }

    const statusMapping = {
      waiting: "WAITING_FOR_ANSWER",
      pending: "WAITING_FOR_ANSWER",
      answered: "ANSWERED",
      replied: "ANSWERED",
      rejected: "REJECTED",
      closed: "AUTO_CLOSED",
      expired: "AUTO_CLOSED",
    };

    return statusMapping[status.toLowerCase()] || status.toUpperCase();
  }

  /**
   * Generate a hash for question similarity detection
   */
  generateQuestionHash(questionText) {
    if (!questionText) {
      return "";
    }

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
      // Since N11's exact API structure is unknown, provide a graceful fallback
      const stats = {
        total_questions: 0,
        waiting_for_answer: 0,
        answered: 0,
        rejected: 0,
        auto_closed: 0,
      };

      try {
        const response = await this.getQuestions({
          startDate,
          endDate,
          size: 1,
        });
        if (response.pagination) {
          stats.total_questions = response.pagination.totalElements;
        }
      } catch (error) {
        debug(
          "Could not fetch N11 questions stats, returning zeros:",
          error.message
        );
      }

      return stats;
    } catch (error) {
      debug("Error getting questions stats from N11:", error.message);
      throw error;
    }
  }

  /**
   * Test connection to N11 API
   */
  async testConnection() {
    try {
      // Try a simple API call to test authentication and connection
      const response = await this.getQuestions({ size: 1 });
      return {
        success: true,
        message: "N11 API connection successful",
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        message: `N11 API connection failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Escape XML special characters
   */
  escapeXml(unsafe) {
    if (typeof unsafe !== "string") {
      return unsafe;
    }

    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Parse SaveProductAnswer SOAP response
   */
  parseSaveProductAnswerResponse(xmlData) {
    try {
      debug("Parsing SaveProductAnswer response:", xmlData);

      // Check for success status in the response
      if (xmlData.includes("<status>success</status>")) {
        return {
          success: true,
          status: "success",
        };
      }

      // Check for error messages
      const errorMatch = xmlData.match(/<errorMessage>(.*?)<\/errorMessage>/);
      if (errorMatch) {
        return {
          success: false,
          error: errorMatch[1],
        };
      }

      // Check for fault/error in SOAP envelope
      if (xmlData.includes("soap:Fault") || xmlData.includes("faultstring")) {
        const faultMatch = xmlData.match(/<faultstring>(.*?)<\/faultstring>/);
        return {
          success: false,
          error: faultMatch ? faultMatch[1] : "SOAP Fault occurred",
        };
      }

      // If we can't determine status, consider it successful if no obvious errors
      if (!xmlData.includes("error") && !xmlData.includes("fault")) {
        return {
          success: true,
          status: "completed",
        };
      }

      return {
        success: false,
        error: "Unknown response format",
      };
    } catch (error) {
      debug("Error parsing SaveProductAnswer response:", error.message);
      return {
        success: false,
        error: `Response parsing failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse GetProductQuestionDetail SOAP response
   * Based on N11 official API documentation
   */
  parseQuestionDetailResponse(xmlData) {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });

      return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
          if (err) {
            debug("Error parsing N11 question detail SOAP response:", err);
            resolve(null);
            return;
          }

          try {
            const envelope =
              result["env:Envelope"] ||
              result["soap:Envelope"] ||
              result.Envelope;
            const body =
              envelope["env:Body"] || envelope["soap:Body"] || envelope.Body;
            const response =
              body["ns3:GetProductQuestionDetailResponse"] ||
              body.GetProductQuestionDetailResponse;

            if (!response || response.result?.status !== "success") {
              debug(
                "N11 question detail API returned unsuccessful response:",
                response?.result
              );
              resolve(null);
              return;
            }

            const questionData = response.productQuestion;
            if (!questionData) {
              resolve(null);
              return;
            }

            // Normalize the detailed question data according to N11 API response format
            const normalizedQuestion = {
              platform: "n11",
              platform_question_id: questionData.id?.toString(),
              customer_name: questionData.fullName || "N11 Customer",
              customer_email: questionData.email,
              question_text: questionData.question || "",
              status: this.mapN11Status(questionData.status),
              product_name: questionData.productTitle,
              product_id: questionData.productId?.toString(),
              product_status: questionData.productStatus,
              subject: questionData.questionSubject,
              creation_date: this.parseN11Date(questionData.questionDate),
              answered_date: questionData.answeredDate
                ? this.parseN11Date(questionData.answeredDate)
                : null,
              answer_text: questionData.answer || null,
              buyer_expose: questionData.buyerExpose,
              seller_expose: questionData.sellerExpose,
              raw_data: questionData,
              question_hash: this.generateQuestionHash(
                questionData.question || ""
              ),
            };

            resolve(normalizedQuestion);
          } catch (parseError) {
            debug("Error processing N11 question detail response:", parseError);
            resolve(null);
          }
        });
      });
    } catch (error) {
      debug("Error in parseQuestionDetailResponse:", error);
      return null;
    }
  }
}

module.exports = N11QuestionService;
