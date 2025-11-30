/**
 * Frontend-Backend Integration Validation
 * Ensures data compatibility between frontend and backend
 */

export const validateRegistrationData = (userData) => {
  const errors = {};
  
  // Required fields
  if (!userData.name && !userData.username) {
    errors.name = 'Name/Username is required';
  }
  
  if (!userData.email) {
    errors.email = 'Email is required';
  }
  
  if (!userData.password) {
    errors.password = 'Password is required';
  }
  
  if (!userData.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required';
  }
  
  if (userData.password && userData.confirmPassword && userData.password !== userData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  if (userData.consent === undefined || userData.consent === false) {
    errors.consent = 'You must consent to data processing';
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (userData.email && !emailRegex.test(userData.email)) {
    errors.email = 'Invalid email format';
  }
  
  // Password strength validation
  if (userData.password && userData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }
  
  // Username alphanumeric validation (to match backend)
  if (userData.username && !/^[a-zA-Z0-9]+$/.test(userData.username)) {
    errors.username = 'Username must contain only letters and numbers';
  }
  
  if (userData.name && !/^[a-zA-Z0-9]+$/.test(userData.name)) {
    errors.name = 'Name must contain only letters and numbers';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const transformRegistrationData = (userData) => {
  return {
    email: userData.email,
    username: userData.name || userData.username,
    password: userData.password,
    confirmPassword: userData.confirmPassword || userData.password,
    role: userData.role || 'resident',
    phone: userData.phoneNumber || userData.phone,
    house: userData.residenceNumber || userData.house || userData.houseNumber,
    area: userData.area || userData.residentialArea || 'General',
    consent: userData.consent !== undefined ? userData.consent : true
  };
};

export const validateLoginData = (loginData) => {
  const errors = {};
  
  if (!loginData.username && !loginData.email) {
    errors.username = 'Username or email is required';
  }
  
  if (!loginData.password) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
