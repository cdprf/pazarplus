// genericPlatformService.js
// Service for handling platform data using the generic models
const { PlatformData, PlatformAttribute, PlatformSchema } = require('../models');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, useDefaults: true });

async function getActiveSchema(platformType, entityType) {
  return PlatformSchema.findOne({
    where: { platformType, entityType, isActive: true },
    order: [['createdAt', 'DESC']],
  });
}

function mapFields(data, mappings) {
  if (!mappings) return data;
  const mapped = {};
  for (const [internalKey, platformKey] of Object.entries(mappings)) {
    mapped[internalKey] = data[platformKey];
  }
  return mapped;
}

const GenericPlatformService = {
  // Example: Fetch platform data by entity
  async getPlatformData(entityId, entityType, platformType) {
    return PlatformData.findOne({
      where: { entityId, entityType, platformType },
    });
  },

  // Example: Create or update platform data
  async upsertPlatformData({ entityId, entityType, platformType, data }) {
    // Fetch schema and mappings
    const schemaRecord = await getActiveSchema(platformType, entityType);
    if (!schemaRecord) throw new Error('No active schema found for this platform/entity');
    const schema = schemaRecord.schema;
    const mappings = schemaRecord.mappings;

    // Validate data
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      const error = new Error('Schema validation failed');
      error.details = validate.errors;
      throw error;
    }

    // Map fields if mappings exist
    const mappedData = mapFields(data, mappings);

    // Upsert mapped data
    return PlatformData.upsert({
      entityId,
      entityType,
      platformType,
      data: mappedData,
    });
  },

  // List all platform data for an entity type and platform
  async listPlatformData({ entityType, platformType, limit = 50, offset = 0 }) {
    return PlatformData.findAll({
      where: { entityType, platformType },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  },

  // Delete platform data by ID
  async deletePlatformData(id) {
    return PlatformData.destroy({ where: { id } });
  },

  // Update platform data by ID
  async updatePlatformData(id, updates) {
    return PlatformData.update(updates, { where: { id } });
  },

  // Example: Get attributes for an entity
  async getAttributes(entityId, entityType, platformType) {
    return PlatformAttribute.findAll({
      where: { entityId, entityType, platformType },
    });
  },

  // List/search PlatformAttribute records
  async listAttributes({ entityId, entityType, platformType, key, value, limit = 50, offset = 0 }) {
    const where = { entityType, platformType };
    if (entityId) where.entityId = entityId;
    if (key) where.attributeKey = key;
    if (value) where.stringValue = value;
    return PlatformAttribute.findAll({ where, limit, offset });
  },

  // Delete PlatformAttribute records by ID
  async deleteAttribute(id) {
    return PlatformAttribute.destroy({ where: { id } });
  },

  // Upsert attributes in bulk for an entity
  async upsertAttributes(entityId, entityType, platformType, attributes) {
    // attributes: [{ key, value, valueType }]
    const ops = attributes.map(attr => PlatformAttribute.upsert({
      entityId,
      entityType,
      platformType,
      attributeKey: attr.key,
      stringValue: attr.valueType === 'string' ? attr.value : null,
      numericValue: attr.valueType === 'number' ? attr.value : null,
      booleanValue: attr.valueType === 'boolean' ? attr.value : null,
      dateValue: attr.valueType === 'date' ? attr.value : null,
      valueType: attr.valueType
    }));
    return Promise.all(ops);
  },

  // TODO: Add schema validation, field mapping, and more CRUD methods as needed
};

module.exports = GenericPlatformService;
