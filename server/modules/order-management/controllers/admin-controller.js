const { User, Order, OrderItem, PlatformConnection } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

/**
 * Get admin dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.count();
    const totalOrders = await Order.count();
    const totalPlatforms = await PlatformConnection.count();
    
    // Get recent orders
    const recentOrders = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, attributes: ['username', 'email'] },
        { model: OrderItem }
      ]
    });

    // Get order stats by status
    const ordersByStatus = await Order.findAll({
      attributes: [
        'orderStatus',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['orderStatus']
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalOrders,
          totalPlatforms
        },
        recentOrders,
        ordersByStatus
      }
    });
  } catch (error) {
    logger.error('Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
};

/**
 * Get all users with pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = search ? {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { fullName: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

/**
 * Get system logs
 */
const getSystemLogs = async (req, res) => {
  try {
    const { level = 'info', limit = 50 } = req.query;
    
    // This would typically read from log files or a logging service
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'System logs endpoint accessed',
            service: 'admin-controller'
          }
        ]
      }
    });
  } catch (error) {
    logger.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system logs'
    });
  }
};

/**
 * Get platform connections overview
 */
const getPlatformConnections = async (req, res) => {
  try {
    const connections = await PlatformConnection.findAll({
      include: [
        { 
          model: User, 
          attributes: ['username', 'email'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { connections }
    });
  } catch (error) {
    logger.error('Get platform connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform connections'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getSystemLogs,
  getPlatformConnections
};
