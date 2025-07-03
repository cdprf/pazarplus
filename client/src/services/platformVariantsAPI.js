import api from "./api";

/**
 * Platform Variants API Service
 * Handles all platform variant related API calls
 */
class PlatformVariantsAPI {
  /**
   * Get platform field definitions
   */
  static async getPlatformFields(platform, categoryId = null) {
    try {
      const params = categoryId ? `?categoryId=${categoryId}` : "";
      const response = await api.get(
        `/platform-variants/platforms/${platform}/fields${params}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Platform alanları getirilemedi"
        );
      }
    } catch (error) {
      console.error("Get platform fields error:", error);
      throw error;
    }
  }

  /**
   * Get platform categories
   */
  static async getPlatformCategories(platform) {
    try {
      const response = await api.get(
        `/platform-variants/platforms/${platform}/categories`
      );

      if (response.data.success) {
        return response.data.data.categories;
      } else {
        throw new Error(
          response.data.message || "Platform kategorileri getirilemedi"
        );
      }
    } catch (error) {
      console.error("Get platform categories error:", error);
      throw error;
    }
  }

  /**
   * Get product variants
   */
  static async getProductVariants(productId) {
    try {
      const response = await api.get(
        `/platform-variants/products/${productId}/variants`
      );

      if (response.data.success) {
        return response.data.data.variants;
      } else {
        throw new Error(
          response.data.message || "Ürün varyantları getirilemedi"
        );
      }
    } catch (error) {
      console.error("Get product variants error:", error);
      throw error;
    }
  }

  /**
   * Create platform variant
   */
  static async createPlatformVariant(productId, variantData) {
    try {
      const response = await api.post(
        `/platform-variants/products/${productId}/variants`,
        variantData
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        const error = new Error(
          response.data.message || "Varyant oluşturulamadı"
        );
        error.validationErrors = response.data.errors;
        throw error;
      }
    } catch (error) {
      console.error("Create platform variant error:", error);
      throw error;
    }
  }

  /**
   * Update platform variant
   */
  static async updatePlatformVariant(variantId, updateData) {
    try {
      const response = await api.put(
        `/platform-variants/variants/${variantId}`,
        updateData
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        const error = new Error(
          response.data.message || "Varyant güncellenemedi"
        );
        error.validationErrors = response.data.errors;
        throw error;
      }
    } catch (error) {
      console.error("Update platform variant error:", error);
      throw error;
    }
  }

  /**
   * Delete platform variant
   */
  static async deletePlatformVariant(variantId) {
    try {
      const response = await api.delete(
        `/platform-variants/variants/${variantId}`
      );

      if (response.data.success) {
        return true;
      } else {
        throw new Error(response.data.message || "Varyant silinemedi");
      }
    } catch (error) {
      console.error("Delete platform variant error:", error);
      throw error;
    }
  }

  /**
   * Publish variant to platform
   */
  static async publishVariant(variantId) {
    try {
      const response = await api.post(
        `/platform-variants/variants/${variantId}/publish`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Varyant yayınlanamadı");
      }
    } catch (error) {
      console.error("Publish variant error:", error);
      throw error;
    }
  }

  /**
   * Sync variant with platform
   */
  static async syncVariant(variantId) {
    try {
      const response = await api.post(
        `/platform-variants/variants/${variantId}/sync`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Varyant senkronize edilemedi"
        );
      }
    } catch (error) {
      console.error("Sync variant error:", error);
      throw error;
    }
  }

  /**
   * Bulk publish variants
   */
  static async bulkPublishVariants(variantIds) {
    try {
      const response = await api.post(
        "/platform-variants/variants/bulk/publish",
        {
          variantIds,
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Varyantlar toplu olarak yayınlanamadı"
        );
      }
    } catch (error) {
      console.error("Bulk publish variants error:", error);
      throw error;
    }
  }

  /**
   * Bulk sync variants
   */
  static async bulkSyncVariants(variantIds) {
    try {
      const response = await api.post("/platform-variants/variants/bulk/sync", {
        variantIds,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message ||
            "Varyantlar toplu olarak senkronize edilemedi"
        );
      }
    } catch (error) {
      console.error("Bulk sync variants error:", error);
      throw error;
    }
  }

  /**
   * Seed platform categories for testing
   */
  static async seedPlatformCategories(platform = "all") {
    try {
      const response = await api.post(
        `/platform-variants/platforms/${platform}/categories/seed`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Kategoriler oluşturulamadı");
      }
    } catch (error) {
      console.error("Seed platform categories error:", error);
      throw error;
    }
  }
}

export default PlatformVariantsAPI;
