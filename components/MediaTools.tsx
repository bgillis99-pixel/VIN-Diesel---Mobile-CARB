
import React, { useState, useRef, useEffect } from 'react';
import { batchAnalyzeTruckImages, validateVINCheckDigit } from '../services/geminiService';
import { createJobInCloud, addVehicleToJobInCloud, subscribeToJobs, subscribeToJobVehicles, updateJobStatusInCloud, auth } from '../services/firebase';
import { trackEvent } from '../services/analytics';
import { Job, Vehicle } from '../types';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'generate' | 'audio'>('jobs');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [jobVehicles, setJobVehicles] = useState<Vehicle[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [jobNameInput, setJobNameInput] = useState('');
  
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to all jobs
  useEffect(() => {
    if (!auth?.currentUser) return;
    const unsub = subscribeToJobs(auth.currentUser.uid, (jobs) => {
        setAllJobs(jobs);
    });
    return () => unsub();
  }, []);

  // Subscribe to current job's vehicles
  useEffect(() => {
    if (!currentJob) {
        setJobVehicles([]);
        return;
    }
    const unsub = subscribeToJobVehicles(currentJob.id, (vehicles) => {
        setJobVehicles(vehicles);
    });
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
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            newJob.location.lat = pos.coords.latitude;
            newJob.location.lng = pos.coords.longitude;
        });
    }

    try {
        const created = await createJobInCloud(auth.currentUser.uid, newJob);
        setCurrentJob(created as Job);
        setJobNameInput('');
        trackEvent('job_started', { name: jobNameInput });
    } catch (err) {
        alert("Failed to initialize job. Check connection.");
    } finally {
        setLoading(false);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const runBatchExtraction = async () => {
    if (selectedFiles.length === 0 || !currentJob) return;
    setLoading(true);
    setStatusText('RUNNING OCR PIPELINE...');
    
    try {
      const data = await batchAnalyzeTruckImages(selectedFiles);
      const vinValid = validateVINCheckDigit(data.vin || '');
      
      const newVehicle: Omit<Vehicle, 'id'> = {
          jobId: currentJob.id,
          vin: data.vin || '',
          vinValid: vinValid,
          licensePlate: data.licensePlate || '',
          companyName: data.registeredOwner || '',
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          mileage: data.mileage || '',
          eclCondition: (data.eclCondition as any) || "clear",
          engineFamilyName: data.engineFamilyName || '',
          engineManufacturer: data.engineManufacturer || '',
          engineModel: data.engineModel || '',
          engineYear: data.engineYear || '',
          vehicleYear: data.engineYear || '',
          vehicleMake: data.engineManufacturer || '',
          vehicleModel: '',
          gvwr: data.dotNumber || '',
          testResult: "pending",
          testDate: Date.now(),
          photoUrls: {},
          confidence: "medium"
      };

      await addVehicleToJobInCloud(currentJob.id, newVehicle);
      await updateJobStatusInCloud(currentJob.id, 'review');
      
      setSelectedFiles([]);
      trackEvent('job_extraction_complete', { vin: data.vin });
    } catch (err) {
      alert("Extraction error. Try clearer photos.");
    } finally {
      setLoading(false);
    }
  };

  const exportToSheets = async () => {
      if (!currentJob) return;
      alert(`NorCal Mobile: Pushing ${jobVehicles.length} vehicles to Google Sheets...`);
      await updateJobStatusInCloud(currentJob.id, 'exported');
      trackEvent('job_export_sheets');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 mb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex glass rounded-[2.5rem] p-2 border border-white/5">
        {['jobs', 'generate', 'audio'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === tab ? 'bg-white text-carb-navy shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            {tab === 'jobs' ? 'Inspection Hub' : tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
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
                                    <div key={v.id} className={`bg-white rounded-[3rem] p-8 text-carb-navy space-y-6 shadow-2xl border-l-[12px] ${v.vinValid ? 'border-green-500' : 'border-red-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Compliance Asset</p>
                                                <h5 className="text-2xl font-black tracking-tighter italic uppercase">{v.vin}</h5>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border italic ${v.vinValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {v.vinValid ? 'Verified' : 'Review Required'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Fleet Owner</p>
                                                <p className="text-[11px] font-black uppercase truncate">{v.companyName || 'Unknown'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">EFN / Engine Family</p>
                                                <p className="text-[11px] font-black uppercase truncate">{v.engineFamilyName || 'Pending'}</p>
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
                        
                        {jobVehicles.length > 0 && currentJob.status !== 'exported' && (
                            <button 
                                onClick={exportToSheets}
                                className="w-full py-5 bg-green-600 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-widest italic shadow-xl shadow-green-500/20 active-haptic"
                            >
                                Batch Export to Google Sheets
                            </button>
                        )}
                        
                        <input type="file" multiple ref={multiFileInputRef} className="hidden" onChange={handleFileSelection} accept="image/*" />
                    </div>
                )}
            </div>
        )}

        {activeTab === 'generate' && (
            <div className="glass p-12 rounded-[3.5rem] border border-white/5 space-y-8 text-center">
                <div className="w-24 h-24 bg-carb-accent/10 rounded-full mx-auto flex items-center justify-center text-5xl border border-carb-accent/20">✨</div>
                <h3 className="text-2xl font-black italic tracking-tighter text-white">Asset Generator</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Generate decals or compliance certificates.</p>
                <button className="w-full py-5 glass text-white font-black rounded-3xl text-[10px] uppercase tracking-widest italic">Configure Generator</button>
            </div>
        )}

        {activeTab === 'audio' && (
            <div className="glass p-12 rounded-[3.5rem] border border-white/5 text-center space-y-8">
                <div className="w-24 h-24 bg-carb-accent/10 rounded-full mx-auto flex items-center justify-center text-5xl border border-carb-accent/20 animate-pulse-slow">🎙️</div>
                <h3 className="text-2xl font-black italic tracking-tighter text-white">Voice Reporter</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Dictate field observations.</p>
                <button className="w-full py-5 glass text-white font-black rounded-3xl text-[10px] uppercase tracking-widest italic">Start Recording</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaTools;
