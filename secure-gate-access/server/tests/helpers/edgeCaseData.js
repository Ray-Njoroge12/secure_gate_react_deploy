/**
 * Edge Case Data Generator
 * Boundary values, invalid patterns, and special test cases for robust testing
 */

/**
 * String Edge Cases
 * Various string patterns for boundary testing
 */
export const stringEdgeCases = {
  // Empty and whitespace
  empty: '',
  whitespaceOnly: '   ',
  tab: '\t',
  newline: '\n',
  carriageReturn: '\r',
  'mixed Whitespace': ' \t\n\r ',

  // Very short
  singleChar: 'a',
  twoChars: 'ab',

  // Very long
  maxLength255: 'a'.repeat(255),
  maxLength500: 'a'.repeat(500),
  maxLength1000: 'a'.repeat(1000),
  overLimit: 'a'.repeat(10000),

  // Special characters
  specialChars: "!@#$%^&*()_+-=[]{}|;:',.<>?/~`",
  quotes: `'"'"'"`,
  apostrophes: "O'Brien's",
  dashes: 'Mary-Jane Smith-Jones',
  unicode: '你好世界 🎉',
  emoji: '😀😃😄😁😆',
  rtlText: 'مرحبا بالعالم',

  // SQL injection attempts
  sqlBasic: "' OR '1'='1",
  sqlComment: "'; DROP TABLE users; --",
  sqlUnion: "' UNION SELECT * FROM users--",
  sqlHex: "0x27204f52203127",

  // XSS attempts
  xssScript: '<script>alert("XSS")</script>',
  xssImg: '<img src=x onerror=alert("XSS")>',
  xssEvent: '<body onload=alert("XSS")>',
  xssIframe: '<iframe src="javascript:alert(\'XSS\')"></iframe>',

  // Path traversal
  pathTraversal: '../../../etc/passwd',
  windowsPath: '..\\..\\..\\windows\\system32',
  urlEncoded: '%2e%2e%2f%2e%2e%2f',

  // Command injection
  commandPipe: 'test | ls -la',
  commandSemicolon: 'test; rm -rf /',
  commandBacktick: 'test`whoami`',
  commandSubshell: 'test$(whoami)',

  // Format strings
  formatC: '%s%s%s%s%s%s%s%s%s%s',
  formatPython: '{}{}{}{}{}'
};

/**
 * Email Edge Cases
 * Valid and invalid email patterns
 */
export const emailEdgeCases = {
  // Valid but unusual
  withPlus: 'user+tag@test.com',
  withDots: 'first.middle.last@test.com',
  withDash: 'user-name@test.com',
  withNumbers: 'user123@test456.com',
  longLocal: 'a'.repeat(64) + '@test.com',
  longDomain: 'user@' + 'a'.repeat(63) + '.com',

  // Invalid
  noAt: 'usertest.com',
  multipleAt: 'user@@test.com',
  noDomain: 'user@',
  noLocal: '@test.com',
  spaces: 'user name@test.com',
  specialCharsInvalid: 'user#name@test.com',
  missingTld: 'user@test',
  dotStart: '.user@test.com',
  dotEnd: 'user.@test.com',
  doubleDot: 'user..name@test.com',
  
  // Edge domains
  localhost: 'user@localhost',
  ip: 'user@192.168.1.1',
  ipv6: 'user@[2001:db8::1]'
};

/**
 * Phone Number Edge Cases
 * Various phone formats and edge cases
 */
export const phoneEdgeCases = {
  // Valid Kenyan formats
  withPlus: '+254712345678',
  withZero: '0712345678',
  withSpaces: '+254 712 345 678',
  withDashes: '+254-712-345-678',
  withParens: '+254(712)345678',

  // Invalid
  tooShort: '+2547123',
  tooLong: '+254712345678901234',
  noPrefix: '712345678',
  wrongPrefix: '+255712345678', // Tanzania
  letters: '+254ABC345678',
  specialChars: '+254-712-345-#78',
  onlyZeros: '+254000000000',
  
  // International formats
  us: '+1-555-123-4567',
  uk: '+44-20-7123-4567',
  china: '+86-138-1234-5678'
};

/**
 * Date/Time Edge Cases
 * Boundary dates and problematic timestamps
 */
export const dateEdgeCases = {
  // Boundary dates
  unixEpoch: new Date(0),
  y2k: new Date('2000-01-01'),
  y2k38: new Date('2038-01-19T03:14:07Z'),
  leapDay: new Date('2024-02-29'),
  centuryBoundary: new Date('2100-01-01'),

  // Invalid dates
  invalidDate: new Date('invalid'),
  farFuture: new Date('9999-12-31'),
  farPast: new Date('1900-01-01'),

  // Timezone edge cases
  dst: new Date('2024-03-10T02:30:00'), // DST transition
  utc: new Date('2024-01-01T00:00:00Z'),
  lastSecond: new Date('2024-12-31T23:59:59Z'),

  // String formats
  iso8601: '2024-10-07T18:30:00.000Z',
  rfc2822: 'Mon, 07 Oct 2024 18:30:00 +0000',
  timestamp: '1696704600000',
  invalid: 'not-a-date'
};

/**
 * Numeric Edge Cases
 * Boundary values for numbers
 */
export const numericEdgeCases = {
  // Integers
  zero: 0,
  one: 1,
  negativeOne: -1,
  maxInt32: 2147483647,
  minInt32: -2147483648,
  maxSafeInteger: Number.MAX_SAFE_INTEGER,
  minSafeInteger: Number.MIN_SAFE_INTEGER,

  // Floats
  smallFloat: 0.0001,
  largeFloat: 999999.9999,
  negative: -123.456,
  
  // Special values
  infinity: Infinity,
  negativeInfinity: -Infinity,
  nan: NaN,

  // String representations
  stringZero: '0',
  stringNumber: '123',
  stringFloat: '123.456',
  stringNegative: '-123',
  stringExponent: '1.23e10',
  stringInvalid: 'not-a-number',
  stringWithSpaces: ' 123 '
};

/**
 * Return a flat list of invalid email patterns for tests
 * @returns {Array<string>} Invalid email patterns
 */
export function getInvalidEmailPatterns() {
  return [
    emailEdgeCases.noAt,
    emailEdgeCases.multipleAt,
    emailEdgeCases.noDomain,
    emailEdgeCases.noLocal,
    emailEdgeCases.spaces,
    emailEdgeCases.specialCharsInvalid,
    emailEdgeCases.missingTld,
    emailEdgeCases.dotStart,
    emailEdgeCases.dotEnd,
    emailEdgeCases.doubleDot
  ];
}

/**
 * Return boundary string values for tests
 * @returns {Array<string>} Boundary strings
 */
export function getBoundaryStrings() {
  return Object.values(stringEdgeCases);
}

/**
 * Generate invalid user data
 * @param {string} invalidField - Field to make invalid
 * @returns {Object} User object with invalid data
 */
export function generateInvalidUser(invalidField = 'email') {
  const baseUser = {
    email: 'valid@test.com',
    username: 'validuser',
    password_hash: 'validhash123',
    phone: '+254712345678',
    role: 'resident',
    area: 'Block A',
    house: 'A101'
  };

  const invalidations = {
    email: { email: emailEdgeCases.noAt },
    username: { username: stringEdgeCases.empty },
    phone: { phone: phoneEdgeCases.tooShort },
    role: { role: 'invalid_role' },
    area: { area: stringEdgeCases.sqlBasic },
    house: { house: stringEdgeCases.xssScript },
    all_empty: { email: '', username: '', phone: '', role: '', area: '', house: '' },
    all_null: { email: null, username: null, phone: null, role: null, area: null, house: null },
    all_undefined: { email: undefined, username: undefined, phone: undefined }
  };

  return { ...baseUser, ...(invalidations[invalidField] || {}) };
}

/**
 * Generate invalid visitor data
 * @param {string} invalidField - Field to make invalid
 * @returns {Object} Visitor object with invalid data
 */
export function generateInvalidVisitor(invalidField = 'email') {
  const baseVisitor = {
    name: 'Valid Visitor',
    email: 'valid@visitor.com',
    phone: '+254712345678',
    id_number: 'ID12345678',
    purpose: 'Visit',
    visit_date: new Date(),
    duration_hours: 2
  };

  const invalidations = {
    email: { email: emailEdgeCases.multipleAt },
    phone: { phone: phoneEdgeCases.letters },
    id_number: { id_number: stringEdgeCases.empty },
    name: { name: stringEdgeCases.xssScript },
    purpose: { purpose: stringEdgeCases.overLimit },
    visit_date: { visit_date: dateEdgeCases.invalidDate },
    duration_hours: { duration_hours: numericEdgeCases.negativeOne },
    negative_duration: { duration_hours: -5 },
    zero_duration: { duration_hours: 0 },
    excessive_duration: { duration_hours: 9999 },
    past_date: { visit_date: dateEdgeCases.farPast }
  };

  return { ...baseVisitor, ...(invalidations[invalidField] || {}) };
}

/**
 * Generate malformed JSON payloads
 * @returns {Array} Array of malformed JSON strings
 */
export function generateMalformedJSON() {
  return [
    '',  // Empty
    '{',  // Unclosed brace
    '{"key": }',  // Missing value
    '{"key": "value",}',  // Trailing comma
    '{key: "value"}',  // Unquoted key
    "{'key': 'value'}",  // Single quotes
    '{"key": undefined}',  // Undefined value
    '{"key": NaN}',  // NaN value
    'null',  // Just null
    'undefined',  // Undefined string
    '{"key": "value" "key2": "value2"}',  // Missing comma
    '[1, 2, 3,]',  // Trailing comma in array
    '{"nested": {"key": }',  // Incomplete nested
  ];
}

/**
 * Generate boundary test cases for pagination
 * @param {number} totalItems - Total items available
 * @returns {Array} Array of pagination test cases
 */
export function generatePaginationEdgeCases(totalItems = 100) {
  return [
    // Valid cases
    { page: 1, limit: 10 },
    { page: 1, limit: 100 },
    { page: 5, limit: 20 },
    
    // Edge cases
    { page: 0, limit: 10 },  // Zero page
    { page: -1, limit: 10 },  // Negative page
    { page: 1, limit: 0 },  // Zero limit
    { page: 1, limit: -10 },  // Negative limit
    { page: 999999, limit: 10 },  // Beyond total pages
    { page: 1, limit: 10000 },  // Excessive limit
    { page: 1.5, limit: 10 },  // Float page
    { page: 1, limit: 10.5 },  // Float limit
    { page: '1', limit: '10' },  // String numbers
    { page: 'a', limit: 'b' },  // Non-numeric
    { page: null, limit: null },  // Null values
    { page: undefined, limit: undefined },  // Undefined
    { page: Infinity, limit: Infinity },  // Infinity
    { page: NaN, limit: NaN },  // NaN
  ];
}

/**
 * Generate rate limit test cases
 * @param {number} limit - Rate limit threshold
 * @param {number} window - Time window in seconds
 * @returns {Object} Rate limit test configuration
 */
export function generateRateLimitTestCases(limit = 100, window = 60) {
  return {
    withinLimit: Math.floor(limit * 0.9),  // 90% of limit
    atLimit: limit,  // Exactly at limit
    overLimit: limit + 1,  // Just over limit
    wayOverLimit: limit * 2,  // 2x limit
    burst: limit + 50,  // Burst attempt
    sustained: {
      requests: limit * 5,  // 5x limit over time
      duration: window * 5  // 5x window
    },
    concurrent: {
      requests: limit / 2,  // Half limit
      concurrency: 10  // Simultaneous requests
    }
  };
}

/**
 * Generate file upload edge cases
 * @returns {Object} File upload test cases
 */
export function generateFileUploadEdgeCases() {
  return {
    empty: { size: 0, name: '', type: '' },
    tooLarge: { size: 100 * 1024 * 1024, name: 'large.zip', type: 'application/zip' },  // 100MB
    noExtension: { size: 1024, name: 'file', type: 'application/octet-stream' },
    longFilename: { size: 1024, name: 'a'.repeat(255) + '.txt', type: 'text/plain' },
    specialChars: { size: 1024, name: '../../../etc/passwd', type: 'text/plain' },
    doubleExtension: { size: 1024, name: 'file.txt.exe', type: 'application/x-msdownload' },
    mismatchType: { size: 1024, name: 'image.jpg', type: 'text/plain' },  // Wrong MIME type
    nullByte: { size: 1024, name: 'file\0.txt', type: 'text/plain' }
  };
}

// Export all collections and functions
export default {
  stringEdgeCases,
  emailEdgeCases,
  phoneEdgeCases,
  dateEdgeCases,
  numericEdgeCases,
  getInvalidEmailPatterns,
  getBoundaryStrings,
  generateInvalidUser,
  generateInvalidVisitor,
  generateMalformedJSON,
  generatePaginationEdgeCases,
  generateRateLimitTestCases,
  generateFileUploadEdgeCases
};
