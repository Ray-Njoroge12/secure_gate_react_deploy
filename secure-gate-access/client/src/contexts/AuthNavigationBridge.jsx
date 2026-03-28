import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { clearAuthNavigator, setAuthNavigator } from '../utils/authNavigation';

const AuthNavigationBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setAuthNavigator(navigate);
    return () => clearAuthNavigator();
  }, [navigate]);

  return null;
};

export default AuthNavigationBridge;
