// This file defines the Category model for product categorization
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Categories',
        key: 'id'
      }
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Full category path (e.g. Electronics/Phones/Smartphones)'
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Category depth level in hierarchy'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional category metadata'
    }
  }, {
    tableName: 'Categories',
    timestamps: true,
    paranoid: true, // Enables soft deletes
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['parentId']
      },
      {
        fields: ['path']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  Category.associate = (models) => {
    // Self-referential relationship for hierarchy
    Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
    Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
    
    // User relationship
    Category.belongsTo(models.User, { foreignKey: 'userId' });
    
    // Products relationship
    Category.hasMany(models.Product, { foreignKey: 'categoryId' });
  };

  return Category;
};