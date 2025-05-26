import React from 'react';
import { ProgressBar } from 'react-bootstrap';
import PropTypes from 'prop-types';

const PasswordStrengthMeter = ({ strength, errors }) => {
  const getVariant = (strength) => {
    if (strength >= 80) return 'success';
    if (strength >= 60) return 'info';
    if (strength >= 40) return 'warning';
    if (strength >= 20) return 'danger';
    return 'danger';
  };

  const getLabel = (strength) => {
    if (strength >= 80) return 'Very Strong';
    if (strength >= 60) return 'Strong';
    if (strength >= 40) return 'Moderate';
    if (strength >= 20) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="password-strength-meter">
      <ProgressBar 
        now={strength} 
        variant={getVariant(strength)}
        className="mb-2"
      />
      <div className="d-flex justify-content-between mb-2">
        <small className="text-muted">Strength:</small>
        <small className={`text-${getVariant(strength)}`}>
          {getLabel(strength)}
        </small>
      </div>
      {errors && errors.length > 0 && (
        <ul className="password-requirements text-danger small">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

PasswordStrengthMeter.propTypes = {
  strength: PropTypes.number.isRequired,
  errors: PropTypes.arrayOf(PropTypes.string)
};

PasswordStrengthMeter.defaultProps = {
  errors: []
};

export default PasswordStrengthMeter;