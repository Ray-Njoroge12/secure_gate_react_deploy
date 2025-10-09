/**
 * Enhanced Mock Data Generator
 * Realistic data generation with Kenyan-specific patterns and context
 */

/**
 * Kenyan Data Patterns
 * Authentic Kenyan names, locations, and data formats
 */
export const kenyanDataPatterns = {
  // Common Kenyan first names
  firstNames: {
    male: [
      'John', 'David', 'Peter', 'James', 'Michael', 'Joseph', 'Daniel', 'Samuel',
      'Brian', 'Kevin', 'Dennis', 'Ian', 'Victor', 'Eric', 'Collins', 'Felix'
    ],
    female: [
      'Mary', 'Grace', 'Faith', 'Lucy', 'Sarah', 'Jane', 'Anne', 'Catherine',
      'Elizabeth', 'Margaret', 'Rose', 'Joyce', 'Agnes', 'Mercy', 'Beatrice', 'Nancy'
    ]
  },

  // Common Kenyan surnames by ethnic group
  surnames: {
    kikuyu: ['Mwangi', 'Kamau', 'Wanjiru', 'Njeri', 'Karanja', 'Wambui', 'Maina', 'Njoroge'],
    luo: ['Ochieng', 'Otieno', 'Akinyi', 'Adhiambo', 'Omondi', 'Awino', 'Owino', 'Onyango'],
    luhya: ['Wafula', 'Barasa', 'Wekesa', 'Simiyu', 'Wanjala', 'Mukhwana', 'Makokha', 'Juma'],
    kalenjin: ['Kipchoge', 'Kibet', 'Rotich', 'Cheruiyot', 'Koech', 'Bett', 'Rutto', 'Kiptoo'],
    kamba: ['Mutua', 'Muthama', 'Musyoka', 'Mumo', 'Ndunda', 'Kioko', 'Mbatha', 'Wambua']
  },

  // Nairobi neighborhoods and estates
  locations: {
    upscale: ['Westlands', 'Kilimani', 'Lavington', 'Karen', 'Runda', 'Kitisuru', 'Spring Valley'],
    middleClass: ['Kileleshwa', 'Parklands', 'South C', 'South B', 'Hurlingham', 'Ngong Road'],
    estates: ['Kasarani', 'Ruaka', 'Rongai', 'Syokimau', 'Ngong', 'Kikuyu', 'Kiambu']
  },

  // Common business/meeting purposes
  visitPurposes: [
    'Business Meeting',
    'Delivery',
    'Family Visit',
    'Maintenance - Plumbing',
    'Maintenance - Electrical',
    'Maintenance - HVAC',
    'Cleaning Services',
    'Internet Installation',
    'DSTV Installation',
    'Furniture Delivery',
    'Legal Consultation',
    'Medical Visit',
    'Tutoring',
    'Personal Training',
    'Photography Session'
  ]
};

/**
 * Generate realistic Kenyan name
 * @param {string} gender - 'male', 'female', or 'random'
 * @param {string} ethnicity - Ethnic group or 'random'
 * @returns {Object} {firstName, lastName, fullName}
 */
export function generateKenyanName(gender = 'random', ethnicity = 'random') {
  const actualGender = gender === 'random' 
    ? (Math.random() > 0.5 ? 'male' : 'female')
    : gender;

  const firstNamePool = kenyanDataPatterns.firstNames[actualGender];
  const firstName = firstNamePool[Math.floor(Math.random() * firstNamePool.length)];

  const ethnicGroups = Object.keys(kenyanDataPatterns.surnames);
  const actualEthnicity = ethnicity === 'random'
    ? ethnicGroups[Math.floor(Math.random() * ethnicGroups.length)]
    : ethnicity;

  const surnamePool = kenyanDataPatterns.surnames[actualEthnicity] || kenyanDataPatterns.surnames.kikuyu;
  const lastName = surnamePool[Math.floor(Math.random() * surnamePool.length)];

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  };
}

/**
 * Generate Kenyan phone number
 * @param {string} carrier - 'safaricom', 'airtel', 'telkom', or 'random'
 * @returns {string} Formatted Kenyan phone number (+254...)
 */
export function generateKenyanPhone(carrier = 'random') {
  // Kenyan mobile prefixes by carrier
  const prefixes = {
    safaricom: ['70', '71', '72', '74', '79'],  // Most common
    airtel: ['73', '78'],
    telkom: ['77']
  };

  let prefix;
  if (carrier === 'random') {
    // Weight towards Safaricom (70% market share)
    const rand = Math.random();
    if (rand < 0.7) prefix = prefixes.safaricom[Math.floor(Math.random() * prefixes.safaricom.length)];
    else if (rand < 0.9) prefix = prefixes.airtel[Math.floor(Math.random() * prefixes.airtel.length)];
    else prefix = prefixes.telkom[0];
  } else {
    const pool = prefixes[carrier] || prefixes.safaricom;
    prefix = pool[Math.floor(Math.random() * pool.length)];
  }

  // Generate remaining 6 digits
  const number = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  
  return `+254${prefix}${number}`;
}

/**
 * Generate Kenyan ID number
 * @returns {string} Kenyan ID format (8 digits)
 */
export function generateKenyanID() {
  // Kenyan IDs are typically 7-8 digits
  const idNumber = Math.floor(Math.random() * 90000000) + 10000000;
  return String(idNumber);
}

/**
 * Generate Nairobi address
 * @param {string} type - 'upscale', 'middleClass', 'estates', or 'random'
 * @returns {Object} {area, house, fullAddress}
 */
export function generateNairobiAddress(type = 'random') {
  let locations;
  if (type === 'random') {
    const allLocations = [
      ...kenyanDataPatterns.locations.upscale,
      ...kenyanDataPatterns.locations.middleClass,
      ...kenyanDataPatterns.locations.estates
    ];
    locations = allLocations;
  } else {
    locations = kenyanDataPatterns.locations[type] || kenyanDataPatterns.locations.middleClass;
  }

  const area = locations[Math.floor(Math.random() * locations.length)];
  const block = String.fromCharCode(65 + Math.floor(Math.random() * 5)); // A-E
  const houseNum = Math.floor(Math.random() * 400) + 100; // 100-499
  const house = `${block}${houseNum}`;

  return {
    area,
    house,
    fullAddress: `${house}, ${area}, Nairobi`
  };
}

/**
 * Generate realistic timestamp
 * @param {string} type - 'past', 'present', 'future', 'recent', 'upcoming'
 * @returns {Date} Generated timestamp
 */
export function generateRealisticTimestamp(type = 'present') {
  const now = Date.now();
  
  switch (type) {
    case 'past':
      // Random time in past 30 days
      return new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    case 'recent':
      // Last 24 hours
      return new Date(now - Math.random() * 24 * 60 * 60 * 1000);
    
    case 'present':
      // Within 1 hour of now
      return new Date(now + (Math.random() - 0.5) * 60 * 60 * 1000);
    
    case 'upcoming':
      // Next 24 hours
      return new Date(now + Math.random() * 24 * 60 * 60 * 1000);
    
    case 'future':
      // Random time in next 30 days
      return new Date(now + Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    default:
      return new Date();
  }
}

/**
 * Generate business hours timestamp
 * @param {Date} date - Base date (default: today)
 * @returns {Date} Timestamp during business hours (8 AM - 6 PM)
 */
export function generateBusinessHoursTimestamp(date = new Date()) {
  const businessDate = new Date(date);
  const hour = 8 + Math.floor(Math.random() * 10); // 8 AM - 6 PM
  const minute = Math.floor(Math.random() * 60);
  
  businessDate.setHours(hour, minute, 0, 0);
  return businessDate;
}

/**
 * Generate visit purpose
 * @param {string} category - 'business', 'personal', 'service', 'delivery', or 'random'
 * @returns {string} Visit purpose
 */
export function generateVisitPurpose(category = 'random') {
  const purposes = {
    business: ['Business Meeting', 'Legal Consultation', 'Financial Advisory', 'Interview'],
    personal: ['Family Visit', 'Social Visit', 'Birthday Party', 'Event Attendance'],
    service: [
      'Maintenance - Plumbing', 'Maintenance - Electrical', 'Maintenance - HVAC',
      'Cleaning Services', 'Internet Installation', 'DSTV Installation',
      'Personal Training', 'Tutoring', 'Medical Visit'
    ],
    delivery: ['Furniture Delivery', 'Package Delivery', 'Food Delivery', 'Online Shopping Delivery']
  };

  let purposePool;
  if (category === 'random') {
    purposePool = kenyanDataPatterns.visitPurposes;
  } else {
    purposePool = purposes[category] || kenyanDataPatterns.visitPurposes;
  }

  return purposePool[Math.floor(Math.random() * purposePool.length)];
}

/**
 * Generate realistic email
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {string} domain - Email domain or 'random'
 * @returns {string} Email address
 */
export function generateEmail(firstName, lastName, domain = 'random') {
  const domains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'test.com'
  ];

  const actualDomain = domain === 'random'
    ? domains[Math.floor(Math.random() * domains.length)]
    : domain;

  const formats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`
  ];

  const format = formats[Math.floor(Math.random() * formats.length)];
  
  return `${format}@${actualDomain}`;
}

/**
 * Generate complete realistic user
 * @param {string} role - User role
 * @param {Object} options - Additional options
 * @returns {Object} Complete user object
 */
export function generateRealisticUser(role = 'resident', options = {}) {
  const name = generateKenyanName();
  const address = generateNairobiAddress();
  
  return {
    email: options.email || generateEmail(name.firstName, name.lastName),
    username: options.username || `${name.firstName.toLowerCase()}${name.lastName.toLowerCase()}`,
    phone: generateKenyanPhone(),
    role,
    area: address.area,
    house: address.house,
    notify_email: Math.random() > 0.3, // 70% enable email
    notify_sms: Math.random() > 0.5, // 50% enable SMS
    verified: options.verified !== undefined ? options.verified : (Math.random() > 0.1), // 90% verified
    metadata: {
      full_name: name.fullName,
      ...options.metadata
    }
  };
}

/**
 * Generate complete realistic visitor
 * @param {Object} options - Additional options
 * @returns {Object} Complete visitor object
 */
export function generateRealisticVisitor(options = {}) {
  const name = generateKenyanName();
  
  return {
    name: name.fullName,
    email: options.email || generateEmail(name.firstName, name.lastName),
    phone: generateKenyanPhone(),
    id_number: generateKenyanID(),
    purpose: options.purpose || generateVisitPurpose(),
    visit_date: options.visit_date || generateRealisticTimestamp('upcoming'),
    duration_hours: options.duration_hours || Math.floor(Math.random() * 4) + 1,
    status: options.status || 'invited',
    ...options
  };
}

// Export all functions
export default {
  kenyanDataPatterns,
  generateKenyanName,
  generateKenyanPhone,
  generateKenyanID,
  generateNairobiAddress,
  generateRealisticTimestamp,
  generateBusinessHoursTimestamp,
  generateVisitPurpose,
  generateEmail,
  generateRealisticUser,
  generateRealisticVisitor
};
