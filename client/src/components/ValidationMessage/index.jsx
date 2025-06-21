/**
 * ValidationMessage - Centralized validation message display
 * Handles different types of validation feedback
 */

import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

const VALIDATION_TYPES = {
  ERROR: "error",
  SUCCESS: "success",
  WARNING: "warning",
  INFO: "info",
};

const VALIDATION_CONFIGS = {
  [VALIDATION_TYPES.ERROR]: {
    icon: AlertCircle,
    className: "text-red-600 bg-red-50 border-red-200",
    iconClassName: "text-red-400",
  },
  [VALIDATION_TYPES.SUCCESS]: {
    icon: CheckCircle,
    className: "text-green-600 bg-green-50 border-green-200",
    iconClassName: "text-green-400",
  },
  [VALIDATION_TYPES.WARNING]: {
    icon: AlertTriangle,
    className: "text-yellow-600 bg-yellow-50 border-yellow-200",
    iconClassName: "text-yellow-400",
  },
  [VALIDATION_TYPES.INFO]: {
    icon: Info,
    className: "text-blue-600 bg-blue-50 border-blue-200",
    iconClassName: "text-blue-400",
  },
};

export const ValidationMessage = ({
  type = VALIDATION_TYPES.ERROR,
  message,
  messages = [],
  title,
  showIcon = true,
  dismissible = false,
  onDismiss,
  className = "",
  compact = false,
}) => {
  const allMessages = message ? [message] : messages;

  if (!allMessages.length) return null;

  const config = VALIDATION_CONFIGS[type];
  const Icon = config.icon;

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center space-x-1 text-sm ${
          config.className.split(" ")[0]
        } ${className}`}
      >
        {showIcon && (
          <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconClassName}`} />
        )}
        <span>{allMessages[0]}</span>
        {allMessages.length > 1 && (
          <span className="text-xs opacity-75">
            (+{allMessages.length - 1} more)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${config.className} ${className}`}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconClassName}`} />
          </div>
        )}
        <div className={showIcon ? "ml-3" : ""}>
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={title ? "mt-2" : ""}>
            {allMessages.length === 1 ? (
              <p className="text-sm">{allMessages[0]}</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {allMessages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleDismiss}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  type === VALIDATION_TYPES.ERROR
                    ? "text-red-500 hover:bg-red-100 focus:ring-red-600"
                    : type === VALIDATION_TYPES.SUCCESS
                    ? "text-green-500 hover:bg-green-100 focus:ring-green-600"
                    : type === VALIDATION_TYPES.WARNING
                    ? "text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600"
                    : "text-blue-500 hover:bg-blue-100 focus:ring-blue-600"
                }`}
              >
                <span className="sr-only">Dismiss</span>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Specific validation message components
export const ErrorMessage = (props) => (
  <ValidationMessage type={VALIDATION_TYPES.ERROR} {...props} />
);

export const SuccessMessage = (props) => (
  <ValidationMessage type={VALIDATION_TYPES.SUCCESS} {...props} />
);

export const WarningMessage = (props) => (
  <ValidationMessage type={VALIDATION_TYPES.WARNING} {...props} />
);

export const InfoMessage = (props) => (
  <ValidationMessage type={VALIDATION_TYPES.INFO} {...props} />
);

// Inline validation message for form fields
export const InlineValidation = ({
  errors,
  touched,
  fieldName,
  showSuccess = false,
  successMessage = "Valid",
  className = "",
}) => {
  const fieldErrors = errors?.[fieldName];
  const isFieldTouched = touched?.[fieldName];

  if (!isFieldTouched) return null;

  if (fieldErrors && Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    return (
      <ValidationMessage
        type={VALIDATION_TYPES.ERROR}
        messages={fieldErrors}
        compact
        className={className}
      />
    );
  }

  if (fieldErrors && typeof fieldErrors === "string") {
    return (
      <ValidationMessage
        type={VALIDATION_TYPES.ERROR}
        message={fieldErrors}
        compact
        className={className}
      />
    );
  }

  if (showSuccess && isFieldTouched) {
    return (
      <ValidationMessage
        type={VALIDATION_TYPES.SUCCESS}
        message={successMessage}
        compact
        className={className}
      />
    );
  }

  return null;
};

// Form validation summary component
export const ValidationSummary = ({
  errors,
  title = "Please fix the following errors:",
  className = "",
}) => {
  const allErrors = [];

  if (errors && typeof errors === "object") {
    Object.entries(errors).forEach(([field, fieldErrors]) => {
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach((error) => {
          allErrors.push(`${field}: ${error}`);
        });
      } else if (typeof fieldErrors === "string") {
        allErrors.push(`${field}: ${fieldErrors}`);
      }
    });
  }

  if (allErrors.length === 0) return null;

  return (
    <ValidationMessage
      type={VALIDATION_TYPES.ERROR}
      title={title}
      messages={allErrors}
      className={className}
    />
  );
};

// Real-time validation message hook
export const useValidationMessage = (initialState = {}) => {
  const [validationState, setValidationState] = React.useState(initialState);

  const showMessage = React.useCallback((type, message, duration = 5000) => {
    const id = Date.now().toString();

    setValidationState((prev) => ({
      ...prev,
      [id]: { type, message, id },
    }));

    if (duration > 0) {
      setTimeout(() => {
        setValidationState((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }, duration);
    }

    return id;
  }, []);

  const hideMessage = React.useCallback((id) => {
    setValidationState((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setValidationState({});
  }, []);

  const showError = React.useCallback(
    (message, duration) =>
      showMessage(VALIDATION_TYPES.ERROR, message, duration),
    [showMessage]
  );

  const showSuccess = React.useCallback(
    (message, duration) =>
      showMessage(VALIDATION_TYPES.SUCCESS, message, duration),
    [showMessage]
  );

  const showWarning = React.useCallback(
    (message, duration) =>
      showMessage(VALIDATION_TYPES.WARNING, message, duration),
    [showMessage]
  );

  const showInfo = React.useCallback(
    (message, duration) =>
      showMessage(VALIDATION_TYPES.INFO, message, duration),
    [showMessage]
  );

  return {
    messages: Object.values(validationState),
    showMessage,
    hideMessage,
    clearAll,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};

// Validation message container for displaying multiple messages
export const ValidationMessageContainer = ({
  messages = [],
  className = "",
}) => {
  if (!messages.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {messages.map((message) => (
        <ValidationMessage
          key={message.id}
          type={message.type}
          message={message.message}
          dismissible
          onDismiss={() => message.onDismiss?.(message.id)}
        />
      ))}
    </div>
  );
};

export { VALIDATION_TYPES };
