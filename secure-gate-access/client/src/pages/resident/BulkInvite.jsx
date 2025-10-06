import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { bulkInvite } from "../../services/visitorService";
import { handleApiError } from "../../utils/errorMapper";
import { Button, Input, Card, Badge, ErrorDisplay, SuccessDisplay } from "../../components/ui";
import { 
  Users, 
  Calendar, 
  Clock, 
  Upload, 
  FileText, 
  Copy,
  CheckCircle,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";

const BulkInvite = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    eventName: "",
    date: "",
    time: "",
    numGuests: 5
  });
  const [csvText, setCsvText] = useState("");
  const [parsedGuests, setParsedGuests] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvInfo, setCsvInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const emailOk = (v) => /\S+@\S+\.\S+/.test((v || "").trim());
  const phoneOk = (v) => !v || /^0\d{9}$/.test((v || "").trim());

  const parseCsv = useCallback((text) => {
    const MAX = 50;
    const lines = (text || "").split(/\r?\n/).filter(l => l.trim().length > 0);
    
    if (lines.length === 0) {
      setParsedGuests([]);
      setCsvErrors([]);
      setCsvInfo("");
      setFormData(prev => ({ ...prev, numGuests: 5 }));
      return;
    }

    // Detect header
    const headerCells = lines[0].split(",").map(c => c.trim().toLowerCase());
    let startIndex = 0;
    let idxName = -1, idxEmail = -1, idxPhone = -1;
    
    if (["name", "email", "phone"].some(h => headerCells.includes(h))) {
      idxName = headerCells.indexOf("name");
      idxEmail = headerCells.indexOf("email");
      idxPhone = headerCells.indexOf("phone");
      startIndex = 1;
    }

    const errors = [];
    const seen = new Set();
    const guests = [];

    for (let i = startIndex; i < lines.length; i++) {
      const row = lines[i];
      const cells = row.split(",");
      let name = idxName >= 0 ? cells[idxName] : cells[0];
      let email = idxEmail >= 0 ? cells[idxEmail] : (cells[1] || "");
      let phone = idxPhone >= 0 ? cells[idxPhone] : (cells[2] || "");
      
      name = (name || "").trim();
      email = (email || "").trim();
      phone = (phone || "").trim();

      if (!name || !email) {
        errors.push({ index: i - startIndex + 1, message: "Missing required fields: name and email" });
        continue;
      }
      
      if (!emailOk(email)) {
        errors.push({ index: i - startIndex + 1, message: `Invalid email: ${email}` });
        continue;
      }
      
      if (!phoneOk(phone)) {
        errors.push({ index: i - startIndex + 1, message: `Invalid phone (expected 0xxxxxxxxx): ${phone}` });
        continue;
      }
      
      const key = email.toLowerCase();
      if (seen.has(key)) {
        errors.push({ index: i - startIndex + 1, message: `Duplicate email ignored: ${email}` });
        continue;
      }
      
      seen.add(key);
      guests.push({ name, email, phone });
    }

    let info = "";
    if (guests.length > MAX) {
      info = `Note: Trimmed ${guests.length - MAX} guests to the maximum of ${MAX}.`;
    }
    
    const finalGuests = guests.slice(0, MAX);
    setParsedGuests(finalGuests);
    setCsvErrors(errors);
    setCsvInfo(info);
    setFormData(prev => ({ 
      ...prev, 
      numGuests: finalGuests.length > 0 ? finalGuests.length : prev.numGuests 
    }));
  }, []);

  const handleCsvFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.eventName.trim()) {
      errors.eventName = "Event name is required";
    }
    
    if (!formData.date.trim()) {
      errors.date = "Date is required";
    }
    
    if (!formData.time.trim()) {
      errors.time = "Time is required";
    }
    
    if (!formData.numGuests || formData.numGuests < 1) {
      errors.numGuests = "Number of guests must be at least 1";
    }
    
    if (csvText.trim().length > 0 && parsedGuests.length === 0) {
      errors.csv = "CSV provided but no valid guests found";
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setError("Please fix the validation errors below");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const numGuests = csvText.trim().length > 0 ? parsedGuests.length : formData.numGuests;
      
      const result = await bulkInvite({
        eventName: formData.eventName.trim(),
        date: formData.date.trim(),
        time: formData.time.trim(),
        numGuests
      });

      setSuccess({
        message: 'Bulk invitation created successfully!',
        data: result
      });

      // Reset form after success
      setTimeout(() => {
        setFormData({
          eventName: "",
          date: "",
          time: "",
          numGuests: 5
        });
        setCsvText("");
        setParsedGuests([]);
        setCsvErrors([]);
        setCsvInfo("");
        setSuccess(null);
      }, 10000);

    } catch (err) {
      const errorMessage = handleApiError(err, 'Bulk invitation creation');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      eventName: "",
      date: "",
      time: "",
      numGuests: 5
    });
    setCsvText("");
    setParsedGuests([]);
    setCsvErrors([]);
    setCsvInfo("");
    setError("");
    setSuccess(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/resident')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Bulk Invite</h1>
              <p className="text-slate-400">Create invitations for multiple guests at once</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <Card.Content className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Event Details
                  </h3>
                  
                  <Input
                    label="Event Name"
                    placeholder="e.g., Birthday Party, Company Meeting"
                    value={formData.eventName}
                    onChange={(e) => handleInputChange('eventName', e.target.value)}
                    disabled={loading}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      disabled={loading}
                      required
                      icon={<Calendar className="w-4 h-4" />}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    
                    <Input
                      label="Time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      disabled={loading}
                      required
                      icon={<Clock className="w-4 h-4" />}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  
                  <Input
                    label="Number of Guests"
                    type="number"
                    min="1"
                    max="50"
                    value={csvText.trim() ? parsedGuests.length : formData.numGuests}
                    onChange={(e) => handleInputChange('numGuests', Number(e.target.value))}
                    disabled={loading || csvText.trim().length > 0}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                {/* CSV Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Guest List (Optional)
                  </h3>
                  
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFile}
                      disabled={loading}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600"
                    />
                    
                    <textarea
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        parseCsv(e.target.value);
                      }}
                      placeholder={`Paste CSV here (headers optional)\nname,email,phone\nJohn Doe,john@example.com,0712345678`}
                      rows={6}
                      disabled={loading}
                      className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    
                    <p className="text-xs text-slate-400">
                      Required columns: name, email. Phone optional (format 0xxxxxxxxx).<br/>
                      Duplicates by email are removed. Max 50 guests.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    Clear Form
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Bulk Invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* Preview Section */}
          <div className="space-y-6">
            {/* Guest Preview */}
            {csvText.trim() && (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <Card.Content className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Guest Preview ({parsedGuests.length})
                  </h3>
                  
                  {csvInfo && (
                    <div className="bg-yellow-900/20 border border-yellow-600/30 text-yellow-300 p-3 rounded-lg mb-4 text-sm">
                      {csvInfo}
                    </div>
                  )}
                  
                  {parsedGuests.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {parsedGuests.map((guest, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{guest.name}</p>
                            <p className="text-slate-400 text-sm">{guest.email}</p>
                          </div>
                          <div className="text-slate-400 text-sm">
                            {guest.phone || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No valid guests parsed yet.</p>
                  )}
                  
                  {csvErrors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        CSV Issues ({csvErrors.length})
                      </h4>
                      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                        {csvErrors.map((err, i) => (
                          <p key={i} className="text-red-300 text-sm">
                            Row {err.index}: {err.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Content>
              </Card>
            )}

            {/* Success Display */}
            {success && (
              <Card className="bg-green-900/20 border-green-600/30">
                <Card.Content className="p-6">
                  <h3 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Invitation Created!
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white font-medium">{success.data.eventName || success.data.event_name}</p>
                      <p className="text-slate-400 text-sm">
                        {success.data.date} at {success.data.time} | Max Guests: {success.data.numGuests || success.data.num_guests}
                      </p>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-white font-medium mb-2">Share this link with your guests:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={success.data.inviteLink || success.data.invite_link}
                          readOnly
                          className="flex-1 text-xs bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          onClick={() => copyToClipboard(success.data.inviteLink || success.data.invite_link)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4 text-slate-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      <ErrorDisplay
        error={error}
        onClose={() => setError("")}
        type="error"
        title="Creation Failed"
      />
    </div>
  );
};

export default BulkInvite;