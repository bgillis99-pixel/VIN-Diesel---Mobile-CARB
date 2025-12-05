import React, { useState, useRef, useEffect } from 'react';
import { scoutTruckLead, parseRegistrationPhoto, SYSTEM_INSTRUCTION } from '../services/geminiService';
import { Lead, RegistrationData, Submission } from '../types';

const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DATABASE' | 'SCOUT' | 'LEADS' | 'REG OCR' | 'FINANCIALS' | 'ALERTS' | 'BRAIN' | 'INVITE'>('DATABASE');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scouting, setScouting] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const regInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Database / Submission State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLiveMonitor, setIsLiveMonitor] = useState(false);

  const [alertMessage, setAlertMessage] = useState('');

  // OCR Registration State
  const [processingReg, setProcessingReg] = useState(false);
  const [regData, setRegData] = useState<RegistrationData | null>(null);

  // Invite Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [prevCustomers, setPrevCustomers] = useState<Array<{name: string, phone: string, date: string}>>([]);

  useEffect(() => {
      const stored = localStorage.getItem('vin_diesel_customers');
      if (stored) setPrevCustomers(JSON.parse(stored));

      const loadSubmissions = () => {
          const subs = JSON.parse(localStorage.getItem('vin_diesel_submissions') || '[]');
          setSubmissions(subs);
      };
      loadSubmissions();
      
      // Auto-refresh for live monitor simulation
      const interval = setInterval(() => {
          if (activeTab === 'DATABASE') loadSubmissions();
      }, 5000);

      return () => clearInterval(interval);
  }, [activeTab]);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScouting(true);
    try {
        const lead = await scoutTruckLead(file);
        setCurrentLead(lead);
        setLeads(prev => [lead, ...prev]);
        setActiveTab('LEADS');
    } catch (err) {
        alert('Scout analysis failed.');
    } finally {
        setScouting(false);
    }
  };

  const handleRegCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setProcessingReg(true);
      setRegData(null);
      try {
          const data = await parseRegistrationPhoto(file);
          setRegData(data);
      } catch (err) {
          alert('Failed to process registration card. Please try again with better lighting.');
      } finally {
          setProcessingReg(false);
      }
  };

  const handleCreateEntity = () => {
      if(!regData) return;
      alert(`Entity Created for ${regData.ownerName}!\nVIN: ${regData.vin}\n(Simulation: Saved to Database)`);
      setRegData(null);
  };

  const handleBookTest = () => {
      if(!regData) return;
      alert(`Booking Smoke Test for:\n${regData.year} ${regData.make} ${regData.model}\nLocation: ${regData.address}\n\n(Simulation: Booking Confirmation Sent)`);
      setRegData(null);
  };

  const handleBroadcast = async () => {
      if (!alertMessage) return;
      
      if ('serviceWorker' in navigator && 'Notification' in window) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('CARB Compliance Alert', {
              body: alertMessage,
              icon: 'https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=icon&color=003366',
              vibrate: [200, 100, 200]
          } as any);
          alert("Broadcast sent to active subscribers (Simulation)");
          setAlertMessage('');
      } else {
          alert("Service Worker not supported.");
      }
  };
  
  // Google Calendar Link Generator
  const generateCalendarLink = (name: string) => {
      const title = encodeURIComponent(`Sent CARB App to ${name}`);
      const details = encodeURIComponent(`Sent app invite to ${name}. Follow up if no submission in 24 hours. https://carbcleantruckcheck.app`);
      const now = new Date();
      // Start time now, end time +15 min
      const start = now.toISOString().replace(/-|:|\.\d\d\d/g, "");
      now.setMinutes(now.getMinutes() + 15);
      const end = now.toISOString().replace(/-|:|\.\d\d\d/g, "");
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
  };

  const handleInvite = () => {
      if (!customerName || !customerPhone) return alert("Enter name and phone");
      
      const message = `Hi ${customerName}, here is the Mobile Carb Check app to scan your VINs and check compliance instantly: https://carbcleantruckcheck.app`;
      const encoded = encodeURIComponent(message);
      
      // Save customer
      const newCustomer = { name: customerName, phone: customerPhone, date: new Date().toLocaleString() };
      const updated = [newCustomer, ...prevCustomers];
      setPrevCustomers(updated);
      localStorage.setItem('vin_diesel_customers', JSON.stringify(updated));
      
      // Clear form
      setCustomerName('');
      setCustomerPhone('');
      
      // Open SMS
      window.location.href = `sms:${customerPhone}?body=${encoded}`;
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          const lines = text.split('\n');
          const newContacts: any[] = [];
          
          lines.forEach(line => {
              // Assume CSV format: Name,Phone
              const parts = line.split(',');
              if (parts.length >= 2) {
                  const name = parts[0].trim();
                  const phone = parts[1].trim();
                  if (name && phone) {
                      newContacts.push({
                          name, 
                          phone, 
                          date: new Date().toLocaleString() + ' (Imported)'
                      });
                  }
              }
          });

          if (newContacts.length > 0) {
              const updated = [...newContacts, ...prevCustomers];
              setPrevCustomers(updated);
              localStorage.setItem('vin_diesel_customers', JSON.stringify(updated));
              alert(`Successfully imported ${newContacts.length} contacts.`);
          } else {
              alert("No valid contacts found. Please ensure CSV format is: Name,Phone");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  const exportToCSV = () => {
      if (submissions.length === 0) return alert("No data to export.");
      
      const headers = ['Date/Time', 'Type', 'Summary', 'Coordinates (Lat,Lng)'];
      const rows = submissions.map(s => [
          s.dateStr,
          s.type,
          s.summary.replace(/,/g, ' '),
          s.coordinates ? `"${s.coordinates.lat}, ${s.coordinates.lng}"` : 'Unknown'
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," + 
          [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "carb_submissions.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const projections = [
      { year: 2026, trucks: 2500, testsPerYear: 2, totalTests: 5000, price: 130, revenue: 650000 },
      { year: 2027, trucks: 2700, testsPerYear: 4, totalTests: 10800, price: 135, revenue: 1458000 },
      { year: 2028, trucks: 2916, testsPerYear: 4, totalTests: 11664, price: 140, revenue: 1632960 },
      { year: 2029, trucks: 3150, testsPerYear: 4, totalTests: 12600, price: 145, revenue: 1827000 },
      { year: 2030, trucks: 3400, testsPerYear: 4, totalTests: 13600, price: 150, revenue: 2040000 },
  ];

  const syncToZapier = (lead: Lead) => {
      alert(`Syncing ${lead.companyName} to Zapier Webhook... \n(Simulation: Data sent to Google Sheets/CRM)`);
  };

  const TabButton = ({ id, label, icon }: { id: any, label: string, icon: string }) => (
      <button 
        className={`flex-1 p-3 font-bold text-sm whitespace-nowrap border-b-4 transition-colors ${activeTab === id ? 'text-[#003366] border-[#00A651] bg-white' : 'text-gray-500 border-transparent hover:bg-gray-50'}`} 
        onClick={() => setActiveTab(id)}
      >
          {icon} {label}
      </button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-[#003366] overflow-hidden mb-20 min-h-[80vh]">
        <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
            <div>
                <h2 className="font-bold text-xl tracking-widest">NORCAL SCOUT ADMIN</h2>
                <div className="flex items-center gap-2 mt-1">
                     <div className={`w-2 h-2 ${isLiveMonitor ? 'bg-red-500 animate-ping' : 'bg-[#00A651]'} rounded-full`}></div>
                     <span className="text-[10px] font-mono text-gray-300">{isLiveMonitor ? 'LIVE MONITOR ACTIVE' : 'SYSTEM READY v1.0'}</span>
                </div>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => setIsLiveMonitor(!isLiveMonitor)} className={`text-[10px] px-2 py-1 rounded font-bold border ${isLiveMonitor ? 'bg-red-600 border-red-400' : 'bg-transparent border-white/30'}`}>
                     {isLiveMonitor ? 'STOP MONITOR' : 'START MONITOR'}
                 </button>
                 <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">INTERNAL 1225</span>
            </div>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            <TabButton id="DATABASE" label="DATABASE" icon="📊" />
            <TabButton id="INVITE" label="INVITE" icon="✉️" />
            <TabButton id="SCOUT" label="SCOUT" icon="📷" />
            <TabButton id="REG OCR" label="OCR" icon="📄" />
            <TabButton id="LEADS" label="LEADS" icon="📋" />
            <TabButton id="BRAIN" label="BRAIN" icon="🧠" />
            <TabButton id="FINANCIALS" label="EMPIRE" icon="💰" />
            <TabButton id="ALERTS" label="ALERTS" icon="📢" />
        </div>

        <div className="p-4">
            {activeTab === 'DATABASE' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-[#003366]">Submission Log (Google Sheet Sync)</h3>
                        <div className="flex gap-2">
                            <button onClick={exportToCSV} className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded hover:bg-green-700 flex items-center gap-1">
                                <span>⬇️</span> CSV Export
                            </button>
                            <button className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1" onClick={() => alert("Connecting to Webhook... (Feature Placeholder)")}>
                                <span>⚡</span> Sync Webhook
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-100 text-gray-600 uppercase font-bold border-b border-gray-200">
                                <tr>
                                    <th className="p-3">Date/Time (Download)</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Summary</th>
                                    <th className="p-3">Location</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {submissions.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-400">No submissions found.</td></tr>
                                ) : (
                                    submissions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-gray-50">
                                            <td className="p-3 whitespace-nowrap text-gray-700 font-medium">{sub.dateStr}</td>
                                            <td className="p-3 font-bold">
                                                <span className={`px-2 py-1 rounded ${
                                                    sub.type === 'VIN_CHECK' ? 'bg-blue-100 text-blue-700' : 
                                                    sub.type === 'ENGINE_TAG' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {sub.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-3">{sub.summary}</td>
                                            <td className="p-3 font-mono">
                                                {sub.coordinates ? (
                                                    <a 
                                                        href={`https://maps.google.com/?q=${sub.coordinates.lat},${sub.coordinates.lng}`} 
                                                        target="_blank" 
                                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        📍 {sub.coordinates.lat.toFixed(4)}, {sub.coordinates.lng.toFixed(4)}
                                                    </a>
                                                ) : <span className="text-gray-400">N/A</span>}
                                            </td>
                                            <td className="p-3">
                                                <span className="text-green-600 font-bold">SAVED</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'INVITE' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Invite Form */}
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 h-full">
                            <h3 className="text-xl font-bold text-[#003366] mb-4">Invite New Customer</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Customer Name</label>
                                    <input 
                                        type="text" 
                                        value={customerName} 
                                        onChange={e => setCustomerName(e.target.value)} 
                                        placeholder="e.g. John Smith"
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={customerPhone} 
                                        onChange={e => setCustomerPhone(e.target.value)} 
                                        placeholder="e.g. 555-123-4567"
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handleInvite} className="py-4 bg-[#003366] text-white font-bold rounded-xl hover:bg-[#002244] shadow-lg flex items-center justify-center gap-2">
                                        <span>📱 SEND TEXT</span>
                                    </button>
                                    {customerName && (
                                        <a 
                                            href={generateCalendarLink(customerName)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="py-4 bg-white border-2 border-[#003366] text-[#003366] font-bold rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2"
                                        >
                                            <span>📅 CALENDAR</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Admin Toolbox */}
                        <div className="space-y-4 flex flex-col">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
                                <h3 className="font-bold text-[#003366] mb-3">Admin Google Workspace</h3>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <a href="https://mail.google.com" target="_blank" className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center">
                                        <span className="text-2xl mb-1">📧</span>
                                        <span className="text-[10px] font-bold">Gmail</span>
                                    </a>
                                    <a href="https://calendar.google.com" target="_blank" className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center">
                                        <span className="text-2xl mb-1">📅</span>
                                        <span className="text-[10px] font-bold">Calendar</span>
                                    </a>
                                    <a href="https://docs.google.com/spreadsheets" target="_blank" className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center">
                                        <span className="text-2xl mb-1">📊</span>
                                        <span className="text-[10px] font-bold">Sheets</span>
                                    </a>
                                    <a href="https://photos.google.com" target="_blank" className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center">
                                        <span className="text-2xl mb-1">📷</span>
                                        <span className="text-[10px] font-bold">Photos</span>
                                    </a>
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-[#003366] mb-3">Bulk Import Contacts</h3>
                                <button onClick={() => csvInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50 hover:border-[#003366] hover:text-[#003366] transition-colors">
                                    📂 Upload CSV (Name, Phone)
                                </button>
                                <input type="file" ref={csvInputRef} accept=".csv" className="hidden" onChange={handleBulkImport} />
                                <p className="text-[10px] text-gray-400 mt-2 text-center">Format: Column 1 Name, Column 2 Phone</p>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-bold text-[#003366] mb-3">Invited List ({prevCustomers.length})</h3>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200 max-h-60 overflow-y-auto">
                            {prevCustomers.length === 0 && <p className="p-4 text-center text-gray-600">No customers invited yet.</p>}
                            {prevCustomers.map((c, i) => (
                                <div key={i} className="p-3 flex justify-between items-center bg-white hover:bg-blue-50">
                                    <div>
                                        <p className="font-bold text-[#003366] text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-500">{c.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={`tel:${c.phone}`} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 text-xs">📞</a>
                                        <a href={`sms:${c.phone}`} className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-xs">💬</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'SCOUT' && (
                <div className="text-center py-10 space-y-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center border-4 border-[#003366]">
                        <span className="text-4xl">🚛</span>
                    </div>
                    <h3 className="text-2xl font-bold text-[#003366]">Highway Scout Mode</h3>
                    <p className="text-gray-700 max-w-md mx-auto">Take a photo of a truck, door logo, or fleet yard. AI will extract company info, draft a sales email, and create a social post.</p>
                    <button onClick={() => fileInputRef.current?.click()} disabled={scouting} className="w-full max-w-xs mx-auto p-6 bg-[#00A651] text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-[#008a42] transition-transform active:scale-95">
                        {scouting ? 'ANALYZING...' : '📸 CAPTURE LEAD'}
                    </button>
                    <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
                </div>
            )}

            {activeTab === 'REG OCR' && (
                <div className="space-y-6">
                    {!regData ? (
                        <div className="text-center py-10 space-y-6">
                            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center border-4 border-[#003366]">
                                <span className="text-4xl">📄</span>
                            </div>
                            <h3 className="text-2xl font-bold text-[#003366]">Registration OCR</h3>
                            <p className="text-gray-700 max-w-md mx-auto">Upload a photo of a vehicle registration card. AI will extract VIN, Owner, and Address for instant booking or entity creation.</p>
                            <button onClick={() => regInputRef.current?.click()} disabled={processingReg} className="w-full max-w-xs mx-auto p-6 bg-[#00A651] text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-[#008a42] transition-transform active:scale-95">
                                {processingReg ? 'READING DOC...' : '📸 SCAN REGISTRATION'}
                            </button>
                            <input type="file" ref={regInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleRegCapture} />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex justify-between items-center">
                                <h3 className="font-bold text-green-800">Registration Extracted</h3>
                                <button onClick={() => setRegData(null)} className="text-xs text-gray-600 font-bold border px-2 py-1 rounded bg-white hover:bg-gray-100">RESET</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 uppercase">VIN</label>
                                    <input type="text" value={regData.vin} readOnly className="w-full p-2 border rounded font-mono font-bold text-[#003366] bg-gray-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 uppercase">License Plate</label>
                                    <input type="text" value={regData.licensePlate} readOnly className="w-full p-2 border rounded font-bold bg-gray-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 uppercase">Year / Make / Model</label>
                                    <input type="text" value={`${regData.year} ${regData.make} ${regData.model}`} readOnly className="w-full p-2 border rounded font-bold bg-gray-50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 uppercase">GVWR</label>
                                    <input type="text" value={regData.gvwr} readOnly className="w-full p-2 border rounded font-bold bg-gray-50" />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase">Owner Name</label>
                                    <input type="text" value={regData.ownerName} readOnly className="w-full p-2 border rounded font-bold bg-gray-50" />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase">Address</label>
                                    <input type="text" value={regData.address} readOnly className="w-full p-2 border rounded font-bold bg-gray-50" />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={handleCreateEntity} className="flex-1 py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg hover:bg-[#002244] active:scale-95 transition-transform">
                                    CREATE ENTITY
                                </button>
                                <button onClick={handleBookTest} className="flex-1 py-4 bg-[#15803d] text-white font-bold rounded-xl shadow-lg hover:bg-[#166534] active:scale-95 transition-transform">
                                    BOOK TEST
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'LEADS' && (
                <div className="space-y-6">
                    {leads.length === 0 && <div className="text-center text-gray-600 py-10">No leads captured yet. Go to Scout Camera.</div>}
                    {leads.map(lead => (
                        <div key={lead.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-lg text-[#003366]">{lead.companyName}</h4>
                                    <p className="text-xs text-gray-600">{lead.industry} • {lead.location}</p>
                                    <p className="text-xs font-mono text-[#00A651]">{lead.phone} {lead.dot ? `• DOT: ${lead.dot}` : ''}</p>
                                </div>
                                <button onClick={() => syncToZapier(lead)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 font-bold">⚡ ZAPIER</button>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg mb-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Email Draft</p>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-3">{lead.emailDraft}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'BRAIN' && (
                <div className="space-y-4">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                        <div className="flex items-start gap-2">
                            <span className="text-xl">🎓</span>
                            <div>
                                <h4 className="font-bold text-[#003366]">How to Train the AI</h4>
                                <p className="text-sm text-gray-700 mt-1">
                                    The AI follows the <strong>System Instructions</strong> below. It does <strong>not</strong> learn from customers. 
                                    To "fix" answers, we must edit this text in the code.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Current System Logic (Read Only)</label>
                        <textarea 
                            readOnly 
                            className="w-full h-96 p-4 font-mono text-xs bg-gray-900 text-green-400 rounded-xl border-4 border-gray-800 focus:outline-none"
                            value={SYSTEM_INSTRUCTION}
                        />
                        <div className="absolute top-8 right-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded">
                            CODE: services/geminiService.ts
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'FINANCIALS' && (
                <div className="overflow-x-auto">
                    <h3 className="text-[#003366] font-bold mb-4">Revenue Projections (2026-2030)</h3>
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-white bg-[#003366] uppercase">
                            <tr>
                                <th className="px-4 py-3">Year</th>
                                <th className="px-4 py-3">Trucks</th>
                                <th className="px-4 py-3">Tests/Yr</th>
                                <th className="px-4 py-3">Total Tests</th>
                                <th className="px-4 py-3">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projections.map((row, idx) => (
                                <tr key={row.year} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 border-b'}>
                                    <td className="px-4 py-3 font-bold">{row.year}</td>
                                    <td className="px-4 py-3">{row.trucks.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-center">{row.testsPerYear}x</td>
                                    <td className="px-4 py-3">{row.totalTests.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-bold text-[#00A651]">${row.revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'ALERTS' && (
                <div className="text-center py-6 space-y-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center border-2 border-red-500">
                        <span className="text-2xl">📢</span>
                    </div>
                    <h3 className="text-2xl font-bold text-[#003366]">Broadcast Alert</h3>
                    <p className="text-gray-600 max-w-md mx-auto text-sm">Send a push notification to all subscribed users. Use sparingly for urgent deadlines or new regulations.</p>
                    
                    <div className="max-w-md mx-auto space-y-4 text-left">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Notification Message</label>
                            <textarea 
                                rows={3} 
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-[#003366] outline-none"
                                placeholder="e.g., 2025 Compliance Deadline is approaching. Check your VIN now."
                                value={alertMessage}
                                onChange={(e) => setAlertMessage(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleBroadcast} 
                            disabled={!alertMessage}
                            className="w-full p-4 bg-[#003366] text-white rounded-xl font-bold hover:bg-[#002244] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            SEND BROADCAST
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default AdminView;