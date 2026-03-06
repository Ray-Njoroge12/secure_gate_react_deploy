/**
 * SSO Integration Service
 * Supports SAML, OAuth 2.0, and OpenID Connect with proper user provisioning
 */

import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

class SSOIntegrationService {
  constructor() {
    this.providers = new Map();
    this.userMappings = new Map();
    this.provisioningRules = new Map();
    this.auditLog = [];
    
    this.initializePassport();
  }

  /**
   * Initialize Passport.js with SSO strategies
   */
  initializePassport() {
    // Serialize/deserialize user for session
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        // This would fetch user from database
        const user = await this.getUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Configure SAML provider
   */
  configureSAMLProvider(config) {
    const providerId = config.providerId || `saml_${Date.now()}`;
    
    const samlConfig = {
      entryPoint: config.entryPoint,
      issuer: config.issuer || 'secure-gate-access',
      callbackUrl: config.callbackUrl,
      cert: config.cert, // IdP certificate
      privateCert: config.privateCert, // SP private key
      identifierFormat: config.identifierFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      signatureAlgorithm: config.signatureAlgorithm || 'sha256',
      digestAlgorithm: config.digestAlgorithm || 'sha256',
      
      // Attribute mapping
      attributeConsumingServiceIndex: false,
      disableRequestedAuthnContext: true,
      
      // Security settings
      wantAssertionsSigned: config.wantAssertionsSigned !== false,
      wantAuthnResponseSigned: config.wantAuthnResponseSigned !== false
    };

    const strategy = new SamlStrategy(samlConfig, async (profile, done) => {
      try {
        const user = await this.processSAMLUser(profile, providerId, config);
        done(null, user);
      } catch (error) {
        this.logSSOEvent('saml_auth_failed', { providerId, error: error.message, profile });
        done(error, null);
      }
    });

    passport.use(`saml-${providerId}`, strategy);

    const provider = {
      id: providerId,
      type: 'saml',
      name: config.name || 'SAML Provider',
      config: samlConfig,
      userMapping: config.userMapping || this.getDefaultUserMapping(),
      provisioningRules: config.provisioningRules || this.getDefaultProvisioningRules(),
      active: config.active !== false,
      createdAt: new Date().toISOString()
    };

    this.providers.set(providerId, provider);
    this.logSSOEvent('provider_configured', { providerId, type: 'saml' });

    return provider;
  }

  /**
   * Configure OAuth 2.0 provider
   */
  configureOAuth2Provider(config) {
    const providerId = config.providerId || `oauth2_${Date.now()}`;

    const oauth2Config = {
      authorizationURL: config.authorizationURL,
      tokenURL: config.tokenURL,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope || ['openid', 'profile', 'email'],
      
      // Custom parameters
      customHeaders: config.customHeaders || {},
      scopeSeparator: config.scopeSeparator || ' ',
      
      // PKCE support
      pkce: config.pkce || false,
      state: config.state !== false
    };

    const strategy = new OAuth2Strategy(oauth2Config, async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user info from userinfo endpoint
        const userInfo = await this.fetchOAuth2UserInfo(accessToken, config.userinfoURL);
        const user = await this.processOAuth2User(userInfo, providerId, config, {
          accessToken,
          refreshToken
        });
        done(null, user);
      } catch (error) {
        this.logSSOEvent('oauth2_auth_failed', { providerId, error: error.message });
        done(error, null);
      }
    });

    passport.use(`oauth2-${providerId}`, strategy);

    const provider = {
      id: providerId,
      type: 'oauth2',
      name: config.name || 'OAuth 2.0 Provider',
      config: oauth2Config,
      userMapping: config.userMapping || this.getDefaultUserMapping(),
      provisioningRules: config.provisioningRules || this.getDefaultProvisioningRules(),
      active: config.active !== false,
      createdAt: new Date().toISOString()
    };

    this.providers.set(providerId, provider);
    this.logSSOEvent('provider_configured', { providerId, type: 'oauth2' });

    return provider;
  }

  /**
   * Configure Google OAuth provider
   */
  configureGoogleProvider(config) {
    const providerId = config.providerId || 'google';

    const strategy = new GoogleStrategy({
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope || ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await this.processGoogleUser(profile, providerId, config, {
          accessToken,
          refreshToken
        });
        done(null, user);
      } catch (error) {
        this.logSSOEvent('google_auth_failed', { providerId, error: error.message, profile });
        done(error, null);
      }
    });

    passport.use(`google-${providerId}`, strategy);

    const provider = {
      id: providerId,
      type: 'google',
      name: config.name || 'Google',
      config,
      userMapping: config.userMapping || this.getGoogleUserMapping(),
      provisioningRules: config.provisioningRules || this.getDefaultProvisioningRules(),
      active: config.active !== false,
      createdAt: new Date().toISOString()
    };

    this.providers.set(providerId, provider);
    this.logSSOEvent('provider_configured', { providerId, type: 'google' });

    return provider;
  }

  /**
   * Configure Microsoft/Azure AD provider
   */
  configureMicrosoftProvider(config) {
    const providerId = config.providerId || 'microsoft';

    const strategy = new MicrosoftStrategy({
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope || ['user.read'],
      tenant: config.tenant || 'common'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await this.processMicrosoftUser(profile, providerId, config, {
          accessToken,
          refreshToken
        });
        done(null, user);
      } catch (error) {
        this.logSSOEvent('microsoft_auth_failed', { providerId, error: error.message, profile });
        done(error, null);
      }
    });

    passport.use(`microsoft-${providerId}`, strategy);

    const provider = {
      id: providerId,
      type: 'microsoft',
      name: config.name || 'Microsoft',
      config,
      userMapping: config.userMapping || this.getMicrosoftUserMapping(),
      provisioningRules: config.provisioningRules || this.getDefaultProvisioningRules(),
      active: config.active !== false,
      createdAt: new Date().toISOString()
    };

    this.providers.set(providerId, provider);
    this.logSSOEvent('provider_configured', { providerId, type: 'microsoft' });

    return provider;
  }

  /**
   * Process SAML user authentication
   */
  async processSAMLUser(profile, providerId, config) {
    const userAttributes = this.mapSAMLAttributes(profile, config.userMapping);
    
    // Check if user exists
    let user = await this.findUserByExternalId(profile.nameID, providerId);
    
    if (!user) {
      // Check provisioning rules
      const canProvision = await this.checkProvisioningRules(userAttributes, providerId);
      
      if (canProvision.allowed) {
        user = await this.provisionUser(userAttributes, providerId, 'saml', {
          externalId: profile.nameID,
          profile
        });
      } else {
        throw new Error(`User provisioning denied: ${canProvision.reason}`);
      }
    } else {
      // Update existing user attributes
      user = await this.updateUserAttributes(user, userAttributes);
    }

    // Log successful authentication
    this.logSSOEvent('saml_auth_success', {
      providerId,
      userId: user.id,
      externalId: profile.nameID
    });

    return user;
  }

  /**
   * Process OAuth 2.0 user authentication
   */
  async processOAuth2User(userInfo, providerId, config, tokens) {
    const userAttributes = this.mapOAuth2Attributes(userInfo, config.userMapping);
    
    let user = await this.findUserByExternalId(userInfo.sub || userInfo.id, providerId);
    
    if (!user) {
      const canProvision = await this.checkProvisioningRules(userAttributes, providerId);
      
      if (canProvision.allowed) {
        user = await this.provisionUser(userAttributes, providerId, 'oauth2', {
          externalId: userInfo.sub || userInfo.id,
          userInfo,
          tokens
        });
      } else {
        throw new Error(`User provisioning denied: ${canProvision.reason}`);
      }
    } else {
      user = await this.updateUserAttributes(user, userAttributes);
      // Update tokens if needed
      await this.updateUserTokens(user, tokens);
    }

    this.logSSOEvent('oauth2_auth_success', {
      providerId,
      userId: user.id,
      externalId: userInfo.sub || userInfo.id
    });

    return user;
  }

  /**
   * Process Google user authentication
   */
  async processGoogleUser(profile, providerId, config, tokens) {
    const userAttributes = {
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      displayName: profile.displayName,
      avatar: profile.photos?.[0]?.value,
      locale: profile._json?.locale,
      verified: profile.emails?.[0]?.verified || false
    };

    let user = await this.findUserByExternalId(profile.id, providerId);
    
    if (!user) {
      const canProvision = await this.checkProvisioningRules(userAttributes, providerId);
      
      if (canProvision.allowed) {
        user = await this.provisionUser(userAttributes, providerId, 'google', {
          externalId: profile.id,
          profile,
          tokens
        });
      } else {
        throw new Error(`User provisioning denied: ${canProvision.reason}`);
      }
    } else {
      user = await this.updateUserAttributes(user, userAttributes);
      await this.updateUserTokens(user, tokens);
    }

    this.logSSOEvent('google_auth_success', {
      providerId,
      userId: user.id,
      externalId: profile.id
    });

    return user;
  }

  /**
   * Process Microsoft user authentication
   */
  async processMicrosoftUser(profile, providerId, config, tokens) {
    const userAttributes = {
      email: profile.emails?.[0]?.value || profile._json?.mail,
      firstName: profile.name?.givenName || profile._json?.givenName,
      lastName: profile.name?.familyName || profile._json?.surname,
      displayName: profile.displayName || profile._json?.displayName,
      jobTitle: profile._json?.jobTitle,
      department: profile._json?.department,
      officeLocation: profile._json?.officeLocation
    };

    let user = await this.findUserByExternalId(profile.id, providerId);
    
    if (!user) {
      const canProvision = await this.checkProvisioningRules(userAttributes, providerId);
      
      if (canProvision.allowed) {
        user = await this.provisionUser(userAttributes, providerId, 'microsoft', {
          externalId: profile.id,
          profile,
          tokens
        });
      } else {
        throw new Error(`User provisioning denied: ${canProvision.reason}`);
      }
    } else {
      user = await this.updateUserAttributes(user, userAttributes);
      await this.updateUserTokens(user, tokens);
    }

    this.logSSOEvent('microsoft_auth_success', {
      providerId,
      userId: user.id,
      externalId: profile.id
    });

    return user;
  }

  /**
   * Map SAML attributes to user attributes
   */
  mapSAMLAttributes(profile, mapping) {
    const attributes = {};
    
    for (const [localAttr, samlAttr] of Object.entries(mapping)) {
      if (profile[samlAttr]) {
        attributes[localAttr] = Array.isArray(profile[samlAttr]) ? 
          profile[samlAttr][0] : profile[samlAttr];
      }
    }

    return attributes;
  }

  /**
   * Map OAuth 2.0 attributes to user attributes
   */
  mapOAuth2Attributes(userInfo, mapping) {
    const attributes = {};
    
    for (const [localAttr, remoteAttr] of Object.entries(mapping)) {
      if (userInfo[remoteAttr]) {
        attributes[localAttr] = userInfo[remoteAttr];
      }
    }

    return attributes;
  }

  /**
   * Check provisioning rules
   */
  async checkProvisioningRules(userAttributes, providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { allowed: false, reason: 'Provider not found' };
    }

    const rules = provider.provisioningRules;

    // Check required attributes
    if (rules.requiredAttributes) {
      for (const attr of rules.requiredAttributes) {
        if (!userAttributes[attr]) {
          return { allowed: false, reason: `Missing required attribute: ${attr}` };
        }
      }
    }

    // Check email domain restrictions
    if (rules.allowedDomains && userAttributes.email) {
      const domain = userAttributes.email.split('@')[1];
      if (!rules.allowedDomains.includes(domain)) {
        return { allowed: false, reason: `Email domain not allowed: ${domain}` };
      }
    }

    // Check role mapping
    if (rules.defaultRole && !this.isValidRole(rules.defaultRole)) {
      return { allowed: false, reason: `Invalid default role: ${rules.defaultRole}` };
    }

    return { allowed: true };
  }

  /**
   * Provision new user
   */
  async provisionUser(userAttributes, providerId, authMethod, metadata) {
    const provider = this.providers.get(providerId);
    const rules = provider.provisioningRules;

    const userData = {
      email: userAttributes.email,
      username: userAttributes.username || userAttributes.email,
      firstName: userAttributes.firstName,
      lastName: userAttributes.lastName,
      role: rules.defaultRole || 'resident',
      estate_id: rules.defaultEstateId || null,
      
      // SSO metadata
      ssoProvider: providerId,
      ssoExternalId: metadata.externalId,
      ssoAuthMethod: authMethod,
      ssoMetadata: metadata,
      
      // Account settings
      verified: true, // SSO users are pre-verified
      accountStatus: 'active',
      createdVia: 'sso_provisioning'
    };

    // This would create user in database
    const user = await this.createUser(userData);

    this.logSSOEvent('user_provisioned', {
      providerId,
      userId: user.id,
      externalId: metadata.externalId,
      authMethod
    });

    return user;
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(user, attributes) {
    const updates = {};
    
    // Only update allowed attributes
    const allowedUpdates = ['firstName', 'lastName', 'displayName', 'avatar', 'jobTitle', 'department'];
    
    for (const attr of allowedUpdates) {
      if (attributes[attr] && attributes[attr] !== user[attr]) {
        updates[attr] = attributes[attr];
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      updates.lastSsoSync = new Date().toISOString();
      
      // This would update user in database
      const updatedUser = await this.updateUser(user.id, updates);
      
      this.logSSOEvent('user_attributes_updated', {
        userId: user.id,
        updates: Object.keys(updates)
      });
      
      return updatedUser;
    }

    return user;
  }

  /**
   * Update user tokens
   */
  async updateUserTokens(user, tokens) {
    if (tokens.accessToken || tokens.refreshToken) {
      const tokenData = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenUpdatedAt: new Date().toISOString()
      };

      // This would update tokens in secure storage
      await this.updateUserSSOTokens(user.id, tokenData);
    }
  }

  /**
   * Get default user mapping
   */
  getDefaultUserMapping() {
    return {
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      displayName: 'displayName'
    };
  }

  /**
   * Get Google user mapping
   */
  getGoogleUserMapping() {
    return {
      email: 'email',
      firstName: 'given_name',
      lastName: 'family_name',
      displayName: 'name',
      avatar: 'picture'
    };
  }

  /**
   * Get Microsoft user mapping
   */
  getMicrosoftUserMapping() {
    return {
      email: 'mail',
      firstName: 'givenName',
      lastName: 'surname',
      displayName: 'displayName',
      jobTitle: 'jobTitle',
      department: 'department'
    };
  }

  /**
   * Get default provisioning rules
   */
  getDefaultProvisioningRules() {
    return {
      autoProvision: true,
      requiredAttributes: ['email'],
      defaultRole: 'resident',
      defaultEstateId: null,
      allowedDomains: null // null means all domains allowed
    };
  }

  /**
   * Log SSO event
   */
  logSSOEvent(action, details) {
    const event = {
      id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || null,
      userAgent: details.userAgent || null
    };

    this.auditLog.push(event);

    // Keep only recent events (last 1000)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    console.log('SSO Event:', event);
  }

  /**
   * Fetch OAuth 2.0 user info
   */
  async fetchOAuth2UserInfo(accessToken, userinfoURL) {
    if (!userinfoURL) {
      throw new Error('Userinfo URL not configured');
    }

    const response = await fetch(userinfoURL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    return await response.json();
  }

  // Mock database methods (would be replaced with actual database calls)
  async findUserByExternalId(externalId, providerId) {
    // Mock implementation
    return null;
  }

  async createUser(userData) {
    // Mock implementation
    return {
      id: Math.floor(Math.random() * 10000),
      ...userData,
      createdAt: new Date().toISOString()
    };
  }

  async updateUser(userId, updates) {
    // Mock implementation
    return { id: userId, ...updates };
  }

  async updateUserSSOTokens(userId, tokenData) {
    // Mock implementation
    return true;
  }

  async getUserById(id) {
    // Mock implementation
    return { id, email: 'user@example.com' };
  }

  isValidRole(role) {
    const validRoles = ['admin', 'guard', 'resident'];
    return validRoles.includes(role);
  }

  /**
   * Get all providers
   */
  getAllProviders() {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId) {
    return this.providers.get(providerId);
  }

  /**
   * Delete provider
   */
  deleteProvider(providerId) {
    const provider = this.providers.get(providerId);
    if (provider) {
      this.providers.delete(providerId);
      this.logSSOEvent('provider_deleted', { providerId });
      return true;
    }
    return false;
  }

  /**
   * Get SSO audit log
   */
  getAuditLog(filters = {}) {
    let log = [...this.auditLog];

    if (filters.action) {
      log = log.filter(event => event.action === filters.action);
    }

    if (filters.providerId) {
      log = log.filter(event => event.details.providerId === filters.providerId);
    }

    if (filters.limit) {
      log = log.slice(-filters.limit);
    }

    return log.reverse(); // Most recent first
  }
}

export default new SSOIntegrationService();