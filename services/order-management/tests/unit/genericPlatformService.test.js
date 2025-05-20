const GenericPlatformService = require('../../src/services/genericPlatformService');
const { PlatformData, PlatformAttribute, PlatformSchema } = require('../../src/models');
const { sequelize } = require('../../src/models');

describe('GenericPlatformService', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    // Insert a sample schema for validation
    await PlatformSchema.create({
      platformType: 'testplatform',
      entityType: 'product',
      schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      mappings: { name: 'name' },
      isActive: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should upsert platform data with valid schema', async () => {
    const result = await GenericPlatformService.upsertPlatformData({
      entityId: '1111-2222',
      entityType: 'product',
      platformType: 'testplatform',
      data: { name: 'Test Product' }
    });
    expect(result).toBeTruthy();
  });

  it('should fail schema validation for invalid data', async () => {
    await expect(GenericPlatformService.upsertPlatformData({
      entityId: '1111-3333',
      entityType: 'product',
      platformType: 'testplatform',
      data: { notname: 'NoName' }
    })).rejects.toThrow('Schema validation failed');
  });

  it('should list platform data', async () => {
    const list = await GenericPlatformService.listPlatformData({ entityType: 'product', platformType: 'testplatform' });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('should update platform data', async () => {
    const [item] = await GenericPlatformService.listPlatformData({ entityType: 'product', platformType: 'testplatform' });
    await GenericPlatformService.updatePlatformData(item.id, { data: { name: 'Updated Product' } });
    const updated = await PlatformData.findByPk(item.id);
    expect(updated.data.name).toBe('Updated Product');
  });

  it('should delete platform data', async () => {
    const [item] = await GenericPlatformService.listPlatformData({ entityType: 'product', platformType: 'testplatform' });
    await GenericPlatformService.deletePlatformData(item.id);
    const deleted = await PlatformData.findByPk(item.id);
    expect(deleted).toBeNull();
  });

  it('should upsert and list attributes', async () => {
    await GenericPlatformService.upsertAttributes('attr-entity', 'product', 'testplatform', [
      { key: 'color', value: 'red', valueType: 'string' },
      { key: 'size', value: 42, valueType: 'number' }
    ]);
    const attrs = await GenericPlatformService.listAttributes({ entityId: 'attr-entity', entityType: 'product', platformType: 'testplatform' });
    expect(attrs.length).toBe(2);
    expect(attrs[0].attributeKey).toBeDefined();
  });

  it('should delete attribute', async () => {
    const [attr] = await GenericPlatformService.listAttributes({ entityId: 'attr-entity', entityType: 'product', platformType: 'testplatform' });
    await GenericPlatformService.deleteAttribute(attr.id);
    const deleted = await PlatformAttribute.findByPk(attr.id);
    expect(deleted).toBeNull();
  });
});
