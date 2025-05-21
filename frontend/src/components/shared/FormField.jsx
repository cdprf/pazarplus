import React from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * FormField - A standardized form field component that follows WCAG accessibility guidelines
 * Provides consistent layout, error handling, and accessibility attributes
 */
const FormField = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helpText,
  prepend,
  append,
  inputClassName = '',
  labelClassName = '',
  groupClassName = '',
  as = 'input',
  rows = 3,
  options = [],
  inputProps = {},
  name = '',
  min,
  max,
  step,
  pattern
}) => {
  // Generate a unique ID if not provided
  const fieldId = id || `field-${label?.replace(/\s+/g, '-').toLowerCase() || Math.random().toString(36).substring(2, 9)}`;
  
  // Create error message ID for aria-describedby
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  
  // Determine if we're rendering a select dropdown
  const isSelect = type === 'select' || as === 'select';
  
  // Determine if we're rendering a textarea
  const isTextarea = type === 'textarea' || as === 'textarea';
  
  // Determine if we're rendering a checkbox or radio
  const isCheckboxOrRadio = type === 'checkbox' || type === 'radio';
  
  // Base props for the form control
  const controlProps = {
    id: fieldId,
    name: name || fieldId,
    value: value,
    onChange: onChange,
    disabled,
    readOnly,
    className: inputClassName,
    placeholder,
    isInvalid: !!error,
    required,
    ...(isTextarea && { as: 'textarea', rows }),
    ...(type !== 'select' && { type }),
    'aria-describedby': [
      error ? errorId : null, 
      helpText ? helpId : null
    ].filter(Boolean).join(' ') || undefined,
    ...inputProps
  };
  
  // Add min, max, step attributes for number inputs
  if (type === 'number') {
    if (min !== undefined) controlProps.min = min;
    if (max !== undefined) controlProps.max = max;
    if (step !== undefined) controlProps.step = step;
  }
  
  // Add pattern for text inputs that need validation
  if (pattern && (type === 'text' || type === 'tel' || type === 'email' || type === 'url')) {
    controlProps.pattern = pattern;
  }
  
  // Render the appropriate form control
  const renderFormControl = () => {
    if (isSelect) {
      return (
        <Form.Select {...controlProps}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      );
    } else if (isCheckboxOrRadio) {
      return (
        <Form.Check
          id={fieldId}
          type={type}
          label={label}
          checked={value}
          onChange={onChange}
          isInvalid={!!error}
          disabled={disabled}
          className={labelClassName}
          required={required}
          aria-describedby={error ? errorId : helpText ? helpId : undefined}
          {...inputProps}
        />
      );
    } else if (prepend || append) {
      return (
        <InputGroup>
          {prepend && <InputGroup.Text>{prepend}</InputGroup.Text>}
          <Form.Control {...controlProps} />
          {append && <InputGroup.Text>{append}</InputGroup.Text>}
        </InputGroup>
      );
    } else {
      return <Form.Control {...controlProps} />;
    }
  };
  
  return (
    <Form.Group className={`mb-3 ${groupClassName}`}>
      {!isCheckboxOrRadio && (
        <Form.Label 
          htmlFor={fieldId}
          className={labelClassName}
        >
          {label}
          {required && <span className="text-danger ms-1" aria-hidden="true">*</span>}
        </Form.Label>
      )}
      
      {renderFormControl()}
      
      {helpText && (
        <Form.Text id={helpId} muted>
          {helpText}
        </Form.Text>
      )}
      
      {error && (
        <Form.Control.Feedback 
          type="invalid"
          id={errorId}
        >
          {error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

FormField.propTypes = {
  id: PropTypes.string,
  label: PropTypes.node.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
    PropTypes.array
  ]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.node,
  prepend: PropTypes.node,
  append: PropTypes.node,
  inputClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  groupClassName: PropTypes.string,
  as: PropTypes.string,
  rows: PropTypes.number,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired
    })
  ),
  inputProps: PropTypes.object,
  name: PropTypes.string,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  step: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  pattern: PropTypes.string
};

export default FormField;