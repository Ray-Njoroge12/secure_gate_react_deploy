
const SuperAdminValidator = require('./super-admin-validator.js');

describe('Super Admin Functionality Validator', () => {
    test('should validate all super admin functionalities', async () => {
        const validator = new SuperAdminValidator({ verbose: true });
        const results = await validator.validateSuperAdminFunctionality();

        if (!results.success) {
            console.error('Validation Errors:', JSON.stringify(results.summary.details.filter(d => !d.success), null, 2));
        }

        expect(results.success).toBe(true);
    }, 60000); // 60s timeout
});
