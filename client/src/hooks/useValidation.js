/**
 * useValidation - Centralized validation hook
 * Provides real-time validation with debouncing and error management
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { OrderValidator } from "../core/OrderValidator";

export const useValidation = (initialErrors = {}, validationRules = {}) => {
  const [errors, setErrors] = useState(initialErrors);
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimeouts = useRef({});
  const validationCache = useRef({});

  // Clear validation cache when rules change
  useEffect(() => {
    validationCache.current = {};
  }, [validationRules]);

  // Validate single field
  const validateField = useCallback(
    async (fieldName, value, allData = {}, options = {}) => {
      const { debounce = 300, skipCache = false, showLoading = true } = options;

      // Clear existing timeout for this field
      if (debounceTimeouts.current[fieldName]) {
        clearTimeout(debounceTimeouts.current[fieldName]);
      }

      // Create cache key
      const cacheKey = `${fieldName}:${JSON.stringify(value)}:${JSON.stringify(
        allData
      )}`;

      // Check cache first
      if (!skipCache && validationCache.current[cacheKey]) {
        const cachedResult = validationCache.current[cacheKey];
        setErrors((prev) => ({
          ...prev,
          [fieldName]: cachedResult,
        }));
        return cachedResult;
      }

      return new Promise((resolve) => {
        debounceTimeouts.current[fieldName] = setTimeout(async () => {
          if (showLoading) {
            setIsValidating(true);
          }

          try {
            let fieldErrors = null;

            // Use custom validation rules if provided
            if (validationRules[fieldName]) {
              const rule = validationRules[fieldName];
              if (typeof rule === "function") {
                fieldErrors = await rule(value, allData);
              } else {
                fieldErrors = OrderValidator.validateField(
                  fieldName,
                  value,
                  allData
                );
              }
            } else {
              // Use default validation
              fieldErrors = OrderValidator.validateField(
                fieldName,
                value,
                allData
              );
            }

            // Cache the result
            validationCache.current[cacheKey] = fieldErrors;

            // Update errors state
            setErrors((prev) => ({
              ...prev,
              [fieldName]: fieldErrors,
            }));

            // Mark field as touched
            setTouched((prev) => ({
              ...prev,
              [fieldName]: true,
            }));

            resolve(fieldErrors);
          } catch (error) {
            console.error("Validation error:", error);
            const errorMessage = ["Validation failed"];

            setErrors((prev) => ({
              ...prev,
              [fieldName]: errorMessage,
            }));

            resolve(errorMessage);
          } finally {
            if (showLoading) {
              setIsValidating(false);
            }
          }
        }, debounce);
      });
    },
    [validationRules]
  );

  // Validate multiple fields
  const validateFields = useCallback(
    async (fieldsData, options = {}) => {
      const { parallel = true, stopOnFirstError = false } = options;

      setIsValidating(true);

      try {
        const validationPromises = Object.entries(fieldsData).map(
          ([fieldName, value]) =>
            validateField(fieldName, value, fieldsData, {
              debounce: 0,
              showLoading: false,
            })
        );

        let results;
        if (parallel) {
          results = await Promise.all(validationPromises);
        } else {
          results = [];
          for (const promise of validationPromises) {
            const result = await promise;
            results.push(result);

            if (stopOnFirstError && result && result.length > 0) {
              break;
            }
          }
        }

        // Combine results
        const fieldNames = Object.keys(fieldsData);
        const combinedErrors = {};
        let hasErrors = false;

        fieldNames.forEach((fieldName, index) => {
          if (results[index] && results[index].length > 0) {
            combinedErrors[fieldName] = results[index];
            hasErrors = true;
          }
        });

        return hasErrors ? combinedErrors : null;
      } finally {
        setIsValidating(false);
      }
    },
    [validateField]
  );

  // Validate entire form/object
  const validateAll = useCallback(
    async (data, options = {}) => {
      const { useCustomRules = true, skipUntouched = false } = options;

      setIsValidating(true);

      try {
        let allErrors = {};

        // Use custom validation rules if available
        if (useCustomRules && Object.keys(validationRules).length > 0) {
          const fieldsToValidate = skipUntouched
            ? Object.keys(touched).filter((field) => touched[field])
            : Object.keys(data);

          const customErrors = await validateFields(
            Object.fromEntries(
              fieldsToValidate.map((field) => [field, data[field]])
            ),
            options
          );

          if (customErrors) {
            allErrors = { ...allErrors, ...customErrors };
          }
        } else {
          // Use default validation
          const defaultErrors = OrderValidator.validateOrder(data);
          if (defaultErrors) {
            allErrors = { ...allErrors, ...defaultErrors };
          }
        }

        setErrors(allErrors);
        return Object.keys(allErrors).length > 0 ? allErrors : null;
      } finally {
        setIsValidating(false);
      }
    },
    [validationRules, touched, validateFields]
  );

  // Clear errors for specific fields
  const clearErrors = useCallback((fieldNames = []) => {
    if (fieldNames.length === 0) {
      setErrors({});
      setTouched({});
      validationCache.current = {};
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        fieldNames.forEach((field) => {
          delete newErrors[field];
        });
        return newErrors;
      });

      setTouched((prev) => {
        const newTouched = { ...prev };
        fieldNames.forEach((field) => {
          delete newTouched[field];
        });
        return newTouched;
      });

      // Clear cache for these fields
      Object.keys(validationCache.current).forEach((key) => {
        if (fieldNames.some((field) => key.startsWith(`${field}:`))) {
          delete validationCache.current[key];
        }
      });
    }
  }, []);

  // Mark fields as touched
  const touchFields = useCallback((fieldNames) => {
    setTouched((prev) => {
      const newTouched = { ...prev };
      fieldNames.forEach((field) => {
        newTouched[field] = true;
      });
      return newTouched;
    });
  }, []);

  // Get field error
  const getFieldError = useCallback(
    (fieldName) => {
      return errors[fieldName];
    },
    [errors]
  );

  // Check if field has error
  const hasFieldError = useCallback(
    (fieldName) => {
      const fieldError = errors[fieldName];
      return (
        fieldError &&
        ((Array.isArray(fieldError) && fieldError.length > 0) ||
          (typeof fieldError === "string" && fieldError.length > 0))
      );
    },
    [errors]
  );

  // Check if field is touched
  const isFieldTouched = useCallback(
    (fieldName) => {
      return Boolean(touched[fieldName]);
    },
    [touched]
  );

  // Get first error for a field
  const getFirstFieldError = useCallback(
    (fieldName) => {
      const fieldError = errors[fieldName];
      if (Array.isArray(fieldError) && fieldError.length > 0) {
        return fieldError[0];
      }
      if (typeof fieldError === "string") {
        return fieldError;
      }
      return null;
    },
    [errors]
  );

  // Check if entire form is valid
  const isValid = React.useMemo(() => {
    return (
      Object.keys(errors).length === 0 ||
      Object.values(errors).every(
        (error) => !error || (Array.isArray(error) && error.length === 0)
      )
    );
  }, [errors]);

  // Check if form has any touched fields
  const hasAnyTouched = React.useMemo(() => {
    return Object.values(touched).some((isTouched) => isTouched);
  }, [touched]);

  // Get summary of errors
  const getErrorSummary = useCallback(() => {
    const summary = [];

    Object.entries(errors).forEach(([field, fieldErrors]) => {
      if (fieldErrors) {
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach((error) => {
            summary.push({ field, error });
          });
        } else if (typeof fieldErrors === "string") {
          summary.push({ field, error: fieldErrors });
        }
      }
    });

    return summary;
  }, [errors]);

  // Create field props for form inputs
  const getFieldProps = useCallback(
    (fieldName, options = {}) => {
      const {
        validateOnChange = true,
        validateOnBlur = true,
        clearOnFocus = false,
      } = options;

      return {
        error: getFieldError(fieldName),
        touched: isFieldTouched(fieldName),
        onChange: validateOnChange
          ? (e) => {
              const value = e.target ? e.target.value : e;
              validateField(fieldName, value);
            }
          : undefined,
        onBlur: validateOnBlur
          ? (e) => {
              const value = e.target ? e.target.value : e;
              validateField(fieldName, value, {}, { debounce: 0 });
              touchFields([fieldName]);
            }
          : () => touchFields([fieldName]),
        onFocus: clearOnFocus ? () => clearErrors([fieldName]) : undefined,
      };
    },
    [validateField, touchFields, clearErrors, getFieldError, isFieldTouched]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = debounceTimeouts.current;
    return () => {
      Object.values(timeouts).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
    };
  }, []);

  return {
    // State
    errors,
    touched,
    isValidating,
    isValid,
    hasAnyTouched,

    // Actions
    validateField,
    validateFields,
    validateAll,
    clearErrors,
    touchFields,

    // Getters
    getFieldError,
    hasFieldError,
    isFieldTouched,
    getFirstFieldError,
    getErrorSummary,
    getFieldProps,

    // Utilities
    setErrors,
    setTouched,
  };
};

// Hook for form validation with automatic field registration
export const useFormValidation = (
  initialValues = {},
  validationSchema = {}
) => {
  const [values, setFormValues] = useState(initialValues);
  const validation = useValidation({}, validationSchema);

  // Update field value and validate
  const setValue = useCallback(
    (fieldName, value) => {
      setFormValues((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      // Validate field with all form data
      validation.validateField(fieldName, value, {
        ...values,
        [fieldName]: value,
      });
    },
    [values, validation]
  );

  // Update multiple values
  const setMultipleValues = useCallback((newValues) => {
    setFormValues((prev) => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // Get field props with value binding
  const getFieldProps = useCallback(
    (fieldName, options = {}) => {
      const validationProps = validation.getFieldProps(fieldName, options);

      return {
        ...validationProps,
        value: values[fieldName] || "",
        onChange: (e) => {
          const value = e.target ? e.target.value : e;
          setValue(fieldName, value);
          validationProps.onChange?.(e);
        },
      };
    },
    [values, setValue, validation]
  );

  // Submit handler with validation
  const handleSubmit = useCallback(
    async (onSubmit) => {
      const errors = await validation.validateAll(values);

      if (!errors) {
        return onSubmit(values);
      }

      // Mark all fields as touched to show errors
      validation.touchFields(Object.keys(values));

      return { success: false, errors };
    },
    [values, validation]
  );

  // Reset form
  const reset = useCallback(
    (newValues = initialValues) => {
      setFormValues(newValues);
      validation.clearErrors();
    },
    [initialValues, validation]
  );

  return {
    // Form state
    values,
    setValue,
    setValues: setMultipleValues,
    reset,

    // Validation
    ...validation,

    // Form helpers
    getFieldProps,
    handleSubmit,
  };
};
