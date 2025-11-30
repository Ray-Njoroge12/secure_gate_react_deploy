/**
 * @file LegalConsentFlow.jsx
 * @description Kenya DPA 2019 compliant consent flow
 * Phase V5: Multi-Language & Legal Compliance
 * 
 * Implements:
 * - Article 31 (Consent)
 * - Article 34 (Transparency)
 * - Clear consent language
 * - Withdrawal mechanism
 */

import React, { useState } from 'react';
import { useLanguage } from './LanguageSelector';
import './LegalConsentFlow.css';

const LegalConsentFlow = ({ onComplete, onCancel }) => {
  const { t, language } = useLanguage();
  const [consents, setConsents] = useState({
    dataProcessing: false,
    cameraRecording: false,
    dataSharing: false,
    marketing: false // Optional
  });
  const [showDetails, setShowDetails] = useState({});

  const consentItems = {
    en: [
      {
        id: 'dataProcessing',
        required: true,
        title: 'Personal Data Processing',
        summary: 'We process your name, phone, email, and photo for security purposes.',
        details: `Your personal data (name, phone number, email, photograph) will be processed by Secure Gate Estate for the following purposes:
        
• Visitor identification and access control
• Security monitoring and incident response
• Communication regarding your visit
• Compliance with legal obligations

Your data will be stored for 90 days after your visit and then automatically deleted unless required for legal or security reasons.

You have the right to:
• Access your data
• Request corrections
• Request deletion
• Withdraw consent (subject to legal requirements)
• File a complaint with the Office of the Data Protection Commissioner`
      },
      {
        id: 'cameraRecording',
        required: true,
        title: 'CCTV and Camera Recording',
        summary: 'Security cameras record all entry and exit points.',
        details: `CCTV cameras are in operation throughout the estate for security purposes. Your image will be recorded when you:

• Enter and exit the premises
• Move through common areas
• Interact with security personnel

Recordings are stored for 30 days for security and legal purposes. Access to recordings is restricted to authorized security personnel and may be shared with law enforcement if required.`
      },
      {
        id: 'dataSharing',
        required: true,
        title: 'Data Sharing with Resident',
        summary: 'Your visit details will be shared with the resident you are visiting.',
        details: `The following information will be shared with the resident you are visiting:

• Your name
• Your contact information
• Date and time of visit
• Purpose of visit
• Vehicle information (if provided)

The resident may use this information to verify your visit. We do not control how the resident uses this data once shared.`
      },
      {
        id: 'marketing',
        required: false,
        title: 'Marketing Communications (Optional)',
        summary: 'Receive updates about estate services and events.',
        details: `If you consent, we may send you:

• Estate newsletters
• Event invitations
• Service updates
• Special offers from estate partners

You can unsubscribe at any time by clicking the unsubscribe link in any email or contacting us directly.`
      }
    ],
    sw: [
      {
        id: 'dataProcessing',
        required: true,
        title: 'Usindikaji wa Data Binafsi',
        summary: 'Tunasindika jina, simu, barua pepe, na picha yako kwa usalama.',
        details: `Data yako binafsi (jina, nambari ya simu, barua pepe, picha) itasindikwa na Secure Gate Estate kwa madhumuni yafuatayo:

• Utambulisho wa mgeni na udhibiti wa upatikanaji
• Ufuatiliaji wa usalama na majibu ya matukio
• Mawasiliano kuhusu ziara yako
• Uzingatiaji wa majukumu ya kisheria

Data yako itahifadhiwa kwa siku 90 baada ya ziara yako na kisha itafutwa kiotomatiki isipokuwa inahitajika kwa sababu za kisheria au usalama.

Una haki ya:
• Kufikia data yako
• Kuomba marekebisho
• Kuomba ufutaji
• Kuondoa idhini (kulingana na mahitaji ya kisheria)
• Kufungua malalamiko kwa Ofisi ya Msimamizi wa Ulinzi wa Data`
      },
      {
        id: 'cameraRecording',
        required: true,
        title: 'CCTV na Kurekodi kwa Kamera',
        summary: 'Kamera za usalama zinarekodi maeneo yote ya kuingia na kutoka.',
        details: `Kamera za CCTV zinafanya kazi katika eneo lote kwa madhumuni ya usalama. Picha yako itarekodiwa unapo:

• Kuingia na kutoka kwenye mali
• Kusonga kupitia maeneo ya pamoja
• Kuingiliana na wafanyakazi wa usalama

Rekodi zinahifadhiwa kwa siku 30 kwa madhumuni ya usalama na kisheria. Upatikanaji wa rekodi umezuiliwa kwa wafanyakazi wa usalama walioruhusiwa na unaweza kushirikiwa na wakuu wa sheria ikiwa inahitajika.`
      },
      {
        id: 'dataSharing',
        required: true,
        title: 'Kushiriki Data na Mkazi',
        summary: 'Maelezo ya ziara yako yatashirikiwa na mkazi unayemtembelea.',
        details: `Maelezo yafuatayo yatashirikiwa na mkazi unayemtembelea:

• Jina lako
• Maelezo ya mawasiliano yako
• Tarehe na saa ya ziara
• Madhumuni ya ziara
• Maelezo ya gari (ikiwa yametolewa)

Mkazi anaweza kutumia maelezo haya kuthibitisha ziara yako. Hatudhibiti jinsi mkazi anavyotumia data hii ikishashirikiwa.`
      },
      {
        id: 'marketing',
        required: false,
        title: 'Mawasiliano ya Masoko (Si lazima)',
        summary: 'Pokea masasisho kuhusu huduma na matukio ya eneo.',
        details: `Ukikubali, tunaweza kukutumia:

• Habari za eneo
• Mialiko ya matukio
• Masasisho ya huduma
• Matoleo maalum kutoka kwa washirika wa eneo

Unaweza kujiondoa wakati wowote kwa kubofya kiungo cha kujiondoa katika barua pepe yoyote au kuwasiliana nasi moja kwa moja.`
      }
    ]
  };

  const items = consentItems[language] || consentItems.en;

  const handleConsentChange = (id, value) => {
    setConsents(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const toggleDetails = (id) => {
    setShowDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const allRequiredConsentsGiven = () => {
    return items
      .filter(item => item.required)
      .every(item => consents[item.id]);
  };

  const handleSubmit = () => {
    if (!allRequiredConsentsGiven()) {
      alert(language === 'en' ? 
        'Please provide all required consents' : 
        'Tafadhali toa idhini zote zinazohitajika');
      return;
    }

    const consentData = {
      consents,
      timestamp: new Date().toISOString(),
      language,
      ipAddress: null, // Will be captured server-side
      version: '1.0'
    };

    onComplete(consentData);
  };

  return (
    <div className="legal-consent-flow">
      <div className="consent-header">
        <h2>
          {language === 'en' ? 
            'Privacy & Data Processing Consent' : 
            'Faragha na Idhini ya Usindikaji wa Data'}
        </h2>
        <p className="consent-subtitle">
          {language === 'en' ? 
            'In compliance with the Kenya Data Protection Act, 2019' : 
            'Kulingana na Sheria ya Ulinzi wa Data ya Kenya, 2019'}
        </p>
      </div>

      <div className="consent-items">
        {items.map((item) => (
          <div key={item.id} className="consent-item">
            <div className="consent-item-header">
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={consents[item.id] || false}
                  onChange={(e) => handleConsentChange(item.id, e.target.checked)}
                />
                <span className="checkbox-label">
                  {item.title}
                  {item.required && <span className="required-badge">
                    {language === 'en' ? 'Required' : 'Inahitajika'}
                  </span>}
                </span>
              </label>
              
              <button
                className="details-toggle"
                onClick={() => toggleDetails(item.id)}
                type="button"
              >
                {showDetails[item.id] ? '▼' : '▶'} 
                {language === 'en' ? 'Details' : 'Maelezo'}
              </button>
            </div>

            <p className="consent-summary">{item.summary}</p>

            {showDetails[item.id] && (
              <div className="consent-details">
                <div className="details-content">
                  {item.details.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="consent-footer">
        <div className="consent-notice">
          <p>
            {language === 'en' ? 
              'By clicking "I Accept", you confirm that you have read and understood the above consents and agree to the processing of your personal data as described.' :
              'Kwa kubofya "Ninakubali", unathibitisha kwamba umesoma na kuelewa idhini zilizo hapo juu na unakubali usindikaji wa data yako binafsi kama ilivyoelezwa.'}
          </p>
        </div>

        <div className="consent-actions">
          <button
            className="btn-cancel"
            onClick={onCancel}
            type="button"
          >
            {language === 'en' ? 'Cancel' : 'Ghairi'}
          </button>
          
          <button
            className="btn-accept"
            onClick={handleSubmit}
            disabled={!allRequiredConsentsGiven()}
            type="button"
          >
            {language === 'en' ? 'I Accept' : 'Ninakubali'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalConsentFlow;
