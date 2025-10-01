import express from 'express';
import { authenticateToken, attachUserFromToken } from '../middleware/authMiddleware.js';
import { tokenService } from '../services/tokenService.js';
import { userService } from '../services/userService.js';
import attachRequestAudit from '../middleware/auditLogger.js';

const router = express.Router();

// User registration
router.post('/register', attachRequestAudit, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: 'Missing required fields',
          type: 'Validation Error',
          requestId: req.requestId
        }
      });
    }

    // Create user
    const user = await userService.createUser({
      username,
      email,
      password,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: 'Registration failed',
        type: 'Internal Server Error',
        requestId: req.requestId
      }
    });
  }
});

// User login
router.post('/login', attachRequestAudit, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: 'Username and password required',
          type: 'Validation Error',
          requestId: req.requestId
        }
      });
    }

    // Authenticate user
    const user = await userService.authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 401,
          message: 'Invalid credentials',
          type: 'Authentication Error',
          requestId: req.requestId
        }
      });
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: 'Login failed',
        type: 'Internal Server Error',
        requestId: req.requestId
      }
    });
  }
});

// Token refresh
router.post('/refresh', attachRequestAudit, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: 'Refresh token required',
          type: 'Validation Error',
          requestId: req.requestId
        }
      });
    }

    // Verify refresh token
    const decoded = tokenService.verifyRefreshToken(refreshToken);
    const user = await userService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 401,
          message: 'Invalid refresh token',
          type: 'Authentication Error',
          requestId: req.requestId
        }
      });
    }

    // Generate new access token
    const newAccessToken = tokenService.generateAccessToken(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 401,
        message: 'Invalid refresh token',
        type: 'Authentication Error',
        requestId: req.requestId
      }
    });
  }
});

// User logout
router.post('/logout', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    // In a real implementation, you would invalidate the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: 'Logout failed',
        type: 'Internal Server Error',
        requestId: req.requestId
      }
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, attachRequestAudit, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: 'Failed to get profile',
        type: 'Internal Server Error',
        requestId: req.requestId
      }
    });
  }
});

export default router;
