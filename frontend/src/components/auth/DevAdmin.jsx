import React, { useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';

const DevAdmin = () => {
  const navigate = useNavigate();
  const { bypassLogin } = useContext(AuthContext);

  const setupDevMode = useCallback(async () => {
    await bypassLogin();
    navigate('/dashboard');
  }, [bypassLogin, navigate]);

  useEffect(() => {
    setupDevMode();
  }, [setupDevMode]);

  return (
    <div className="text-center p-5">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Setting up development mode...</span>
      </Spinner>
      <p className="mt-2">Setting up development mode...</p>
    </div>
  );
};

export default DevAdmin;