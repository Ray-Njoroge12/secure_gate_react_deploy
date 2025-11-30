-- Migration: Add Swahili (Kiswahili) notification templates
-- Phase V3: Multi-Language Support
-- Date: November 20, 2025

-- =============================================
-- Swahili Templates (Language code: 'sw')
-- =============================================

-- 1. Visitor Invite Created (Email - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, html_body, variables, category, description)
VALUES (
  'visitor_invite_created',
  'email',
  'sw',
  'Mwaliko Wako wa Kutembelea {{estate_name}}',
  'Habari {{visitor_name}},

Umealiwa kutembelea {{estate_name}} na {{resident_name}}.

Maelezo ya Ziara:
- Tarehe: {{date_of_visit}}
- Saa: {{time_of_visit}}
- Sababu: {{purpose}}

Pata pasi yako ya kidijitali: {{invite_link}}

Onyesha nambari ya QR kwa askari unapofika.

Shukrani,
Usalama wa {{estate_name}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
      <h1>🎫 Mwaliko wa Ziara</h1>
    </div>
    <div style="padding: 30px;">
      <p>Habari <strong>{{visitor_name}}</strong>,</p>
      <p>Umealiwa kutembelea <strong>{{estate_name}}</strong> na <strong>{{resident_name}}</strong>.</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Maelezo ya Ziara</h3>
        <p><strong>Tarehe:</strong> {{date_of_visit}}</p>
        <p><strong>Saa:</strong> {{time_of_visit}}</p>
        <p><strong>Sababu:</strong> {{purpose}}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{invite_link}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Angalia Pasi Yako ya Kidijitali</a>
      </div>
      
      <p style="color: #6b7280;">Onyesha nambari ya QR kwa askari unapofika.</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
      <p>© {{estate_name}} - Inaendeshwa na Secure Gate</p>
    </div>
  </body></html>',
  '["visitor_name", "estate_name", "resident_name", "date_of_visit", "time_of_visit", "purpose", "invite_link"]',
  'visitor',
  'Sent when a new visitor invite is created (Swahili)'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 2. Visitor Invite Created (SMS - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category, description)
VALUES (
  'visitor_invite_created',
  'sms',
  'sw',
  'Habari {{visitor_name}}! Umealiwa {{estate_name}} tarehe {{date_of_visit}} saa {{time_of_visit}}. Pasi yako: {{invite_link}}',
  '["visitor_name", "estate_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor',
  'SMS sent when visitor invite is created (Swahili)'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 3. Visit Approved (Email - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, html_body, variables, category)
VALUES (
  'visit_approved',
  'email',
  'sw',
  'Ziara Yako kwa {{estate_name}} Imeidhinishwa',
  'Habari {{visitor_name}},

Habari njema! Ziara yako kwa {{estate_name}} imeidhinishwa na {{resident_name}}.

Sasa unaweza kuendelea kwa lango tarehe {{date_of_visit}} saa {{time_of_visit}}.

Angalia pasi yako ya kidijitali: {{invite_link}}

Shukrani,
Usalama wa {{estate_name}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #10b981; color: white; padding: 30px; text-align: center;">
      <h1>✅ Ziara Imeidhinishwa!</h1>
    </div>
    <div style="padding: 30px;">
      <p>Habari <strong>{{visitor_name}}</strong>,</p>
      <p>Habari njema! Ziara yako kwa <strong>{{estate_name}}</strong> imeidhinishwa na <strong>{{resident_name}}</strong>.</p>
      
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
        <p style="margin: 0; color: #065f46;"><strong>Unaweza kuendelea kwa lango</strong></p>
        <p style="margin: 5px 0 0 0; color: #065f46;">{{date_of_visit}} saa {{time_of_visit}}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{invite_link}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Angalia Pasi</a>
      </div>
    </div>
  </body></html>',
  '["visitor_name", "estate_name", "resident_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 4. Visit Approved (SMS - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category)
VALUES (
  'visit_approved',
  'sms',
  'sw',
  '✅ Ziara yako kwa {{estate_name}} IMEIDHINISHWA! Endelea kwa lango tarehe {{date_of_visit}} saa {{time_of_visit}}. Pasi: {{invite_link}}',
  '["estate_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 5. Visit Reminder (SMS - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category)
VALUES (
  'visit_reminder',
  'sms',
  'sw',
  'Kumbusho: Ziara yako kwa {{estate_name}} ni kesho ({{date_of_visit}}) saa {{time_of_visit}}. Pasi: {{invite_link}}',
  '["estate_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 6. Visitor Checked In (Email to Resident - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, variables, category)
VALUES (
  'visitor_checked_in',
  'email',
  'sw',
  '{{visitor_name}} Amefika',
  'Habari {{resident_name}},

Mgeni wako {{visitor_name}} amefika kwenye lango.

Saa: {{check_in_time}}
Lango: {{gate_name}}

Shukrani,
Usalama wa {{estate_name}}',
  '["resident_name", "visitor_name", "check_in_time", "gate_name", "estate_name"]',
  'resident'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 7. Visit Rejected (Email - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, html_body, variables, category)
VALUES (
  'visit_rejected',
  'email',
  'sw',
  'Ziara Yako kwa {{estate_name}} Haikuidhinishwa',
  'Habari {{visitor_name}},

Tunasuasua kwa kukujulisha kwamba ziara yako kwa {{estate_name}} haiku idhinishwa.

Tafadhali wasiliana na {{resident_name}} kwa maelezo zaidi.

Shukrani,
Usalama wa {{estate_name}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #ef4444; color: white; padding: 30px; text-align: center;">
      <h1>❌ Ziara Haikuidhinishwa</h1>
    </div>
    <div style="padding: 30px;">
      <p>Habari <strong>{{visitor_name}}</strong>,</p>
      <p>Tunasikitika kwa kukujulisha kwamba ziara yako kwa <strong>{{estate_name}}</strong> haikuidhinishwa.</p>
      
      <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ef4444;">
        <p style="margin: 0; color: #991b1b;">Tafadhali wasiliana na <strong>{{resident_name}}</strong> kwa maelezo zaidi.</p>
      </div>
    </div>
  </body></html>',
  '["visitor_name", "estate_name", "resident_name"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 8. Visit Rejected (SMS - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category)
VALUES (
  'visit_rejected',
  'sms',
  'sw',
  'Tunasikitika. Ziara yako kwa {{estate_name}} haikuidhinishwa. Wasiliana na {{resident_name}} kwa maelezo.',
  '["estate_name", "resident_name"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 9. Visitor Checked Out (Email to Resident - Swahili)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, variables, category)
VALUES (
  'visitor_checked_out',
  'email',
  'sw',
  '{{visitor_name}} Ameondoka',
  'Habari {{resident_name}},

Mgeni wako {{visitor_name}} ameondoka.

Saa ya Kuondoka: {{check_out_time}}
Lango: {{gate_name}}

Shukrani,
Usalama wa {{estate_name}}',
  '["resident_name", "visitor_name", "check_out_time", "gate_name", "estate_name"]',
  'resident'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- Verification query
-- SELECT template_name, template_type, language, description
-- FROM notification_templates
-- WHERE language = 'sw'
-- ORDER BY template_name, template_type;

-- Total templates count
-- SELECT language, COUNT(*) as template_count
-- FROM notification_templates
-- GROUP BY language;
