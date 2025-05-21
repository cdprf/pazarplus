import React, { useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * AccessibleModal - A modal component that follows WCAG accessibility guidelines
 * Provides proper keyboard navigation, focus management, and ARIA attributes
 */
const AccessibleModal = ({
  show,
  onHide,
  title,
  children,
  footer,
  size = 'md',
  centered = true,
  scrollable = true,
  closeButton = true,
  closeOnEsc = true,
  staticBackdrop = false,
  dialogClassName = '',
  primaryActionText = 'Save',
  secondaryActionText = 'Cancel',
  onPrimaryAction,
  onSecondaryAction = null,
  isLoading = false,
  loadingText = 'Processing...'
}) => {
  const modalRef = useRef(null);
  const primaryButtonRef = useRef(null);

  // Focus management - focus the modal heading when opened or 
  // the primary button if it's a confirmation dialog
  useEffect(() => {
    if (show) {
      // Small delay to ensure modal is visible before focusing
      const timer = setTimeout(() => {
        if (modalRef.current) {
          if (onPrimaryAction && primaryButtonRef.current) {
            primaryButtonRef.current.focus();
          } else if (modalRef.current.querySelector('h1, h2, h3, h4, h5')) {
            modalRef.current.querySelector('h1, h2, h3, h4, h5').focus();
          }
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [show, onPrimaryAction]);

  // Handle primary action click
  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    }
  };

  // Handle secondary action click
  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else {
      onHide();
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size={size}
      centered={centered}
      scrollable={scrollable}
      backdrop={staticBackdrop ? 'static' : true}
      keyboard={closeOnEsc}
      dialogClassName={dialogClassName}
      aria-labelledby="modal-title"
      role="dialog"
      ref={modalRef}
    >
      <Modal.Header closeButton={closeButton}>
        <Modal.Title id="modal-title" tabIndex="-1">
          {title}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {children}
      </Modal.Body>
      
      {(footer || onPrimaryAction) && (
        <Modal.Footer>
          {footer || (
            <>
              <Button 
                variant="secondary" 
                onClick={handleSecondaryAction}
                disabled={isLoading}
              >
                {secondaryActionText}
              </Button>
              
              <Button 
                variant="primary" 
                onClick={handlePrimaryAction}
                disabled={isLoading}
                ref={primaryButtonRef}
                aria-busy={isLoading}
              >
                {isLoading ? loadingText : primaryActionText}
              </Button>
            </>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

AccessibleModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  centered: PropTypes.bool,
  scrollable: PropTypes.bool,
  closeButton: PropTypes.bool,
  closeOnEsc: PropTypes.bool,
  staticBackdrop: PropTypes.bool,
  dialogClassName: PropTypes.string,
  primaryActionText: PropTypes.string,
  secondaryActionText: PropTypes.string,
  onPrimaryAction: PropTypes.func,
  onSecondaryAction: PropTypes.func,
  isLoading: PropTypes.bool,
  loadingText: PropTypes.string
};

export default AccessibleModal;