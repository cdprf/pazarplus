import React from "react";
import { Modal, Button, Alert } from "react-bootstrap";
import "./ProductCreationModalSimple.css";

/**
 * Simple Debug Modal to test modal display
 */
const ProductCreationModal = ({ show, onHide, onSuccess }) => {
  console.log("ProductCreationModal rendering with show =", show);

  return (
    <div>
      {/* Custom Modal Implementation */}
      {show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={onHide}
        >
          <div
            className="modal-custom"
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              position: "relative",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h2>Create Product - Working!</h2>
              <button
                onClick={onHide}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <Alert variant="success">
              <h4>🎉 Modal is Working!</h4>
              <p>
                This proves the modal can display correctly. The issue was
                likely with Bootstrap Modal conflicts or CSS issues.
              </p>
              <p>
                <strong>Show prop:</strong> {show ? "true" : "false"}
              </p>
            </Alert>

            <div style={{ marginBottom: "1rem" }}>
              <h5>Available Features</h5>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert("Manual Entry clicked!");
                  }}
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                >
                  Manual Entry
                </button>
                <button
                  className="btn btn-success"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert("CSV/JSON Import clicked!");
                  }}
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                >
                  CSV/JSON Import
                </button>
                <button
                  className="btn btn-info"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert("Platform Copy clicked!");
                  }}
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                >
                  Platform Copy
                </button>
              </div>
              <p className="text-muted">
                All three product creation methods are available.
              </p>
            </div>

            <div
              style={{
                borderTop: "1px solid #ddd",
                paddingTop: "1rem",
                textAlign: "right",
              }}
            >
              <button
                className="btn btn-secondary me-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onHide();
                }}
                style={{
                  marginRight: "0.5rem",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  alert(
                    "Modal is working! You can now implement the full features."
                  );
                  onHide();
                }}
                style={{ cursor: "pointer", pointerEvents: "auto" }}
              >
                Continue to Full Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bootstrap Modal as secondary option */}
      <Modal
        show={false} // Disabled for now to test custom modal
        onHide={onHide}
        size="lg"
        backdrop="static"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Bootstrap Modal (Alternative)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            Bootstrap Modal version - currently disabled for testing
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProductCreationModal;
