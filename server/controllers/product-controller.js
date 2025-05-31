const { Product, sequelize, User } = require("../models");
const logger = require("../utils/logger");
const { Op } = require("sequelize");
const productMergeService = require("../services/product-merge-service");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// Set up multer storage for CSV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/csv");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

// Get products with filtering, sorting, and pagination
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      platform,
      stockStatus,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    console.log("🔍 Product fetch request:", {
      userId: req.user?.id,
      params: {
        page,
        limit,
        search,
        category,
        status,
        platform,
        stockStatus,
        sortBy,
        sortOrder,
      },
    });

    // Build where conditions
    const whereConditions = {
      userId: req.user.id,
    };

    // Apply filters
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { sku: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
        { category: { [Op.iLike]: `%${searchTerm}%` } },
      ];
    }

    if (category && category.trim() !== "") {
      whereConditions.category = category.trim();
    }

    if (status && status.trim() !== "") {
      whereConditions.status = status.trim();
    }

    // Stock status filtering
    if (stockStatus && stockStatus.trim() !== "") {
      switch (stockStatus) {
        case "out_of_stock":
          whereConditions.stockQuantity = { [Op.lte]: 0 };
          break;
        case "low_stock":
          whereConditions[Op.and] = [
            { stockQuantity: { [Op.gt]: 0 } },
            sequelize.where(sequelize.col("stockQuantity"), {
              [Op.lte]: sequelize.col("minStockLevel"),
            }),
          ];
          break;
        case "in_stock":
          whereConditions[Op.and] = [
            { stockQuantity: { [Op.gt]: 0 } },
            sequelize.where(sequelize.col("stockQuantity"), {
              [Op.gt]: sequelize.col("minStockLevel"),
            }),
          ];
          break;
      }
    }

    // Validate sort parameters
    const validSortFields = [
      "name",
      "sku",
      "category",
      "price",
      "stockQuantity",
      "createdAt",
    ];
    const validSortOrders = ["asc", "desc"];

    const orderField = validSortFields.includes(sortBy) ? sortBy : "name";
    const orderDirection = validSortOrders.includes(sortOrder.toLowerCase())
      ? sortOrder.toUpperCase()
      : "ASC";

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    try {
      // Get products with proper error handling
      const { count, rows: products } = await Product.findAndCountAll({
        where: whereConditions,
        order: [[orderField, orderDirection]],
        limit: limitNum,
        offset: offset,
        distinct: true,
      });

      console.log(
        `📊 Query result: ${count} total products, ${products.length} returned`
      );

      // Calculate pagination info
      const totalPages = Math.ceil(count / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      logger.info(
        `Retrieved ${products.length} products for user ${req.user.id}`,
        {
          userId: req.user.id,
          count,
          page: pageNum,
          filters: whereConditions,
        }
      );

      res.json({
        success: true,
        message:
          count > 0
            ? `Retrieved ${products.length} products`
            : "No products found",
        products: products,
        total: count,
        totalPages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNext,
          hasPrev,
        },
      });
    } catch (dbError) {
      console.error("❌ Database error:", dbError);
      logger.error(`Database error retrieving products: ${dbError.message}`, {
        error: dbError,
        userId: req.user.id,
        whereConditions,
      });

      return res.status(500).json({
        success: false,
        message: "Database error occurred while retrieving products",
        error:
          process.env.NODE_ENV === "development"
            ? dbError.message
            : "Internal server error",
      });
    }
  } catch (error) {
    console.error("❌ Product fetch error:", error);
    logger.error(`Get products error: ${error.message}`, {
      error,
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error(`Get product by ID error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      category,
      price,
      costPrice,
      stockQuantity,
      minStockLevel,
      weight,
      dimensions,
      images,
      status = "active",
      platforms,
      attributes,
      tags,
    } = req.body;

    // Validate required fields
    if (!name || !sku || !category || !price || stockQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: name, sku, category, price, stockQuantity",
      });
    }

    // Check if SKU already exists for this user
    const existingProduct = await Product.findOne({
      where: {
        sku: sku.trim(),
        userId: req.user.id,
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    // Create the product
    const product = await Product.create({
      name: name.trim(),
      sku: sku.trim(),
      description: description?.trim(),
      category: category.trim(),
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : null,
      stockQuantity: parseInt(stockQuantity),
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : 0,
      weight: weight ? parseFloat(weight) : null,
      dimensions: dimensions || null,
      images: images || [],
      status: status,
      platforms: platforms || {},
      attributes: attributes || {},
      tags: tags || [],
      userId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Product created: ${product.id}`, {
      productId: product.id,
      sku: product.sku,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    logger.error(`Create product error: ${error.message}`, {
      error,
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Update existing product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the product
    const product = await Product.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // If SKU is being updated, check for duplicates
    if (updateData.sku && updateData.sku !== product.sku) {
      const existingProduct = await Product.findOne({
        where: {
          sku: updateData.sku.trim(),
          userId: req.user.id,
          id: { [Op.ne]: id }, // Exclude current product
        },
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    // Update the product
    await product.update({
      ...updateData,
      updatedAt: new Date(),
    });

    logger.info(`Product updated: ${id}`, {
      productId: id,
      userId: req.user.id,
      updates: Object.keys(updateData),
    });

    res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    logger.error(`Update product error: ${error.message}`, {
      error,
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.destroy();

    logger.info(`Product ${id} deleted`, {
      productId: id,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete product error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

// Bulk delete products
const bulkDelete = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    const result = await Product.destroy({
      where: {
        id: { [Op.in]: productIds },
        userId: req.user.id,
      },
    });

    logger.info(`Bulk deleted ${result} products`, {
      productIds,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result} products`,
      data: { deletedCount: result },
    });
  } catch (error) {
    logger.error(`Bulk delete products error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to bulk delete products",
    });
  }
};

// Bulk update product status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { productIds, status } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    if (!status || !["active", "inactive", "draft"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (active, inactive, draft)",
      });
    }

    const result = await Product.update(
      { status, updatedAt: new Date() },
      {
        where: {
          id: { [Op.in]: productIds },
          userId: req.user.id,
        },
      }
    );

    logger.info(`Bulk updated status for ${result[0]} products`, {
      productIds,
      status,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `Successfully updated status for ${result[0]} products`,
      data: { updatedCount: result[0] },
    });
  } catch (error) {
    logger.error(`Bulk update status error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to bulk update product status",
    });
  }
};

// Get product statistics
const getProductStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic stats
    const stats = await Product.findAll({
      where: { userId },
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("stockQuantity")), "totalStock"],
        [sequelize.fn("AVG", sequelize.col("price")), "avgPrice"],
      ],
      group: ["status"],
      raw: true,
    }).catch(() => []);

    // Get total counts
    const totals = await Product.findOne({
      where: { userId },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalProducts"],
        [sequelize.fn("SUM", sequelize.col("stockQuantity")), "totalStock"],
        [sequelize.fn("AVG", sequelize.col("price")), "avgPrice"],
      ],
      raw: true,
    }).catch(() => ({ totalProducts: 0, totalStock: 0, avgPrice: 0 }));

    // Format stats
    const formattedStats = {
      totalProducts: parseInt(totals.totalProducts) || 0,
      totalStock: parseInt(totals.totalStock) || 0,
      avgPrice: parseFloat(totals.avgPrice) || 0,
      byStatus: {},
      summary: {
        active: 0,
        inactive: 0,
        draft: 0,
      },
    };

    if (Array.isArray(stats)) {
      stats.forEach((stat) => {
        const status = stat.status || "unknown";
        const count = parseInt(stat.count) || 0;

        formattedStats.byStatus[status] = {
          count,
          totalStock: parseInt(stat.totalStock) || 0,
          avgPrice: parseFloat(stat.avgPrice) || 0,
        };

        if (formattedStats.summary.hasOwnProperty(status)) {
          formattedStats.summary[status] = count;
        }
      });
    }

    res.json({
      success: true,
      message: "Product statistics retrieved successfully",
      data: formattedStats,
    });
  } catch (error) {
    logger.error(`Get product stats error: ${error.message}`, {
      error,
      userId: req.user?.id,
    });
    res.json({
      success: true,
      message: "Product statistics retrieved with defaults",
      data: {
        totalProducts: 0,
        totalStock: 0,
        avgPrice: 0,
        byStatus: {},
        summary: {
          active: 0,
          inactive: 0,
          draft: 0,
        },
      },
    });
  }
};

// Fetch, merge and sync products from all platforms
const syncProductsFromPlatforms = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.query;

    // Step 1: Fetch products from all platforms
    const fetchResult = await productMergeService.fetchAllProducts(
      userId,
      options
    );

    if (!fetchResult.success) {
      return res.status(400).json({
        success: false,
        message: fetchResult.message,
        error: fetchResult.error,
      });
    }

    if (fetchResult.data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No products found from any platform",
        data: [],
      });
    }

    // Step 2: Merge products by SKU, barcode and name
    const mergedProducts = await productMergeService.mergeProducts(
      fetchResult.data
    );

    // Step 3: Save merged products to database
    const savedProducts = await productMergeService.saveMergedProducts(
      mergedProducts,
      userId
    );

    return res.json({
      success: true,
      message: `Successfully synchronized ${savedProducts.length} products`,
      data: {
        totalFetched: fetchResult.data.length,
        platformResults: fetchResult.platformResults,
        totalMerged: mergedProducts.length,
        totalSaved: savedProducts.length,
      },
    });
  } catch (error) {
    logger.error("Error syncing products:", error);
    return res.status(500).json({
      success: false,
      message: "Error syncing products from platforms",
      error: error.message,
    });
  }
};

// Import products from CSV file
const importProductsFromCSV = async (req, res) => {
  const csvUpload = upload.single("file");

  csvUpload(req, res, async (err) => {
    if (err) {
      logger.error("CSV upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    try {
      const userId = req.user.id;
      const filePath = req.file.path;
      const results = [];
      const errors = [];

      // Process CSV file line by line
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (data) => results.push(data))
          .on("error", (error) => reject(error))
          .on("end", () => resolve());
      });

      // Process each row
      const products = [];
      for (const row of results) {
        try {
          // Validate required fields
          if (!row.name || !row.sku) {
            errors.push({ row, error: "Name and SKU are required" });
            continue;
          }

          // Check if product already exists
          const existingProduct = await Product.findOne({
            where: {
              userId,
              [Op.or]: [{ sku: row.sku }, { barcode: row.barcode }],
            },
          });

          if (existingProduct) {
            // Update existing product
            await existingProduct.update({
              name: row.name,
              description: row.description,
              price: parseFloat(row.price) || existingProduct.price,
              stockQuantity:
                parseInt(row.stockQuantity) || existingProduct.stockQuantity,
              barcode: row.barcode || existingProduct.barcode,
              category: row.category || existingProduct.category,
              // Process comma-separated image URLs
              images: row.images
                ? row.images.split(",").map((url) => url.trim())
                : existingProduct.images,
              status: row.status || "active",
            });

            products.push(existingProduct);
          } else {
            // Create new product
            const newProduct = await Product.create({
              userId,
              name: row.name,
              sku: row.sku,
              description: row.description || "",
              price: parseFloat(row.price) || 0,
              stockQuantity: parseInt(row.stockQuantity) || 0,
              barcode: row.barcode || null,
              category: row.category || null,
              // Process comma-separated image URLs
              images: row.images
                ? row.images.split(",").map((url) => url.trim())
                : [],
              status: row.status || "active",
            });

            products.push(newProduct);
          }
        } catch (error) {
          logger.error(`Error processing CSV row:`, { row, error });
          errors.push({ row, error: error.message });
        }
      }

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      return res.json({
        success: true,
        message: `Imported ${products.length} products, with ${errors.length} errors`,
        data: {
          imported: products.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      logger.error("Error importing products from CSV:", error);

      // Clean up the uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: "Error importing products from CSV",
        error: error.message,
      });
    }
  });
};

// Get CSV template for product import
const getCSVTemplate = (req, res) => {
  try {
    const templatePath = path.join(
      __dirname,
      "../templates/product_import_template.csv"
    );

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      // Create template if it doesn't exist
      const header =
        "name,sku,barcode,description,price,stockQuantity,category,status,images\n";
      const exampleRow =
        "Example Product,SKU123,123456789,Product description,99.99,100,Electronics,active,https://example.com/image1.jpg,https://example.com/image2.jpg\n";
      fs.writeFileSync(templatePath, header + exampleRow);
    }

    return res.download(templatePath, "product_import_template.csv");
  } catch (error) {
    logger.error("Error providing CSV template:", error);
    return res.status(500).json({
      success: false,
      message: "Error providing CSV template",
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDelete,
  bulkUpdateStatus,
  getProductStats,
  syncProductsFromPlatforms,
  importProductsFromCSV,
  getCSVTemplate,
};
