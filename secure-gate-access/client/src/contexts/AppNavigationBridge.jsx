import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { clearAppNavigator, setAppNavigator } from '../utils/appNavigation';

const AppNavigationBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setAppNavigator(navigate);
    return () => clearAppNavigator();
  }, [navigate]);

  return null;
};

export default AppNavigationBridge;
