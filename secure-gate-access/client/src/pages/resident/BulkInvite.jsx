import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bulkInvite } from "../../services/visitorService";
import { useError } from "../../contexts/ErrorContext";
import { useLoading } from "../../contexts/LoadingContext";
import { Button, Input, Card, PageHeader } from "../../components/ui";
import AppShell from "../../layouts/AppShell";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import phoneValidator from "../../utils/phoneValidator";
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
  const [currentStep, setCurrentStep] = useState(1); 
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);
  const fileInputRef = React.createRef(null);
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  const role = useCurrentRole();
  
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

  const emailOk = (v) => /\S+@\S+\.\S+/.test((v || "").trim());
  const phoneOk = (v) => !v || !phoneValidator.getErrorMessage((v || "").trim(), "KE");

  const parseCsv = useCallback((text) => {
    const MAX = 50;
    const lines = (text || "").split(/\r?\n/).filter(l => l.trim().length > 0);
    
    if (lines.length === 0) {
      setParsedGuests([]);
      setParsedData([]);
      setSelectedRows([]);
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
        const phoneError = phoneValidator.getErrorMessage(phone, "KE") || "Invalid phone number";
        errors.push({ index: i - startIndex + 1, message: `${phoneError}: ${phone}` });
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
    setParsedData(finalGuests.map((g, idx) => ({
      id: idx + 1,
      name: g.name,
      email: g.email,
      phone: g.phone,
      hasError: false
    })));
    setSelectedRows(finalGuests.map((_, idx) => idx + 1));
    setCsvErrors(errors);
    setCsvInfo(info);
    setFormData(prev => ({ 
      ...prev, 
      numGuests: finalGuests.length > 0 ? finalGuests.length : prev.numGuests 
    }));
  }, []);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result || "");
        setCsvText(text);
        parseCsv(text);
      };
      reader.readAsText(uploadedFile);
    }
  };

  const handleCsvFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFile(file);
    
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

  const handleSubmit = async () => {
    const selectedData = parsedData.filter(v => selectedRows.includes(v.id));
    
    if (selectedData.length === 0) {
      handleError('Please select at least one visitor to invite');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    clearAllErrors();
    setCurrentStep(3); 

    try {
      setLoading('bulkInvite', true, { message: 'Processing invitations...' });
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await bulkInvite({
        eventName: formData.eventName,
        date: formData.date,
        time: formData.time,
        numGuests: formData.numGuests,
        guests: selectedData.map(({ name, email, phone }) => ({ name, email, phone }))
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSuccess(true);
      setTimeout(() => {
        navigate('/resident/visitor-history');
      }, 3000);
    } catch (err) {
      handleApiError(err, 'Bulk Invite');
      setCurrentStep(2); 
    } finally {
      setIsUploading(false);
      setLoading('bulkInvite', false);
    }
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    const validRows = parsedData.filter(d => !d.hasError).map(d => d.id);
    setSelectedRows(prev => 
      prev.length === validRows.length ? [] : validRows
    );
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6 md:mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base
            ${currentStep >= step 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-500 dark:text-gray-300'}
          `}>
            {currentStep > step ? '✓' : step}
          </div>
          {step < 3 && (
            <div className={`w-12 md:w-20 h-1 mx-2 ${
              currentStep > step ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

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
    setSuccess(null);
    clearAllErrors();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const stepSubtitles = {
    1: 'Upload your visitor list',
    2: 'Review and confirm visitors',
    3: 'Sending invitations...'
  };

  return (
    <AppShell role={role}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader 
        title="Bulk Invite"
        subtitle={stepSubtitles[currentStep]}
        icon={<Users className="w-6 h-6 text-green-600" />}
        showBack={true}
        backTo="/dashboard/resident"
      />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
      {/* PHASE B3: Step Indicator */}
      <StepIndicator />

      {/* Step 1: Upload CSV */}
      {currentStep === 1 && (
        <Card>
          <Card.Header className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 border-b border-blue-200 dark:border-slate-600">
            <Card.Title className="flex items-center text-blue-900 dark:text-blue-100">
              <span className="text-2xl mr-3">📁</span>
              Step 1: Upload CSV File
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-6">
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFile}
                  disabled={isLoading('bulkInvite')}
                  className="block w-full text-sm text-gray-600 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-blue-300 cursor-pointer"
                />
                
                <textarea
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCsv(e.target.value);
                  }}
                  placeholder={`Paste CSV here (headers optional)\nname,email,phone\nJohn Doe,john@example.com,0712345678`}
                  rows={6}
                  disabled={isLoading('bulkInvite')}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                
                <p className="text-xs text-gray-600 dark:text-gray-200 bg-blue-50 dark:bg-slate-800/50 p-3 rounded-lg border border-blue-200 dark:border-slate-700">
                  📄 <strong>Required columns:</strong> name, email. Phone optional (format 0xxxxxxxxx).<br/>
                  ⚠️ Duplicates by email are removed. Max 50 guests.
                </p>
              </div>
            </div>

            {/* Show parsed data count */}
            {parsedData.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-300 font-medium">
                  ✅ Found {parsedData.length} visitor{parsedData.length !== 1 ? 's' : ''} in your CSV
                </p>
                <Button 
                  className="mt-3 w-full md:w-auto"
                  onClick={() => setCurrentStep(2)}
                >
                  Review Visitors →
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Step 2: Review & Select */}
      {currentStep === 2 && (
        <Card>
          <Card.Header className="bg-gradient-to-r from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 border-b border-green-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <Card.Title className="flex items-center text-green-900 dark:text-green-100">
                <span className="text-2xl mr-3">👥</span>
                Step 2: Review Visitors
              </Card.Title>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selectedRows.length === parsedData.filter(d => !d.hasError).length}
                  onChange={toggleAllSelection}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <label htmlFor="selectAll" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Select All
                </label>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {parsedData.map((visitor) => (
                <div 
                  key={visitor.id}
                  className={`p-3 md:p-4 border rounded-lg ${
                    visitor.hasError 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                      : selectedRows.includes(visitor.id)
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                      : 'border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!visitor.hasError && (
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(visitor.id)}
                        onChange={() => toggleRowSelection(visitor.id)}
                        className="w-5 h-5 mt-0.5 text-green-600 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{visitor.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                        📱 {visitor.phone}
                        {visitor.email && ` • ✉️ ${visitor.email}`}
                      </div>
                      {visitor.date && (
                        <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                          📅 {visitor.date}
                        </div>
                      )}
                      {visitor.hasError && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                          ⚠️ Missing required information
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col md:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="md:flex-1"
              >
                ← Back to Upload
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedRows.length === 0 || isUploading}
                className="md:flex-1"
              >
                Send {selectedRows.length} Invitation{selectedRows.length !== 1 ? 's' : ''} →
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {currentStep === 3 && (
        <Card>
          <Card.Header className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 border-b border-purple-200 dark:border-slate-600">
            <Card.Title className="flex items-center text-purple-900 dark:text-purple-100">
              <span className="text-2xl mr-3">🚀</span>
              Step 3: Sending Invitations
            </Card.Title>
          </Card.Header>
          <Card.Content className="py-8">
            {isUploading ? (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Processing your invitations...
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-200">
                  {uploadProgress}% complete
                </p>
              </div>
            ) : success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  All invitations sent successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-200 mb-6">
                  Your visitors will receive their invitation details via SMS/email
                </p>
                <div className="flex flex-col md:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/resident/visitor-history')}
                    className="md:w-auto"
                  >
                    View Visitor History
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setParsedData([]);
                      setErrors([]);
                      setSuccess(false);
                      setCurrentStep(1);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="md:w-auto"
                  >
                    Upload Another File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-200">Preparing to send invitations...</p>
              </div>
            )}
          </Card.Content>
        </Card>
      )}
      {/* Error and Success messages are now handled by ErrorContext */}
      </div>
      </div>
    </AppShell>
  );
};

export default BulkInvite;

