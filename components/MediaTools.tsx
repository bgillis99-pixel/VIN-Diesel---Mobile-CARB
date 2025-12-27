
import React, { useState, useRef, useEffect } from 'react';
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
  
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth?.currentUser) return;
    const unsubJobs = subscribeToJobs(auth.currentUser.uid, (jobs) => setAllJobs(jobs));
    const unsubIntakes = subscribeToInboundIntakes((data) => setInboundIntakes(data));
    return () => { unsubJobs(); unsubIntakes(); };
  }, []);

  useEffect(() => {
    if (!currentJob) { setJobVehicles([]); return; }
    const unsub = subscribeToJobVehicles(currentJob.id, (vehicles) => setJobVehicles(vehicles));
    return () => unsub();
  }, [currentJob]);

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
    } catch (err) { alert("Link Error."); } finally { setLoading(false); }
  };

  const handleShareIntake = () => {
      const shareUrl = `${window.location.origin}?mode=intake`;
      if (navigator.share) {
          navigator.share({
              title: 'OVI Photo Protocol',
              text: 'Please use this secure link to take the 7 required OVI photos for your truck.',
              url: shareUrl
          });
      } else {
          navigator.clipboard.writeText(shareUrl);
          alert("Client link copied to clipboard!");
      }
      trackEvent('share_intake_link');
  };

  const runBatchExtraction = async () => {
    if (selectedFiles.length === 0 || !currentJob) return;
    setLoading(true);
    setStatusText('RUNNING OCR PIPELINE...');
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
    } catch (err) { alert("Extract error."); } finally { setLoading(false); }
  };

  const exportToSheets = async () => {
      alert(`Exporting ${jobVehicles.length} trucks to "OVI incoming Truck info" Sheet...`);
      if (currentJob) await updateJobStatusInCloud(currentJob.id, 'exported');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 mb-32">
      <div className="flex glass rounded-[2.5rem] p-2 border border-white/5">
        {[
          { id: 'jobs', label: 'Field Hub' },
          { id: 'inbound', label: 'Inbound CRM' },
          { id: 'audio', label: 'Audio' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === tab.id ? 'bg-white text-carb-navy shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'inbound' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <button 
                    onClick={handleShareIntake}
                    className="w-full py-6 bg-carb-accent text-white font-black rounded-[2.5rem] uppercase tracking-widest text-[11px] italic shadow-2xl active-haptic flex items-center justify-center gap-4"
                >
                    📱 Share Intake Link to Client
                </button>
                
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6 italic">OVI Incoming Submissions</h3>
                    {inboundIntakes.length === 0 ? (
                        <div className="text-center py-20 text-gray-700 italic text-[10px] uppercase tracking-widest">No client data linked yet.</div>
                    ) : (
                        inboundIntakes.map(item => (
                            <div key={item.id} className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-black text-white italic uppercase">{item.clientName}</h4>
                                    <span className="text-[9px] font-black text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                                </div>
                                {item.extractedData && (
                                    <div className="bg-white/5 p-4 rounded-2xl grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[8px] font-black text-blue-400 uppercase">VIN</p>
                                            <p className="text-[10px] text-white font-mono truncate">{item.extractedData.vin}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-blue-400 uppercase">Engine Family</p>
                                            <p className="text-[10px] text-white font-mono truncate">{item.extractedData.engineFamilyName}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button className="flex-1 py-3 bg-white text-carb-navy rounded-xl font-black text-[9px] uppercase italic">Open in CRM</button>
                                    <button onClick={exportToSheets} className="flex-1 py-3 glass text-carb-accent rounded-xl font-black text-[9px] uppercase italic border-carb-accent/20">Sync to Sheet</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {activeTab === 'jobs' && (
            <div className="space-y-6">
                {!currentJob ? (
                    <div className="space-y-8">
                        <div className="glass p-10 rounded-[3.5rem] border border-blue-500/20 shadow-2xl space-y-8">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">New Inspection Site</h3>
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">OVI Protocol Activation</p>
                            </div>
                            <div className="space-y-4">
                                <input 
                                    value={jobNameInput}
                                    onChange={e => setJobNameInput(e.target.value)}
                                    placeholder="FLEET OWNER / JOB ID"
                                    className="w-full bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-blue-500 text-sm font-black text-white uppercase tracking-widest italic"
                                />
                                <button 
                                    onClick={startNewJob}
                                    disabled={!jobNameInput || loading}
                                    className="w-full py-6 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-xs active-haptic shadow-xl shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {loading ? 'INITIALIZING...' : 'START DISPATCH'}
                                </button>
                            </div>
                        </div>

                        {allJobs.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-6">Recent Dispatches</h4>
                                {allJobs.map(job => (
                                    <button 
                                        key={job.id} 
                                        onClick={() => setCurrentJob(job)}
                                        className="w-full glass p-6 rounded-[2.5rem] flex justify-between items-center hover:bg-white/5 transition-all border border-white/5"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-black text-white uppercase italic truncate max-w-[150px]">{job.jobName}</p>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{new Date(job.jobDate).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border italic ${job.status === 'exported' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                            {job.status}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="glass p-8 rounded-[3rem] border border-carb-accent/30 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">{currentJob.jobName}</h4>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                  {new Date(currentJob.jobDate).toLocaleDateString()} • {jobVehicles.length} Trucks Recorded
                                </p>
                            </div>
                            <button onClick={() => setCurrentJob(null)} className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Exit</button>
                        </div>

                        {jobVehicles.length > 0 && (
                            <div className="space-y-6">
                                {jobVehicles.map(v => (
                                    <div key={v.id} className="bg-white rounded-[3rem] p-8 text-carb-navy space-y-6 shadow-2xl">
                                        <div className="flex justify-between items-start">
                                            <h5 className="text-2xl font-black tracking-tighter italic uppercase">{v.vin}</h5>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border italic ${v.vinValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {v.vinValid ? 'Verified' : 'Error'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Owner</p>
                                                <p className="text-[11px] font-black uppercase truncate">{v.companyName}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">EFN</p>
                                                <p className="text-[11px] font-black uppercase truncate">{v.engineFamilyName}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="glass p-12 rounded-[3.5rem] border border-white/5 text-center space-y-8">
                            <div 
                                onClick={() => multiFileInputRef.current?.click()}
                                className="w-32 h-32 bg-blue-500/10 rounded-full mx-auto flex items-center justify-center text-5xl border-2 border-dashed border-blue-500/30 cursor-pointer active-haptic hover:bg-blue-500/20 transition-all"
                            >
                                {loading ? '⚡' : '📸'}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Capture Photo Batch</h3>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Odometer • VIN • ECL • Door Plate</p>
                            </div>
                            {selectedFiles.length > 0 && (
                                <button 
                                    onClick={runBatchExtraction}
                                    disabled={loading}
                                    className="w-full py-6 bg-white text-carb-navy rounded-[2rem] font-black uppercase tracking-widest text-[11px] italic active-haptic"
                                >
                                    {loading ? statusText : 'ANALYZE & ADD TRUCK'}
                                </button>
                            )}
                        </div>
                        <input type="file" multiple ref={multiFileInputRef} className="hidden" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} accept="image/*" />
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaTools;
