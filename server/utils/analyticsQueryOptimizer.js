
const { Op } = require('sequelize');

class AnalyticsQueryOptimizer {
  /**
   * Optimize date range queries
   */
  static optimizeDateRange(dateRange) {
    return {
      [Op.between]: [
        new Date(dateRange.start),
        new Date(dateRange.end)
      ]
    };
  }
  
  /**
   * Add query hints for analytics queries
   */
  static addQueryHints(query) {
    return {
      ...query,
      raw: false, // Use Sequelize objects for better caching
      nest: true, // Nest related objects
      subQuery: false // Disable subqueries for better performance
    };
  }
  
  /**
   * Optimize aggregation queries
   */
  static optimizeAggregation(attributes, groupBy = []) {
    return {
      attributes,
      group: groupBy,
      raw: true, // Use raw queries for aggregations
      logging: process.env.NODE_ENV === 'development'
    };
  }
  
  /**
   * Add pagination for large result sets
   */
  static addPagination(query, page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    return {
      ...query,
      limit,
      offset
    };
  }
  
  /**
   * Optimize order status queries
   */
  static optimizeOrderStatusQuery(userId, dateRange, statuses = []) {
    const whereClause = {
      userId,
      createdAt: this.optimizeDateRange(dateRange)
    };
    
    if (statuses.length > 0) {
      whereClause.orderStatus = { [Op.in]: statuses };
    }
    
    return whereClause;
  }
}

module.exports = AnalyticsQueryOptimizer;
