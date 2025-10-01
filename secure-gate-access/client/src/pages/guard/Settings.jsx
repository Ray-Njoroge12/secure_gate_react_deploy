import React, { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [profilePic, setProfilePic] = useState(null);
  const [notifications, setNotifications] = useState({ entryAlerts: true, exitAlerts: true, systemUpdates: false });

  const handleProfilePicChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setProfilePic(url);
      localStorage.setItem("profilePic", url);
      window.dispatchEvent(new Event("profilePicChanged"));
    }
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    localStorage.setItem("profileName", profile.name);
    localStorage.setItem("profileEmail", profile.email);
    localStorage.setItem("profilePhone", profile.phone);
    if (profilePic) {
      localStorage.setItem("profilePic", profilePic);
      window.dispatchEvent(new Event("profilePicChanged"));
    }
    alert("Profile updated!");
  };

  const handleNotificationsUpdate = (e) => {
    e.preventDefault();
    alert("Notifications updated!");
  };

  return (
    <div style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'70vh'}}>
      <div className="panel" style={{maxWidth:420, width:'100%', border:'2px solid var(--line)', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,0.12)', background:'var(--panel)', padding:'32px 24px', color:'var(--text)'}}>
        <div style={{display:'flex', justifyContent:'center', marginBottom:24, gap:12}}>
          <button
            type="button"
            className={"btn primary" + (activeTab === "profile" ? "" : " btn-green")}
            style={{background:'var(--accent)', color:'#052e16', minWidth:100, position:'static'}}
            onClick={()=>setActiveTab("profile")}
          >Profile</button>
          <button
            type="button"
            className={"btn primary" + (activeTab === "notifications" ? "" : " btn-green")}
            style={{background:'var(--accent)', color:'#052e16', minWidth:100, position:'static'}}
            onClick={()=>setActiveTab("notifications")}
          >Notifications</button>
          <button
            type="button"
            className={"btn primary" + (activeTab === "security" ? "" : " btn-green")}
            style={{background:'var(--accent)', color:'#052e16', minWidth:100, position:'static'}}
            onClick={()=>setActiveTab("security")}
          >Security</button>
        </div>
        {activeTab === "profile" && (
          <form onSubmit={handleProfileUpdate} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:16}}>
            <div style={{width:100, height:100, borderRadius:'50%', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', marginBottom:12, border:'2px solid var(--accent)'}}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} />
              ) : (
                <span style={{width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%'}}>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="var(--accent)" strokeWidth="2" fill="var(--bg)" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="var(--accent)" strokeWidth="2" fill="none" />
                  </svg>
                </span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleProfilePicChange} style={{marginBottom:12}} />
            <input className="input" placeholder="Name" value={profile.name} onChange={e=>setProfile({...profile, name:e.target.value})} style={{marginBottom:8, background:'var(--bg)', color:'var(--text)'}} />
            <input className="input" placeholder="Email" value={profile.email} onChange={e=>setProfile({...profile, email:e.target.value})} style={{marginBottom:8, background:'var(--bg)', color:'var(--text)'}} />
            <input className="input" placeholder="Phone" value={profile.phone} onChange={e=>setProfile({...profile, phone:e.target.value})} style={{marginBottom:8, background:'var(--bg)', color:'var(--text)'}} />
            <button className="btn primary" type="submit" style={{marginTop:16, width:'100%'}}>Save Profile</button>
          </form>
        )}
        {activeTab === "notifications" && (
          <form onSubmit={handleNotificationsUpdate} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:12}}>
            <label style={{width:'100%', textAlign:'left'}}><input type="checkbox" checked={notifications.entryAlerts} onChange={e=>setNotifications({...notifications, entryAlerts:e.target.checked})} /> Entry Alerts</label>
            <label style={{width:'100%', textAlign:'left'}}><input type="checkbox" checked={notifications.exitAlerts} onChange={e=>setNotifications({...notifications, exitAlerts:e.target.checked})} /> Exit Alerts</label>
            <label style={{width:'100%', textAlign:'left'}}><input type="checkbox" checked={notifications.systemUpdates} onChange={e=>setNotifications({...notifications, systemUpdates:e.target.checked})} /> System Updates</label>
            <button className="btn primary" type="submit" style={{marginTop:16, width:'100%'}}>Save Notifications</button>
          </form>
        )}
        {activeTab === "security" && (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:16}}>
            <h4 style={{marginBottom:8}}>Security Settings</h4>
            <label style={{width:'100%', textAlign:'left'}}><input type="checkbox" /> Enable Two-Factor Authentication (2FA)</label>
            <label style={{width:'100%', textAlign:'left'}}><input type="checkbox" /> Show Login History</label>
            <button className="btn primary" type="button" style={{marginTop:16, width:'100%'}} onClick={()=>alert('Security settings saved!')}>Save Security</button>
          </div>
        )}
      </div>
    </div>
  );
}