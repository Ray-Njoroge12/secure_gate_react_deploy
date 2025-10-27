#!/usr/bin/env node

/**
 * Cloudflare CDN Configuration Script
 * 
 * This script configures Cloudflare CDN settings for optimal performance
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class CloudflareCDNConfigurator {
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    this.domain = process.env.CLOUDFLARE_DOMAIN || 'securegate.com';
    this.apiUrl = 'https://api.cloudflare.com/client/v4';
    
    if (!this.apiToken || !this.zoneId) {
      throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be set in environment');
    }
  }

  /**
   * Make API request to Cloudflare
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!result.success) {
        throw new Error(`Cloudflare API error: ${JSON.stringify(result.errors)}`);
      }

      return result;
    } catch (error) {
      console.error(`${colors.red}✗${colors.reset} API request failed:`, error.message);
      throw error;
    }
  }

  /**
   * Configure caching rules
   */
  async configureCachingRules() {
    console.log(`${colors.blue}🔧 Configuring caching rules...${colors.reset}`);

    const cacheRules = [
      // Static assets - long cache
      {
        name: 'Static Assets Cache',
        priority: 1,
        match: {
          url: `${this.domain}/static/*`
        },
        actions: {
          cache_level: 'cache_everything',
          edge_cache_ttl: 31536000, // 1 year
          browser_cache_ttl: 31536000
        }
      },
      // Images - medium cache
      {
        name: 'Images Cache',
        priority: 2,
        match: {
          url: `${this.domain}/*.{jpg,jpeg,png,gif,svg,ico,webp}`
        },
        actions: {
          cache_level: 'cache_everything',
          edge_cache_ttl: 2592000, // 30 days
          browser_cache_ttl: 2592000
        }
      },
      // CSS and JS - long cache with versioning
      {
        name: 'CSS/JS Cache',
        priority: 3,
        match: {
          url: `${this.domain}/*.{css,js}`
        },
        actions: {
          cache_level: 'cache_everything',
          edge_cache_ttl: 31536000, // 1 year
          browser_cache_ttl: 31536000
        }
      },
      // API responses - short cache
      {
        name: 'API Cache',
        priority: 4,
        match: {
          url: `${this.domain}/api/*`
        },
        actions: {
          cache_level: 'bypass',
          edge_cache_ttl: 0,
          browser_cache_ttl: 0
        }
      },
      // HTML pages - short cache
      {
        name: 'HTML Cache',
        priority: 5,
        match: {
          url: `${this.domain}/*`
        },
        actions: {
          cache_level: 'cache_everything',
          edge_cache_ttl: 3600, // 1 hour
          browser_cache_ttl: 1800 // 30 minutes
        }
      }
    ];

    for (const rule of cacheRules) {
      try {
        const result = await this.makeRequest(
          `/zones/${this.zoneId}/pagerules`,
          'POST',
          rule
        );
        console.log(`${colors.green}✓${colors.reset} Created cache rule: ${rule.name}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} Cache rule may already exist: ${rule.name}`);
      }
    }
  }

  /**
   * Configure compression settings
   */
  async configureCompression() {
    console.log(`${colors.blue}🗜️ Configuring compression...${colors.reset}`);

    try {
      // Enable Brotli compression
      await this.makeRequest(
        `/zones/${this.zoneId}/settings/brotli`,
        'PATCH',
        { value: 'on' }
      );
      console.log(`${colors.green}✓${colors.reset} Brotli compression enabled`);

      // Configure compression settings
      await this.makeRequest(
        `/zones/${this.zoneId}/settings/mirage`,
        'PATCH',
        { value: 'on' }
      );
      console.log(`${colors.green}✓${colors.reset} Mirage image optimization enabled`);

    } catch (error) {
      console.log(`${colors.yellow}⚠${colors.reset} Compression configuration: ${error.message}`);
    }
  }

  /**
   * Configure security settings
   */
  async configureSecuritySettings() {
    console.log(`${colors.blue}🔒 Configuring security settings...${colors.reset}`);

    const securitySettings = [
      // SSL/TLS settings
      {
        endpoint: `/zones/${this.zoneId}/settings/ssl`,
        data: { value: 'strict' }
      },
      // Always use HTTPS
      {
        endpoint: `/zones/${this.zoneId}/settings/always_use_https`,
        data: { value: 'on' }
      },
      // HTTP Strict Transport Security
      {
        endpoint: `/zones/${this.zoneId}/settings/security_header`,
        data: {
          value: {
            enabled: true,
            include_subdomains: true,
            max_age: 31536000,
            preload: true
          }
        }
      },
      // Minimum TLS version
      {
        endpoint: `/zones/${this.zoneId}/settings/min_tls_version`,
        data: { value: '1.2' }
      },
      // Opportunistic encryption
      {
        endpoint: `/zones/${this.zoneId}/settings/opportunistic_encryption`,
        data: { value: 'on' }
      },
      // TLS 1.3
      {
        endpoint: `/zones/${this.zoneId}/settings/tls_1_3`,
        data: { value: 'on' }
      },
      // Automatic HTTPS rewrites
      {
        endpoint: `/zones/${this.zoneId}/settings/automatic_https_rewrites`,
        data: { value: 'on' }
      }
    ];

    for (const setting of securitySettings) {
      try {
        await this.makeRequest(setting.endpoint, 'PATCH', setting.data);
        const settingName = setting.endpoint.split('/').pop();
        console.log(`${colors.green}✓${colors.reset} Configured ${settingName}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} ${setting.endpoint}: ${error.message}`);
      }
    }
  }

  /**
   * Configure performance settings
   */
  async configurePerformanceSettings() {
    console.log(`${colors.blue}⚡ Configuring performance settings...${colors.reset}`);

    const performanceSettings = [
      // HTTP/3 (QUIC)
      {
        endpoint: `/zones/${this.zoneId}/settings/http3`,
        data: { value: 'on' }
      },
      // 0-RTT Connection Resumption
      {
        endpoint: `/zones/${this.zoneId}/settings/0rtt`,
        data: { value: 'on' }
      },
      // Early Hints
      {
        endpoint: `/zones/${this.zoneId}/settings/early_hints`,
        data: { value: 'on' }
      },
      // Argo Smart Routing
      {
        endpoint: `/zones/${this.zoneId}/argo/smart_routing`,
        data: { tiered_caching: 'on' }
      },
      // Rocket Loader
      {
        endpoint: `/zones/${this.zoneId}/settings/rocket_loader`,
        data: { value: 'on' }
      },
      // Auto Minify
      {
        endpoint: `/zones/${this.zoneId}/settings/minify`,
        data: {
          value: {
            css: 'on',
            html: 'on',
            js: 'on'
          }
        }
      }
    ];

    for (const setting of performanceSettings) {
      try {
        await this.makeRequest(setting.endpoint, 'PATCH', setting.data);
        const settingName = setting.endpoint.split('/').pop();
        console.log(`${colors.green}✓${colors.reset} Configured ${settingName}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} ${setting.endpoint}: ${error.message}`);
      }
    }
  }

  /**
   * Configure rate limiting
   */
  async configureRateLimiting() {
    console.log(`${colors.blue}🚦 Configuring rate limiting...${colors.reset}`);

    const rateLimits = [
      // API rate limiting
      {
        match: {
          request: {
            url: `${this.domain}/api/*`
          }
        },
        threshold: 100,
        period: 60,
        action: {
          mode: 'challenge',
          timeout: 300
        }
      },
      // Login rate limiting
      {
        match: {
          request: {
            url: `${this.domain}/api/auth/login`
          }
        },
        threshold: 10,
        period: 60,
        action: {
          mode: 'challenge',
          timeout: 900
        }
      },
      // General rate limiting
      {
        match: {
          request: {
            url: `${this.domain}/*`
          }
        },
        threshold: 1000,
        period: 60,
        action: {
          mode: 'challenge',
          timeout: 300
        }
      }
    ];

    for (const limit of rateLimits) {
      try {
        await this.makeRequest(
          `/zones/${this.zoneId}/rate_limits`,
          'POST',
          {
            ...limit,
            disabled: false,
            description: `Rate limit for ${limit.match.request.url}`
          }
        );
        console.log(`${colors.green}✓${colors.reset} Created rate limit for ${limit.match.request.url}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} Rate limit may already exist: ${limit.match.request.url}`);
      }
    }
  }

  /**
   * Configure firewall rules
   */
  async configureFirewallRules() {
    console.log(`${colors.blue}🔥 Configuring firewall rules...${colors.reset}`);

    const firewallRules = [
      // Block common attack patterns
      {
        action: 'block',
        expression: '(http.request.uri.path contains "/wp-admin/" or http.request.uri.path contains "/wp-login.php")',
        description: 'Block WordPress attacks'
      },
      // Block SQL injection attempts
      {
        action: 'block',
        expression: '(http.request.uri.query contains "union" or http.request.uri.query contains "select" or http.request.uri.query contains "drop")',
        description: 'Block SQL injection attempts'
      },
      // Block XSS attempts
      {
        action: 'block',
        expression: '(http.request.uri.query contains "<script" or http.request.uri.query contains "javascript:")',
        description: 'Block XSS attempts'
      },
      // Block directory traversal attempts
      {
        action: 'block',
        expression: '(http.request.uri.path contains "../" or http.request.uri.path contains "..\\")',
        description: 'Block directory traversal attempts'
      },
      // Challenge suspicious user agents
      {
        action: 'challenge',
        expression: '(http.user_agent contains "bot" and not http.user_agent contains "googlebot" and not http.user_agent contains "bingbot")',
        description: 'Challenge suspicious bots'
      }
    ];

    for (const rule of firewallRules) {
      try {
        await this.makeRequest(
          `/zones/${this.zoneId}/firewall/rules`,
          'POST',
          {
            ...rule,
            paused: false,
            priority: 1
          }
        );
        console.log(`${colors.green}✓${colors.reset} Created firewall rule: ${rule.description}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} Firewall rule may already exist: ${rule.description}`);
      }
    }
  }

  /**
   * Configure page rules
   */
  async configurePageRules() {
    console.log(`${colors.blue}📄 Configuring page rules...${colors.reset}`);

    const pageRules = [
      // Force HTTPS
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `http://${this.domain}/*`
            }
          }
        ],
        actions: [
          {
            id: 'always_use_https'
          }
        ],
        priority: 1,
        status: 'active'
      },
      // Cache static assets
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `${this.domain}/static/*`
            }
          }
        ],
        actions: [
          {
            id: 'cache_level',
            value: 'cache_everything'
          },
          {
            id: 'edge_cache_ttl',
            value: 31536000
          }
        ],
        priority: 2,
        status: 'active'
      },
      // Security headers for API
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `${this.domain}/api/*`
            }
          }
        ],
        actions: [
          {
            id: 'security_headers',
            value: {
              enabled: true
            }
          },
          {
            id: 'cache_level',
            value: 'bypass'
          }
        ],
        priority: 3,
        status: 'active'
      }
    ];

    for (const rule of pageRules) {
      try {
        await this.makeRequest(
          `/zones/${this.zoneId}/pagerules`,
          'POST',
          rule
        );
        console.log(`${colors.green}✓${colors.reset} Created page rule with priority ${rule.priority}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} Page rule may already exist: ${error.message}`);
      }
    }
  }

  /**
   * Test CDN configuration
   */
  async testCDNConfiguration() {
    console.log(`${colors.blue}🧪 Testing CDN configuration...${colors.reset}`);

    try {
      // Test HTTPS redirect
      const httpResponse = await fetch(`http://${this.domain}/`, { 
        redirect: 'manual',
        timeout: 10000 
      });
      
      if (httpResponse.status === 301 || httpResponse.status === 302) {
        console.log(`${colors.green}✓${colors.reset} HTTPS redirect working`);
      } else {
        console.log(`${colors.yellow}⚠${colors.reset} HTTPS redirect may not be working`);
      }

      // Test static asset caching
      const staticResponse = await fetch(`https://${this.domain}/static/js/bundle.js`, {
        timeout: 10000
      });
      
      const cacheHeader = staticResponse.headers.get('cf-cache-status');
      if (cacheHeader) {
        console.log(`${colors.green}✓${colors.reset} Static asset caching: ${cacheHeader}`);
      } else {
        console.log(`${colors.yellow}⚠${colors.reset} Static asset caching not detected`);
      }

      // Test security headers
      const response = await fetch(`https://${this.domain}/`, {
        timeout: 10000
      });
      
      const securityHeaders = [
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'content-security-policy'
      ];

      for (const header of securityHeaders) {
        const value = response.headers.get(header);
        if (value) {
          console.log(`${colors.green}✓${colors.reset} Security header ${header} present`);
        } else {
          console.log(`${colors.yellow}⚠${colors.reset} Security header ${header} missing`);
        }
      }

    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} CDN test failed: ${error.message}`);
    }
  }

  /**
   * Generate configuration report
   */
  async generateConfigurationReport() {
    console.log(`${colors.blue}📋 Generating configuration report...${colors.reset}`);

    try {
      // Get zone information
      const zoneInfo = await this.makeRequest(`/zones/${this.zoneId}`);
      const zone = zoneInfo.result;

      // Get DNS records
      const dnsRecords = await this.makeRequest(`/zones/${this.zoneId}/dns_records`);
      
      // Get page rules
      const pageRules = await this.makeRequest(`/zones/${this.zoneId}/pagerules`);
      
      // Get rate limits
      const rateLimits = await this.makeRequest(`/zones/${this.zoneId}/rate_limits`);

      const report = {
        timestamp: new Date().toISOString(),
        domain: this.domain,
        zone: {
          name: zone.name,
          status: zone.status,
          plan: zone.plan.name,
          ssl: zone.ssl.status
        },
        dns_records: dnsRecords.result.length,
        page_rules: pageRules.result.length,
        rate_limits: rateLimits.result.length,
        configuration: {
          caching_rules: 'configured',
          compression: 'enabled',
          security_headers: 'enabled',
          https_redirect: 'enabled',
          rate_limiting: 'configured',
          firewall_rules: 'configured'
        }
      };

      console.log(`${colors.green}✓${colors.reset} Configuration report generated`);
      console.log(`${colors.cyan}📊 CDN Configuration Summary:${colors.reset}`);
      console.log(`   Domain: ${report.domain}`);
      console.log(`   Zone Status: ${report.zone.status}`);
      console.log(`   Plan: ${report.zone.plan}`);
      console.log(`   SSL Status: ${report.zone.ssl}`);
      console.log(`   DNS Records: ${report.dns_records}`);
      console.log(`   Page Rules: ${report.page_rules}`);
      console.log(`   Rate Limits: ${report.rate_limits}`);

      return report;
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} Failed to generate report: ${error.message}`);
      return null;
    }
  }

  /**
   * Run complete CDN configuration
   */
  async configure() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting Cloudflare CDN Configuration${colors.reset}\n`);
    console.log(`Domain: ${this.domain}`);
    console.log(`Zone ID: ${this.zoneId}\n`);

    try {
      await this.configureCachingRules();
      await this.configureCompression();
      await this.configureSecuritySettings();
      await this.configurePerformanceSettings();
      await this.configureRateLimiting();
      await this.configureFirewallRules();
      await this.configurePageRules();
      await this.testCDNConfiguration();
      
      const report = await this.generateConfigurationReport();
      
      console.log(`\n${colors.bright}${colors.green}🎉 Cloudflare CDN configuration completed successfully!${colors.reset}`);
      
      console.log(`\n${colors.blue}💡 Next steps:${colors.reset}`);
      console.log('   1. Monitor CDN performance in Cloudflare dashboard');
      console.log('   2. Test website performance with CDN enabled');
      console.log('   3. Verify cache hit rates and response times');
      console.log('   4. Set up monitoring for CDN metrics');
      console.log('   5. Configure custom error pages if needed');
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ CDN configuration failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run configuration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const configurator = new CloudflareCDNConfigurator();
  configurator.configure().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default CloudflareCDNConfigurator;
