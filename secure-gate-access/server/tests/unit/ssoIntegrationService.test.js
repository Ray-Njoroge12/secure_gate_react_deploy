/**
 * Unit Tests for SSO Integration Service
 * Tests SSO protocol implementations with user provisioning and attribute mapping
 */

import { jest } from '@jest/globals';
import crypto from 'crypto';
import { ssoIntegrationService } from '../../src/services/ssoIntegrationService.js';

// Mock dependencies
const mockSamlStrategy = {
  authenticate: jest.fn(),
  generateMetadata: jest.fn(),
  validateResponse: jest.fn()
};

const mockOAuthStrategy = {
  getAuthorizationUrl: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  getUserInfo: jest.fn(),
  refreshToken: jest.fn()
};

const mockOidcStrategy = {
  discover: jest.fn(),
  authenticate: jest.fn(),
  validateIdToken: jest.fn(),
  getUserInfo: jest.fn()
};

const mockDb = {
  query: jest.fn(),
  transaction: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockUserService = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserById: jest.fn()
};

jest.mock('passport-saml', () => ({
  Strategy: jest.fn().mockImplementation(() => mockSamlStrategy)
}));

jest.mock('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDb
}));

jest.mock('../../src/services/loggingService.js', () => ({
  loggingService: mockLogger
}));

jest.mock('../../src/services/userService.js', () => ({
  userService: mockUserService
}));

describe('SSO Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SAML Integration', () => {
    test('should configure SAML provider successfully', async () => {
      const samlConfig = {
        name: 'Corporate SAML',
        entryPoint: 'https://idp.company.com/saml/sso',
        issuer: 'secure-gate-app',
        cert: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
        attributeMapping: {
          email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
          firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
          lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
          role: 'http://schemas.company.com/ws/2005/05/identity/claims/role'
        },
        autoProvision: true,
        defaultRole: 'resident'
      };

      mockDb.query.mockResolvedValue({
        rows: [{ id: 1, ...samlConfig, created_at: new Date().toISOString() }],
        rowCount: 1
      });

      const result = await ssoIntegrationService.configureSamlProvider(1, samlConfig);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sso_providers'),
        expect.arrayContaining([
          1, // estateId
          'saml',
          samlConfig.name,
          JSON.stringify(samlConfig),
          true // active
        ])
      );

      expect(result).toMatchObject({
        id: 1,
        name: samlConfig.name,
        type: 'saml',
        entryPoint: samlConfig.entryPoint
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'SAML provider configured successfully',
        expect.objectContaining({
          providerId: 1,
          name: samlConfig.name,
          estateId: 1
        })
      );
    });

    test('should handle SAML authentication response', async () => {
      const samlResponse = {
        nameID: 'user@company.com',
        attributes: {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'user@company.com',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'John',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Doe',
          'http://schemas.company.com/ws/2005/05/identity/claims/role': 'admin'
        }
      };

      const providerConfig = {
        id: 1,
        attributeMapping: {
          email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
          firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
          lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
          role: 'http://schemas.company.com/ws/2005/05/identity/claims/role'
        },
        autoProvision: true,
        defaultRole: 'resident'
      };

      mockSamlStrategy.validateResponse.mockResolvedValue(samlResponse);
      mockUserService.getUserByEmail.mockResolvedValue(null); // User doesn't exist
      mockUserService.createUser.mockResolvedValue({
        id: 1,
        email: 'user@company.com',
        username: 'user@company.com',
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe'
      });

      const result = await ssoIntegrationService.handleSamlResponse(
        'saml_response_token',
        providerConfig,
        1 // estateId
      );

      expect(mockSamlStrategy.validateResponse).toHaveBeenCalledWith('saml_response_token');

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'user@company.com',
        username: 'user@company.com',
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe',
        estateId: 1,
        verified: true,
        ssoProvider: 1,
        ssoSubject: 'user@company.com'
      });

      expect(result.user).toMatchObject({
        id: 1,
        email: 'user@company.com',
        role: 'admin'
      });

      expect(result.isNewUser).toBe(true);
    });

    test('should update existing user on SAML login', async () => {
      const samlResponse = {
        nameID: 'existing@company.com',
        attributes: {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'existing@company.com',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Jane',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Smith',
          'http://schemas.company.com/ws/2005/05/identity/claims/role': 'resident'
        }
      };

      const existingUser = {
        id: 2,
        email: 'existing@company.com',
        username: 'existing@company.com',
        role: 'admin', // Different role
        firstName: 'Jane',
        lastName: 'Doe' // Different last name
      };

      const providerConfig = {
        id: 1,
        attributeMapping: {
          email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
          firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
          lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
          role: 'http://schemas.company.com/ws/2005/05/identity/claims/role'
        },
        updateAttributes: true
      };

      mockSamlStrategy.validateResponse.mockResolvedValue(samlResponse);
      mockUserService.getUserByEmail.mockResolvedValue(existingUser);
      mockUserService.updateUser.mockResolvedValue({
        ...existingUser,
        role: 'resident',
        lastName: 'Smith'
      });

      const result = await ssoIntegrationService.handleSamlResponse(
        'saml_response_token',
        providerConfig,
        1
      );

      expect(mockUserService.updateUser).toHaveBeenCalledWith(2, {
        role: 'resident',
        lastName: 'Smith',
        lastSsoLogin: expect.any(String)
      });

      expect(result.user.role).toBe('resident');
      expect(result.user.lastName).toBe('Smith');
      expect(result.isNewUser).toBe(false);
    });

    test('should generate SAML metadata', async () => {
      const providerConfig = {
        id: 1,
        issuer: 'secure-gate-app',
        callbackUrl: 'https://app.secure-gate.com/auth/saml/callback',
        cert: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----'
      };

      const expectedMetadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="secure-gate-app">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://app.secure-gate.com/auth/saml/callback" index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

      mockSamlStrategy.generateMetadata.mockReturnValue(expectedMetadata);

      const metadata = await ssoIntegrationService.generateSamlMetadata(providerConfig);

      expect(mockSamlStrategy.generateMetadata).toHaveBeenCalled();
      expect(metadata).toBe(expectedMetadata);
    });
  });

  describe('OAuth 2.0 Integration', () => {
    test('should configure OAuth provider successfully', async () => {
      const oauthConfig = {
        name: 'Google OAuth',
        clientId: 'google_client_id',
        clientSecret: 'google_client_secret',
        authorizationUrl: 'https://accounts.google.com/oauth/authorize',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: 'email',
          firstName: 'given_name',
          lastName: 'family_name',
          picture: 'picture'
        },
        autoProvision: true,
        defaultRole: 'resident'
      };

      mockDb.query.mockResolvedValue({
        rows: [{ id: 2, ...oauthConfig, created_at: new Date().toISOString() }],
        rowCount: 1
      });

      const result = await ssoIntegrationService.configureOAuthProvider(1, oauthConfig);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sso_providers'),
        expect.arrayContaining([
          1, // estateId
          'oauth2',
          oauthConfig.name,
          JSON.stringify(oauthConfig),
          true // active
        ])
      );

      expect(result).toMatchObject({
        id: 2,
        name: oauthConfig.name,
        type: 'oauth2'
      });
    });

    test('should handle OAuth authorization flow', async () => {
      const providerConfig = {
        id: 2,
        clientId: 'google_client_id',
        clientSecret: 'google_client_secret',
        authorizationUrl: 'https://accounts.google.com/oauth/authorize',
        scopes: ['openid', 'email', 'profile'],
        redirectUri: 'https://app.secure-gate.com/auth/oauth/callback'
      };

      const expectedAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=google_client_id&redirect_uri=https://app.secure-gate.com/auth/oauth/callback&scope=openid%20email%20profile&response_type=code&state=random_state';

      mockOAuthStrategy.getAuthorizationUrl.mockReturnValue(expectedAuthUrl);

      const result = await ssoIntegrationService.getOAuthAuthorizationUrl(
        providerConfig,
        'random_state'
      );

      expect(mockOAuthStrategy.getAuthorizationUrl).toHaveBeenCalledWith({
        clientId: providerConfig.clientId,
        redirectUri: providerConfig.redirectUri,
        scopes: providerConfig.scopes,
        state: 'random_state'
      });

      expect(result).toBe(expectedAuthUrl);
    });

    test('should handle OAuth callback and token exchange', async () => {
      const providerConfig = {
        id: 2,
        clientId: 'google_client_id',
        clientSecret: 'google_client_secret',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        attributeMapping: {
          email: 'email',
          firstName: 'given_name',
          lastName: 'family_name'
        },
        autoProvision: true,
        defaultRole: 'resident'
      };

      const tokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      const userInfo = {
        email: 'oauth@example.com',
        given_name: 'OAuth',
        family_name: 'User',
        picture: 'https://example.com/avatar.jpg'
      };

      mockOAuthStrategy.exchangeCodeForToken.mockResolvedValue(tokenResponse);
      mockOAuthStrategy.getUserInfo.mockResolvedValue(userInfo);
      mockUserService.getUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({
        id: 3,
        email: 'oauth@example.com',
        username: 'oauth@example.com',
        role: 'resident',
        firstName: 'OAuth',
        lastName: 'User'
      });

      const result = await ssoIntegrationService.handleOAuthCallback(
        'authorization_code_123',
        'random_state',
        providerConfig,
        1 // estateId
      );

      expect(mockOAuthStrategy.exchangeCodeForToken).toHaveBeenCalledWith(
        'authorization_code_123',
        providerConfig
      );

      expect(mockOAuthStrategy.getUserInfo).toHaveBeenCalledWith(
        tokenResponse.access_token,
        providerConfig.userInfoUrl
      );

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'oauth@example.com',
        username: 'oauth@example.com',
        role: 'resident',
        firstName: 'OAuth',
        lastName: 'User',
        estateId: 1,
        verified: true,
        ssoProvider: 2,
        ssoSubject: 'oauth@example.com'
      });

      expect(result.user).toMatchObject({
        id: 3,
        email: 'oauth@example.com'
      });

      expect(result.tokens).toEqual(tokenResponse);
    });
  });

  describe('OpenID Connect Integration', () => {
    test('should configure OIDC provider successfully', async () => {
      const oidcConfig = {
        name: 'Azure AD OIDC',
        issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
        clientId: 'azure_client_id',
        clientSecret: 'azure_client_secret',
        discoveryUrl: 'https://login.microsoftonline.com/tenant-id/v2.0/.well-known/openid_configuration',
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: 'email',
          firstName: 'given_name',
          lastName: 'family_name',
          role: 'extension_Role'
        },
        autoProvision: true,
        defaultRole: 'resident'
      };

      mockDb.query.mockResolvedValue({
        rows: [{ id: 3, ...oidcConfig, created_at: new Date().toISOString() }],
        rowCount: 1
      });

      const result = await ssoIntegrationService.configureOidcProvider(1, oidcConfig);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sso_providers'),
        expect.arrayContaining([
          1, // estateId
          'oidc',
          oidcConfig.name,
          JSON.stringify(oidcConfig),
          true // active
        ])
      );

      expect(result).toMatchObject({
        id: 3,
        name: oidcConfig.name,
        type: 'oidc'
      });
    });

    test('should discover OIDC configuration', async () => {
      const discoveryUrl = 'https://login.microsoftonline.com/tenant-id/v2.0/.well-known/openid_configuration';
      const discoveryResponse = {
        issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
        authorization_endpoint: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize',
        token_endpoint: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
        userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
        jwks_uri: 'https://login.microsoftonline.com/tenant-id/discovery/v2.0/keys'
      };

      mockOidcStrategy.discover.mockResolvedValue(discoveryResponse);

      const result = await ssoIntegrationService.discoverOidcConfiguration(discoveryUrl);

      expect(mockOidcStrategy.discover).toHaveBeenCalledWith(discoveryUrl);
      expect(result).toEqual(discoveryResponse);
    });

    test('should handle OIDC authentication with ID token validation', async () => {
      const providerConfig = {
        id: 3,
        issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
        clientId: 'azure_client_id',
        clientSecret: 'azure_client_secret',
        attributeMapping: {
          email: 'email',
          firstName: 'given_name',
          lastName: 'family_name'
        },
        autoProvision: true
      };

      const idTokenPayload = {
        sub: 'azure_user_id_123',
        email: 'oidc@example.com',
        given_name: 'OIDC',
        family_name: 'User',
        iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
        aud: 'azure_client_id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      mockOidcStrategy.validateIdToken.mockResolvedValue(idTokenPayload);
      mockUserService.getUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue({
        id: 4,
        email: 'oidc@example.com',
        username: 'oidc@example.com',
        role: 'resident',
        firstName: 'OIDC',
        lastName: 'User'
      });

      const result = await ssoIntegrationService.handleOidcAuthentication(
        'id_token_jwt',
        providerConfig,
        1 // estateId
      );

      expect(mockOidcStrategy.validateIdToken).toHaveBeenCalledWith(
        'id_token_jwt',
        providerConfig
      );

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        email: 'oidc@example.com',
        username: 'oidc@example.com',
        role: 'resident',
        firstName: 'OIDC',
        lastName: 'User',
        estateId: 1,
        verified: true,
        ssoProvider: 3,
        ssoSubject: 'azure_user_id_123'
      });

      expect(result.user).toMatchObject({
        id: 4,
        email: 'oidc@example.com'
      });
    });
  });

  describe('User Provisioning', () => {
    test('should map attributes correctly', () => {
      const attributes = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'test@example.com',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Test',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'User',
        'http://schemas.company.com/ws/2005/05/identity/claims/role': 'admin'
      };

      const attributeMapping = {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        role: 'http://schemas.company.com/ws/2005/05/identity/claims/role'
      };

      const result = ssoIntegrationService.mapAttributes(attributes, attributeMapping);

      expect(result).toEqual({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin'
      });
    });

    test('should handle missing attributes with defaults', () => {
      const attributes = {
        email: 'partial@example.com'
      };

      const attributeMapping = {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        role: 'role'
      };

      const defaults = {
        firstName: 'Unknown',
        lastName: 'User',
        role: 'resident'
      };

      const result = ssoIntegrationService.mapAttributes(attributes, attributeMapping, defaults);

      expect(result).toEqual({
        email: 'partial@example.com',
        firstName: 'Unknown',
        lastName: 'User',
        role: 'resident'
      });
    });

    test('should validate role mapping', () => {
      const validRoles = ['admin', 'guard', 'resident'];
      
      expect(ssoIntegrationService.validateRole('admin', validRoles)).toBe('admin');
      expect(ssoIntegrationService.validateRole('invalid_role', validRoles, 'resident')).toBe('resident');
      expect(ssoIntegrationService.validateRole(null, validRoles, 'resident')).toBe('resident');
    });
  });

  describe('Error Handling', () => {
    test('should handle SAML validation errors', async () => {
      const providerConfig = {
        id: 1,
        attributeMapping: {},
        autoProvision: true
      };

      mockSamlStrategy.validateResponse.mockRejectedValue(new Error('Invalid SAML response'));

      await expect(
        ssoIntegrationService.handleSamlResponse('invalid_response', providerConfig, 1)
      ).rejects.toThrow('Invalid SAML response');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'SAML response validation failed',
        expect.objectContaining({
          error: 'Invalid SAML response',
          providerId: 1
        })
      );
    });

    test('should handle OAuth token exchange errors', async () => {
      const providerConfig = {
        id: 2,
        clientId: 'client_id',
        clientSecret: 'client_secret',
        tokenUrl: 'https://oauth.example.com/token'
      };

      mockOAuthStrategy.exchangeCodeForToken.mockRejectedValue(new Error('Invalid authorization code'));

      await expect(
        ssoIntegrationService.handleOAuthCallback('invalid_code', 'state', providerConfig, 1)
      ).rejects.toThrow('Invalid authorization code');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth token exchange failed',
        expect.objectContaining({
          error: 'Invalid authorization code',
          providerId: 2
        })
      );
    });

    test('should handle user provisioning errors', async () => {
      const samlResponse = {
        nameID: 'user@example.com',
        attributes: {
          email: 'user@example.com'
        }
      };

      const providerConfig = {
        id: 1,
        attributeMapping: { email: 'email' },
        autoProvision: true
      };

      mockSamlStrategy.validateResponse.mockResolvedValue(samlResponse);
      mockUserService.getUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockRejectedValue(new Error('Email already exists'));

      await expect(
        ssoIntegrationService.handleSamlResponse('response', providerConfig, 1)
      ).rejects.toThrow('Email already exists');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User provisioning failed',
        expect.objectContaining({
          error: 'Email already exists',
          email: 'user@example.com'
        })
      );
    });

    test('should handle disabled auto-provisioning', async () => {
      const samlResponse = {
        nameID: 'newuser@example.com',
        attributes: {
          email: 'newuser@example.com'
        }
      };

      const providerConfig = {
        id: 1,
        attributeMapping: { email: 'email' },
        autoProvision: false // Disabled
      };

      mockSamlStrategy.validateResponse.mockResolvedValue(samlResponse);
      mockUserService.getUserByEmail.mockResolvedValue(null); // User doesn't exist

      await expect(
        ssoIntegrationService.handleSamlResponse('response', providerConfig, 1)
      ).rejects.toThrow('User not found and auto-provisioning is disabled');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SSO login attempted for non-existent user with auto-provisioning disabled',
        expect.objectContaining({
          email: 'newuser@example.com',
          providerId: 1
        })
      );
    });
  });
});