import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';

/**
 * Get Estate Settings
 */
const getSettings = async (req, res) => {
    try {
        const estateId = req.user.estate_id;
        if (!estateId) return respondError(res, 400, 'Estate context required');

        const result = await dbManager.query(
            'SELECT settings FROM estate_locations WHERE estate_id = $1',
            [estateId]
        );

        const settings = result.rows[0]?.settings || {};
        respond(res, { data: settings });
    } catch (error) {
        respondError(res, 500, 'Failed to retrieve settings');
    }
};

/**
 * Update Estate Settings
 * Handles general, security, email, appearance updates
 */
const updateSettings = async (req, res) => {
    try {
        const estateId = req.user.estate_id;
        if (!estateId) return respondError(res, 400, 'Estate context required');

        const newSettings = req.body;

        // Merge with existing settings to prevent data loss
        // Security: Validate allowed keys if necessary, but JSONB allows flexibility

        // Using jsonb_set or || operator for merging if partial update needed, 
        // but typically settings UI sends the whole section or we merge in code.
        // For simplicity, we fetch, merge, and save, or use jsonb concatenation in SQL.

        // Better approach: Deep merge in SQL or fetch-merge-save. 
        // Let's use SQL merge for concurrency safety on top-level keys.
        // UPDATE estate_locations SET settings = settings || $1 ...

        await dbManager.query(
            `UPDATE estate_locations 
       SET settings = CASE 
          WHEN settings IS NULL THEN $1::jsonb 
          ELSE settings || $1::jsonb 
       END,
       updated_at = NOW()
       WHERE estate_id = $2`,
            [JSON.stringify(newSettings), estateId]
        );

        await req.audit?.('admin.settings.update', 'estate', String(estateId), {
            outcome: 'success',
            message: 'Updated estate settings'
        });

        respond(res, { message: 'Settings updated successfully' });
    } catch (error) {
        await req.audit?.('admin.settings.update', 'estate', String(req.user.estate_id), {
            outcome: 'fail',
            error: error.message
        });
        respondError(res, 500, 'Failed to update settings');
    }
};

/**
 * Update Compliance Settings (DPO, ODPC)
 */
const updateCompliance = async (req, res) => {
    try {
        const estateId = req.user.estate_id;
        if (!estateId) return respondError(res, 400, 'Estate context required');

        const { section } = req.params; // 'dpo' or 'odpc'
        const complianceData = req.body;

        const updateObject = {};
        updateObject[section] = complianceData;

        await dbManager.query(
            `UPDATE estate_locations 
       SET settings = CASE 
          WHEN settings IS NULL THEN $1::jsonb 
          ELSE settings || $1::jsonb 
       END,
       updated_at = NOW()
       WHERE estate_id = $2`,
            [JSON.stringify(updateObject), estateId]
        );

        await req.audit?.(`admin.compliance.${section}`, 'estate', String(estateId), {
            outcome: 'success',
            message: `Updated ${section} compliance settings`
        });

        respond(res, { message: 'Compliance settings saved' });

    } catch (error) {
        respondError(res, 500, 'Failed to update compliance settings');
    }
};

/**
 * Trigger Compliance Review Mock
 */
const runComplianceReview = async (req, res) => {
    // Mock helper
    respond(res, { message: 'Compliance review initiated. Report will be generated.' });
};

export { getSettings, updateSettings, updateCompliance, runComplianceReview };
