/**
 * DataMapper utility for mapping data fields to template elements
 * Used by the ShippingSlipDesigner to map order data to template elements
 */

class DataMapper {
  /**
   * Gets a value from a nested object using a path string
   * Example: "order.shipping.address.city" => object.order.shipping.address.city
   *
   * @param {Object} obj - The object to extract data from
   * @param {String} path - The path to the property (dot notation, with array access support)
   * @param {*} defaultValue - Value to return if the path doesn't exist
   * @returns {*} The value at the specified path or defaultValue if not found
   */
  static getValue(obj, path, defaultValue = null) {
    if (!obj || !path) {
      return defaultValue;
    }

    try {
      // Handle array paths like "items[0].product.name"
      const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
      const parts = normalizedPath.split(".");

      let result = obj;
      for (const part of parts) {
        if (part === "") continue;
        if (result === null || result === undefined) {
          return defaultValue;
        }

        result = result[part];
      }

      return result === undefined || result === null ? defaultValue : result;
    } catch (error) {
      console.error(
        `DataMapper error: Failed to extract path "${path}"`,
        error
      );
      return defaultValue;
    }
  }

  /**
   * Maps data from source object to destination object based on mapping definitions
   *
   * @param {Object} sourceData - The source data object
   * @param {Object} mappingDefinitions - Object with keys as destination fields and values as source paths
   * @returns {Object} - New object with mapped values
   */
  static mapData(sourceData, mappingDefinitions) {
    if (!sourceData || !mappingDefinitions) {
      return {};
    }

    const result = {};

    try {
      Object.entries(mappingDefinitions).forEach(([destField, sourcePath]) => {
        result[destField] = this.getValue(sourceData, sourcePath);
      });

      return result;
    } catch (error) {
      console.error("DataMapper error: Failed to map data", error);
      return result;
    }
  }

  /**
   * Applies data to template elements based on their dataMapping properties
   *
   * @param {Array} elements - Template elements array
   * @param {Object} data - Order data object
   * @returns {Array} - Updated elements with mapped data
   */
  static applyDataToTemplate(elements, data) {
    if (!elements || !data) {
      return elements;
    }

    return elements.map((element) => {
      // Skip elements without dataMapping
      if (!element.dataMapping) {
        return element;
      }

      try {
        const mappedData = this.mapData(data, element.dataMapping);

        // For special element types, update content based on mapped data
        switch (element.type) {
          case "text":
          case "header":
          case "footer":
          case "custom_field":
            // Replace placeholders in content with actual data
            let content = element.content || "";
            Object.entries(mappedData).forEach(([key, value]) => {
              const placeholder = `{${key}}`;
              content = content.replace(
                new RegExp(placeholder, "g"),
                value || ""
              );
            });
            return { ...element, content };

          case "barcode":
          case "qr_code":
            // For barcode/QR, just use the first value as content
            const firstValue = Object.values(mappedData)[0];
            if (firstValue) {
              return { ...element, content: String(firstValue) };
            }
            return element;

          default:
            // Store the mapped data in the element for reference
            return {
              ...element,
              resolvedData: mappedData,
            };
        }
      } catch (error) {
        console.error(
          `DataMapper error: Failed to apply data to element ${element.id}`,
          error
        );
        return element;
      }
    });
  }

  /**
   * Resolves data paths for special field types (arrays, etc.)
   *
   * @param {String} path - The data path
   * @param {Object} data - The data object
   * @returns {Array} - Array of values from array paths
   */
  static resolveArrayPath(path, data) {
    if (!path || !data) {
      return [];
    }

    // Check if path contains array notation
    if (path.includes("[]")) {
      const basePath = path.replace(/\[\](\..+)?$/, "");
      const remainingPath = path.match(/\[\](\..+)$/)?.[1] || "";

      const arrayData = this.getValue(data, basePath, []);
      if (!Array.isArray(arrayData)) {
        return [];
      }

      return arrayData.map((item) => {
        return remainingPath
          ? this.getValue(item, remainingPath.substring(1))
          : item;
      });
    }

    return [this.getValue(data, path)];
  }

  /**
   * Maps element data based on element's dataMapping configuration
   * This is used by the ShippingSlipDesigner to resolve dynamic content
   *
   * @param {Object} element - The template element
   * @param {Object} orderData - The order data to map from
   * @returns {String} - The resolved content for the element
   */
  static mapElementData(element, orderData) {
    if (!element || !orderData) {
      return element?.content || "";
    }

    // If element has no dataMapping, return original content
    if (!element.dataMapping) {
      return element.content || "";
    }

    try {
      const mappedData = this.mapData(orderData, element.dataMapping);

      // Handle different element types
      switch (element.type) {
        case "text":
        case "header":
        case "footer":
        case "custom_field":
          // Replace placeholders in content with actual data
          let content = element.content || "";
          Object.entries(mappedData).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            content = content.replace(
              new RegExp(placeholder, "g"),
              value || ""
            );
          });
          return content;

        case "barcode":
        case "qr_code":
          // For barcode/QR, return the first mapped value
          const firstValue = Object.values(mappedData)[0];
          return firstValue ? String(firstValue) : element.content || "";

        case "table":
          // For tables, return the mapped data object
          return mappedData;

        default:
          // For other types, try to return a string representation
          const values = Object.values(mappedData).filter((v) => v != null);
          return values.length > 0 ? values.join(" ") : element.content || "";
      }
    } catch (error) {
      console.error(
        `DataMapper error: Failed to map element data for element ${element.id}`,
        error
      );
      return element.content || "";
    }
  }
}

export default DataMapper;
