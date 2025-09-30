import React, { useState } from 'react';

export default function SettingsNotifications() {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  return (
    <div>
      <h2>Notification Settings</h2>
      <label><input type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)} /> Email notifications</label>
      <br />
      <label><input type="checkbox" checked={sms} onChange={e=>setSms(e.target.checked)} /> SMS notifications</label>
      <div style={{marginTop:8}}><button disabled>Save (wire to /api/users/profile)</button></div>
    </div>
  );
}
