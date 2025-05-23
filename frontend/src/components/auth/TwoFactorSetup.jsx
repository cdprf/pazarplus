import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';

const TwoFactorSetup = () => {
  const { user, setupTwoFactor, verifyTwoFactor, disableTwoFactor } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const initSetup = async () => {
      if (!user?.twoFactorEnabled) {
        try {
          setLoading(true);
          const response = await setupTwoFactor();
          setSecret(response.secret);
        } catch (err) {
          setError('Failed to initialize 2FA setup. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    initSetup();
  }, [user, setupTwoFactor]);

  const handleVerification = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await verifyTwoFactor(verificationCode, secret);
      setSuccess('Two-factor authentication has been enabled successfully!');
      setTimeout(() => navigate('/settings'), 2000);
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      await disableTwoFactor();
      setSuccess('Two-factor authentication has been disabled.');
      setTimeout(() => navigate('/settings'), 2000);
    } catch (err) {
      setError('Failed to disable 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Card className="mx-auto" style={{ maxWidth: '600px' }}>
        <Card.Header>
          <h4 className="mb-0">Two-Factor Authentication (2FA)</h4>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {user?.twoFactorEnabled ? (
            <div>
              <Alert variant="info">
                Two-factor authentication is currently enabled for your account.
              </Alert>
              <p>
                If you want to disable 2FA, please click the button below. Note that this will make your account less secure.
              </p>
              <Button 
                variant="danger" 
                onClick={handleDisable}
                disabled={loading}
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4">
                Two-factor authentication adds an extra layer of security to your account. 
                When enabled, you'll need to provide both your password and a code from your 
                authentication app when signing in.
              </p>

              <div className="mb-4">
                <h5>1. Scan QR Code</h5>
                <p>
                  Scan this QR code with your authenticator app (such as Google Authenticator, 
                  Authy, or Microsoft Authenticator).
                </p>
                <QRCodeDisplay secret={secret} email={user?.email} />
              </div>

              <div className="mb-4">
                <h5>2. Enter Verification Code</h5>
                <p>
                  Enter the 6-digit code from your authenticator app to verify and enable 2FA.
                </p>
                <Form onSubmit={handleVerification}>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                    />
                  </Form.Group>
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify and Enable 2FA'}
                  </Button>
                </Form>
              </div>

              <Alert variant="warning">
                <strong>Important:</strong> Please save your backup codes in a secure place. 
                You'll need these if you lose access to your authenticator app.
              </Alert>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

const QRCodeDisplay = ({ secret, email }) => {
  const otpAuthUrl = `otpauth://totp/Pazar:${email}?secret=${secret}&issuer=Pazar`;
  
  return (
    <div className="text-center mb-4">
      <QRCodeSVG 
        value={otpAuthUrl}
        size={256}
        level="H"
        includeMargin={true}
      />
    </div>
  );
};

export default TwoFactorSetup;