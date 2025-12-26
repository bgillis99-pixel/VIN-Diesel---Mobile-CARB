
import React, { useState, useRef } from 'react';
import { analyzeMedia, generateAppImage, batchAnalyzeTruckImages } from '../services/geminiService';
import { trackEvent } from '../services/analytics';
import { ExtractedTruckData } from '../types';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate' | 'audio'>('analyze');
  const [resultText, setResultText] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedTruckData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [genPrompt, setGenPrompt] = useState('A professional fleet truck with clean emission decals');
  const [genImage, setGenImage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      trackEvent('media_drop_files', { count: files.length });
    }
  };

  const clearFiles = () => setSelectedFiles([]);

  const runBatchAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    setLoading(true);
    setExtractedData(null);
    setResultText('');
    try {
      const data = await batchAnalyzeTruckImages(selectedFiles);
      setExtractedData(data);
      trackEvent('batch_analysis_success', { filesCount: selectedFiles.length });
    } catch (err) {
      setResultText("Batch Analysis failed. Please try again with clearer photos.");
    } finally {
      setLoading(false);
    }
  };

  const generateEmailBody = (data: ExtractedTruckData) => {
    return `
FOR OVI CRM EXTRACTION - TRUCK DATA REPORT
-----------------------------------------
Mileage: ${data.mileage || 'N/A'}
VIN: ${data.vin || 'N/A'}
License Plate #: ${data.licensePlate || 'N/A'}
Registered Owner: ${data.registeredOwner || 'N/A'}
Contact Name: ${data.contactName || 'N/A'}
Contact Email: ${data.contactEmail || 'N/A'}
Contact Phone: ${data.contactPhone || 'N/A'}
DOT Number: ${data.dotNumber || 'N/A'}

EMISSION CONTROL LABEL (ECL) INFORMATION
-----------------------------------------
ECL Condition: ${data.eclCondition || 'N/A'}
Engine Family Name (EFN): ${data.engineFamilyName || 'N/A'}
Engine Manufacturer: ${data.engineManufacturer || 'N/A'}
Engine Model: ${data.engineModel || 'N/A'}
Engine Year: ${data.engineYear || 'N/A'}

INSPECTION DETAILS
-----------------------------------------
Date of Inspection: ${data.inspectionDate || new Date().toLocaleDateString()}
Location: ${data.inspectionLocation || 'N/A'}

Generated via Model CARB Compliance App
    `.trim();
  };

  const handleEmailToDispatch = () => {
    if (!extractedData) return;
    const body = generateEmailBody(extractedData);
    const subject = `OVI CRM EXTRACTION: ${extractedData.registeredOwner || 'New Truck'} - ${extractedData.vin?.slice(-6) || 'Report'}`;
    window.location.href = `mailto:bgillis99@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 mb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* TABS HEADER */}
      <div className="flex glass rounded-[2.5rem] p-2 overflow-hidden border border-white/5">
        {['analyze', 'generate', 'audio'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === tab ? 'bg-white text-carb-navy shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'analyze' && (
            <div className="space-y-6">
                <div className="glass p-8 rounded-[3rem] border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">📸</span>
                        <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] italic">OVI Multi-Scan</p>
                            <h3 className="text-xl font-black tracking-tighter text-white uppercase italic">Batch Extractor</h3>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Upload or **Drop** photos of: **VIN Plate**, **Engine Tag**, **Odometer**, and **Registration**. 
                        Gemini 3 Pro will extract all data for CRM entry.
                    </p>
                </div>

                {/* FILE SELECTION / DROP ZONE */}
                <div className="space-y-4">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`w-full group glass p-10 rounded-[3rem] flex flex-col items-center justify-center gap-3 active-haptic border transition-all duration-300 ${
                          isDragging ? 'border-carb-accent bg-carb-accent/10 scale-[1.02]' : 'border-white/5 hover:bg-white/5'
                        }`}
                        onClick={() => multiFileInputRef.current?.click()}
                    >
                        <div className={`text-5xl transition-transform ${isDragging ? 'scale-125 animate-bounce' : 'group-hover:scale-110'}`}>
                          {isDragging ? '📥' : '➕'}
                        </div>
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic block group-hover:text-white">
                            {isDragging ? 'Release to Scan' : 'Drop Photos or Click to Add'}
                          </span>
                          <span className="text-[8px] font-bold text-gray-700 uppercase tracking-widest block italic">Support Google Photos, iOS, Android</span>
                        </div>
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      ref={multiFileInputRef} 
                      className="hidden" 
                      onChange={handleFileSelection} 
                      accept="image/*" 
                    />

                    {selectedFiles.length > 0 && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {selectedFiles.map((f, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 glass shadow-lg">
                              <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                                }}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity font-black text-[8px] uppercase tracking-tighter"
                              >
                                REMOVE
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={clearFiles} className="flex-1 py-4 glass text-gray-500 font-black rounded-[1.5rem] uppercase text-[9px] tracking-widest active-haptic italic">Clear All</button>
                          <button 
                            onClick={runBatchAnalysis} 
                            disabled={loading}
                            className="flex-[2] py-4 bg-carb-accent text-white font-black rounded-[1.5rem] uppercase text-[9px] tracking-widest shadow-xl shadow-blue-500/20 active-haptic italic"
                          >
                            {loading ? 'PROCESSING INTELLIGENCE...' : 'ANALYZE BATCH'}
                          </button>
                        </div>
                      </div>
                    )}
                </div>

                {loading && (
                    <div className="glass p-10 rounded-[3rem] text-center space-y-4 border border-blue-500/10">
                        <div className="w-12 h-12 border-4 border-carb-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <div>
                            <p className="text-sm font-black text-white italic uppercase">Engineering Data...</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black mt-1 italic">Cross-referencing multiple sensors</p>
                        </div>
                    </div>
                )}

                {extractedData && (
                    <div className="space-y-6 animate-in zoom-in duration-500">
                        <div className="bg-white rounded-[3.5rem] p-10 text-carb-navy space-y-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-carb-accent text-white px-8 py-2 rounded-bl-3xl font-black text-[9px] uppercase tracking-widest italic">
                                Extracted Report
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic">Registered Owner</h4>
                                    <p className="text-2xl font-black tracking-tighter italic uppercase truncate">
                                        {extractedData.registeredOwner || 'UNKNOWN FLEET'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">VIN</p>
                                        <p className="font-mono text-xs font-black tracking-widest">{extractedData.vin || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Plate</p>
                                        <p className="font-black text-sm">{extractedData.licensePlate || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Mileage</p>
                                        <p className="font-black text-sm italic">{extractedData.mileage || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Engine Yr</p>
                                        <p className="font-black text-sm italic">{extractedData.engineYear || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4">
                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Technical Parameters</h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-gray-400 uppercase">EFN:</span>
                                            <span className="text-carb-navy">{extractedData.engineFamilyName || 'NOT FOUND'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-gray-400 uppercase">MFR:</span>
                                            <span className="text-carb-navy">{extractedData.engineManufacturer || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-gray-400 uppercase">MODEL:</span>
                                            <span className="text-carb-navy">{extractedData.engineModel || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleEmailToDispatch}
                                className="w-full py-6 bg-carb-navy text-white font-black rounded-[2rem] text-sm tracking-widest uppercase active-haptic shadow-xl flex items-center justify-center gap-3 italic"
                            >
                                ✉️ Email to Dispatch
                            </button>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center italic">Sending to: bgillis99@gmail.com</p>
                        </div>
                    </div>
                )}

                {resultText && (
                    <div className="glass p-8 rounded-[3rem] border border-white/5 animate-in fade-in duration-300">
                        <p className="text-sm font-medium text-gray-300 leading-relaxed italic">{resultText}</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'generate' && (
            <div className="space-y-6">
                <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Model Configuration</p>
                    <textarea 
                        value={genPrompt} 
                        onChange={e => setGenPrompt(e.target.value)}
                        className="w-full bg-transparent p-4 border border-white/10 rounded-3xl text-sm font-medium text-white outline-none focus:border-carb-accent transition-all min-h-[100px]"
                        placeholder="Draft your asset visual..."
                    />
                    <button 
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const b64 = await generateAppImage(genPrompt, { aspectRatio: '1:1', size: '1K' });
                                setGenImage(b64);
                            } catch (err) {
                                alert("Generation failed");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className="w-full p-6 bg-white text-carb-navy rounded-[2rem] font-black uppercase tracking-widest text-xs active-haptic shadow-2xl italic"
                    >
                        {loading ? 'MATERIALIZING...' : 'GENERATE ASSET'}
                    </button>
                </div>
                {genImage && (
                    <div className="glass p-4 rounded-[3.5rem] border border-white/5 animate-in zoom-in duration-500">
                        <img src={genImage} alt="Generated" className="w-full rounded-[2.5rem] shadow-2xl" />
                    </div>
                )}
            </div>
        )}

        {activeTab === 'audio' && (
            <div className="glass p-12 rounded-[3.5rem] border border-white/5 text-center space-y-8">
                <div className="w-24 h-24 bg-carb-accent/10 rounded-full mx-auto flex items-center justify-center text-5xl border border-carb-accent/20 animate-pulse-slow">🎙️</div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black italic tracking-tighter">Audio Intelligence</h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Live Transcription & Analysis</p>
                </div>
                <div className="p-8 border-2 border-dashed border-white/10 rounded-[2.5rem]">
                    <p className="text-xs text-gray-500 italic">Coming soon: Voice-activated compliance dictation.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaTools;
