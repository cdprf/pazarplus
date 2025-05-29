"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("compliance_documents", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: "order_id",
        references: {
          model: "Orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      documentType: {
        type: Sequelize.ENUM(
          "e-invoice",
          "e-archive",
          "shipping-label",
          "customs-declaration"
        ),
        allowNull: false,
        field: "document_type",
      },
      documentNumber: {
        type: Sequelize.STRING(100),
        unique: true,
        field: "document_number",
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "generated",
          "sent",
          "accepted",
          "rejected"
        ),
        defaultValue: "draft",
        allowNull: false,
      },
      customerType: {
        type: Sequelize.ENUM("INDIVIDUAL", "COMPANY"),
        allowNull: false,
        field: "customer_type",
      },
      customerInfo: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: "customer_info",
      },
      orderData: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: "order_data",
      },
      xmlContent: {
        type: Sequelize.TEXT,
        field: "xml_content",
      },
      pdfPath: {
        type: Sequelize.STRING(255),
        field: "pdf_path",
      },
      gibResponse: {
        type: Sequelize.TEXT,
        field: "gib_response",
      },
      generatedAt: {
        type: Sequelize.DATE,
        field: "generated_at",
      },
      sentAt: {
        type: Sequelize.DATE,
        field: "sent_at",
      },
      processedAt: {
        type: Sequelize.DATE,
        field: "processed_at",
      },
      errorMessage: {
        type: Sequelize.TEXT,
        field: "error_message",
      },
      retryCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: "retry_count",
      },
      metadata: {
        type: Sequelize.TEXT,
        defaultValue: "{}",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: "updated_at",
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("compliance_documents", ["order_id"]);
    await queryInterface.addIndex("compliance_documents", ["document_type"]);
    await queryInterface.addIndex("compliance_documents", ["status"]);
    await queryInterface.addIndex("compliance_documents", ["customer_type"]);
    await queryInterface.addIndex("compliance_documents", ["created_at"]);
    await queryInterface.addIndex("compliance_documents", ["document_number"], {
      unique: true,
      where: {
        document_number: {
          [Sequelize.Op.ne]: null,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("compliance_documents");
  },
};
