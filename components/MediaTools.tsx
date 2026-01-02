import React, { useState, useRef, useEffect, useMemo } from 'react';
import { batchAnalyzeTruckImages, validateVINCheckDigit } from '../services/geminiService';
import { decodeVinNHTSA } from '../services/nhtsa';
import { createJobInCloud, addVehicleToJobInCloud, subscribeToJobs, subscribeToJobVehicles, updateJobStatusInCloud, auth, subscribeToInboundIntakes } from '../services/firebase';
import { trackEvent } from '../services/analytics';
import { Job, Vehicle, IntakeSubmission } from '../types';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'inbound' | 'audio'>('jobs');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [inboundIntakes, setInboundIntakes] = useState<IntakeSubmission[]>([]);
  const [jobVehicles, setJobVehicles] = useState<Vehicle[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobNameInput, setJobNameInput] = useState('');
  const [crmSearchQuery, setCrmSearchQuery] = useState('');
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth?.currentUser) return;
    const unsubJobs = subscribeToJobs(auth.currentUser.uid, (jobs: Job[]) => setAllJobs(jobs));
    const unsubIntakes = subscribeToInboundIntakes((data: IntakeSubmission[]) => setInboundIntakes(data));
    return () => { unsubJobs(); unsubIntakes(); };
  }, []);

  useEffect(() => {
    if (!currentJob) { setJobVehicles([]); return; }
    const unsub = subscribeToJobVehicles(currentJob.id, (vehicles: Vehicle[]) => setJobVehicles(vehicles));
    return () => unsub();
  }, [currentJob]);

  const urgentCrmCount = useMemo(() => {
    return inboundIntakes.filter(i => i.extractedData?.confidence === 'low' || i.status === 'pending').length;
  }, [inboundIntakes]);

  const filteredInbound = useMemo(() => {
    const q = crmSearchQuery.toLowerCase();
    return inboundIntakes.filter(i => 
        i.clientName.toLowerCase().includes(q) || 
        i.extractedData?.vin?.toLowerCase().includes(q)
    );
  }, [inboundIntakes, crmSearchQuery]);

  const startNewJob = async () => {
    if (!jobNameInput || !auth?.currentUser) return;
    setLoading(true);
    const newJob: Omit<Job, 'id'> = {
        userId: auth.currentUser.uid,
        jobName: jobNameInput,
        jobDate: Date.now(),
        location: { lat: 0, lng: 0, address: 'Capturing GPS...' },
        status: 'pending',
        vehicleCount: 0,
        createdAt: Date.now(),
        exportedAt: null,
        vehicles: []
    };
    try {
        const created = await createJobInCloud(auth.currentUser.uid, newJob);
        setCurrentJob(created as Job);
        setJobNameInput('');
    } catch (err) { alert("Initialization Link Error."); } finally { setLoading(false); }
  };

  const syncToSheets = async (item: IntakeSubmission) => {
      setLoading(true);
      setStatusText('SYNCING TO GOOGLE SHEETS...');
      try {
          // Simulation of mapping data to 'OVI Incoming Truck info'
          const rowData = {
              vin: item.extractedData?.vin,
              plate: item.extractedData?.licensePlate,
              mileage: item.extractedData?.mileage,
              fleetOwner: item.clientName,
              testResult: 'PENDING_REVIEW',
              testerId: auth?.currentUser?.uid || 'UNKNOWN',
              timestamp: new Date().toISOString()
          };
          console.log("Exporting Row to Google Sheets:", rowData);

          // Simulated API Latency
          await new Promise(r => setTimeout(r, 1500));
          
          setSyncedIds(prev => new Set(prev).add(item.id));
          trackEvent('crm_sheet_sync_success', { vin: item.extractedData?.vin });
      } catch (e) {
          alert("Sheet Sync Error. check Google API credentials.");
      } finally {
          setLoading(false);
      }
  };

  const runBatchExtraction = async () => {
    if (selectedFiles.length === 0 || !currentJob) return;
    setLoading(true);
    setStatusText('OPTICAL EXTRACTION RUNNING...');
    try {
      const data = await batchAnalyzeTruckImages(selectedFiles);
      const vinValid = validateVINCheckDigit(data.vin || '');
      const nhtsa = await decodeVinNHTSA(data.vin || '');
      const newVehicle: Omit<Vehicle, 'id'> = {
          jobId: currentJob.id,
          vin: data.vin || '',
          vinValid: vinValid,
          nhtsaSuccess: nhtsa?.valid || false,
          licensePlate: data.licensePlate || '',
          companyName: data.registeredOwner || '',
          mileage: data.mileage || '',
          eclCondition: (data.eclCondition as any) || "clear",
          engineFamilyName: data.engineFamilyName || '',
          engineManufacturer: data.engineManufacturer || nhtsa?.engineMfr || '',
          engineModel: data.engineModel || '',
          engineYear: data.engineYear || nhtsa?.year || '',
          vehicleYear: nhtsa?.year || data.engineYear || '',
          vehicleMake: nhtsa?.make || data.engineManufacturer || '',
          vehicleModel: nhtsa?.model || '',
          gvwr: nhtsa?.gvwr || data.dotNumber || '',
          testResult: "pending",
          testDate: Date.now(),
          photoUrls: {},
          confidence: (data.confidence as any) || "medium"
      };
      await addVehicleToJobInCloud(currentJob.id, newVehicle);
      await updateJobStatusInCloud(currentJob.id, 'review');
      setSelectedFiles([]);
      trackEvent('field_batch_extract_success');
    } catch (err) { alert("Optics Interrupted."); } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="flex glass rounded-[2.5rem] p-1.5 border border-white/5 relative">
        {[
          { id: 'jobs', label: 'Field Hub' },
          { id: 'inbound', label: 'Inbound CRM', badge: urgentCrmCount },
          { id: 'audio', label: 'Audio' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all italic relative ${activeTab === tab.id ? 'bg-white text-carb-navy shadow-lg' : 'text-gray-500'}`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 right-2 bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black animate-pulse border-2 border-carb-navy">
                    {tab.badge}
                </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'inbound' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-500">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex items-center gap-4">
                    <span className="text-xl">🔍</span>
                    <input 
                        value={crmSearchQuery}
                        onChange={e => setCrmSearchQuery(e.target.value)}
                        placeholder="SEARCH FLEET INTAKE..."
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white w-full"
                    />
                </div>
                
                {filteredInbound.length === 0 ? (
                  <div className="py-20 text-center opacity-30 text-[10px] font-black uppercase tracking-widest italic">
                    No Inbound Records Detected
                  </div>
                ) : filteredInbound.map(item => (
                    <div key={item.id} className="glass p-8 rounded-[3rem] border border-white/5 space-y-6 relative overflow-hidden group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-xl font-black text-white italic uppercase">{item.clientName}</h4>
                                <p className="text-[9px] font-black text-gray-500 uppercase mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border italic ${item.status === 'exported' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {item.status}
                            </span>
                        </div>
                        
                        {item.extractedData && (
                            <div className="bg-white/5 p-5 rounded-2xl grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] font-black text-carb-accent uppercase tracking-widest mb-1">VIN Detected</p>
                                    <p className="text-[10px] font-mono text-white truncate">{item.extractedData.vin || 'Pending'}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-carb-accent uppercase tracking-widest mb-1">EFN Code</p>
                                    <p className="text-[10px] font-mono text-white truncate">{item.extractedData.engineFamilyName || 'Pending'}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            {syncedIds.has(item.id) ? (
                              <div className="flex-1 py-4 bg-green-500/10 text-green-500 border border-green-500/30 rounded-2xl font-black text-[10px] uppercase tracking-widest italic flex items-center justify-center gap-2">
                                <span>✓</span> SYNCED TO SHEETS
                              </div>
                            ) : (
                              <button onClick={() => syncToSheets(item)} disabled={loading} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic active-haptic shadow-lg hover:bg-green-700 transition-colors">
                                {loading ? 'SYNCING...' : 'Export to Sheet'}
                              </button>
                            )}
                            <button className="flex-1 py-4 glass text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic border-white/5">View Photos</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'jobs' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                {!currentJob ? (
                    <div className="glass p-12 rounded-[4rem] border border-white/10 text-center space-y-8">
                        <div className="w-24 h-24 bg-carb-accent/10 rounded-full mx-auto flex items-center justify-center text-4xl border border-carb-accent/20">
                            🏗️
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic uppercase italic">Field Hub</h3>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active Site Inspector v4.0</p>
                        </div>
                        <div className="space-y-4">
                            <input 
                                value={jobNameInput}
                                onChange={e => setJobNameInput(e.target.value)}
                                placeholder="FLEET NAME / SITE ID"
                                className="w-full bg-white/5 p-6 rounded-3xl border border-white/10 outline-none text-sm font-black text-white uppercase italic text-center"
                            />
                            <button 
                                onClick={startNewJob}
                                disabled={!jobNameInput || loading}
                                className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs italic shadow-xl shadow-blue-500/20 active-haptic"
                            >
                                ACTIVATE FIELD PROTOCOL
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="glass p-8 rounded-[3rem] flex justify-between items-center border border-carb-accent/20">
                            <div>
                                <h4 className="text-xl font-black italic uppercase">{currentJob.jobName}</h4>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{jobVehicles.length} Trucks Logged</p>
                            </div>
                            <button onClick={() => setCurrentJob(null)} className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Terminate</button>
                        </div>

                        <div 
                            onClick={() => multiFileInputRef.current?.click()}
                            className="w-full py-20 glass rounded-[4rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-6 active-haptic hover:bg-white/5 transition-all"
                        >
                            <span className="text-6xl animate-bounce">📸</span>
                            <div className="text-center">
                                <p className="text-sm font-black uppercase italic text-white">Capture Photo Batch</p>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">VIN • ECL • Odometer • Exterior</p>
                            </div>
                        </div>
                        
                        <input type="file" multiple ref={multiFileInputRef} className="hidden" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} accept="image/*" />
                        
                        {selectedFiles.length > 0 && (
                            <button onClick={runBatchExtraction} disabled={loading} className="w-full py-6 bg-white text-carb-navy rounded-[2rem] font-black text-xs uppercase italic tracking-widest shadow-2xl">
                                {loading ? statusText : `Extract ${selectedFiles.length} Photos`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaTools;