import React, { useState } from 'react';
import { analyzeMedia, generateAppImage, generateSpeech, transcribeAudio } from '../services/geminiService';
import { ASPECT_RATIOS, IMAGE_SIZES } from '../constants';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate' | 'audio' | 'files' | 'resources'>('analyze');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const [analysisPrompt, setAnalysisPrompt] = useState('Check this Engine Control Label for legibility and family name.');
  
  const [genPrompt, setGenPrompt] = useState('A professional decal for a clean diesel fleet truck, vector style');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [size, setSize] = useState('1K');
  const [genImage, setGenImage] = useState('');

  const [ttsText, setTtsText] = useState('All trucks must be compliant by 2025.');

  const handleAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult('');
    try {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        const text = await analyzeMedia(file, analysisPrompt, type);
        setResult(text);
    } catch (err) {
        setResult("Analysis failed.");
    } finally {
        setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!genPrompt) return;
    setLoading(true);
    try {
        const b64 = await generateAppImage(genPrompt, { aspectRatio, size });
        setGenImage(b64);
    } catch (err) {
        alert("Image generation failed");
    } finally {
        setLoading(false);
    }
  };

  const handleTTS = async () => {
    if (!ttsText) return;
    setLoading(true);
    try {
        const b64 = await generateSpeech(ttsText);
        if (b64) alert("Audio generated successfully!");
    } catch (err) {
        alert("TTS failed");
    } finally {
        setLoading(false);
    }
  };
  
  const handleTranscribe = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      setLoading(true);
      try {
          const text = await transcribeAudio(file);
          setResult(`Transcription:\n${text}`);
      } catch (err) {
          setResult("Transcription failed");
      } finally {
          setLoading(false);
      }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-20 transition-colors">
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button className={`flex-1 p-4 font-bold text-sm whitespace-nowrap ${activeTab === 'analyze' ? 'text-[#003366] dark:text-white border-b-4 border-[#15803d]' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => setActiveTab('analyze')}>Analyze</button>
        <button className={`flex-1 p-4 font-bold text-sm whitespace-nowrap ${activeTab === 'generate' ? 'text-[#003366] dark:text-white border-b-4 border-[#15803d]' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => setActiveTab('generate')}>Generate</button>
        <button className={`flex-1 p-4 font-bold text-sm whitespace-nowrap ${activeTab === 'audio' ? 'text-[#003366] dark:text-white border-b-4 border-[#15803d]' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => setActiveTab('audio')}>Audio</button>
        <button className={`flex-1 p-4 font-bold text-sm whitespace-nowrap ${activeTab === 'files' ? 'text-[#003366] dark:text-white border-b-4 border-[#15803d]' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => setActiveTab('files')}>Files</button>
        <button className={`flex-1 p-4 font-bold text-sm whitespace-nowrap ${activeTab === 'resources' ? 'text-[#003366] dark:text-white border-b-4 border-[#15803d]' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => setActiveTab('resources')}>Links</button>
      </div>

      <div className="p-6">
        {activeTab === 'analyze' && (
            <div className="space-y-4">
                <h3 className="text-[#003366] dark:text-white font-bold text-lg">Visual Inspection</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload photos of Engine Tags, Smoke Tests, or Trucks.</p>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    <button onClick={() => setAnalysisPrompt("Check this Engine Control Label for legibility and family name.")} className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-white p-2 rounded border dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap">Engine Tag</button>
                    <button onClick={() => setAnalysisPrompt("Analyze smoke opacity from this tailpipe.")} className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-white p-2 rounded border dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap">Smoke</button>
                </div>
                <textarea rows={3} value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#003366] outline-none text-sm dark:bg-gray-700 dark:text-white" />
                <label className="block w-full p-4 bg-[#003366] text-white text-center rounded-xl cursor-pointer font-bold hover:bg-[#002244]">
                    📷 Upload Photo/Video
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleAnalyze} />
                </label>
            </div>
        )}

        {activeTab === 'generate' && (
            <div className="space-y-4">
                <h3 className="text-[#003366] dark:text-white font-bold text-lg">Image Generation</h3>
                <textarea rows={3} value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#003366] outline-none text-sm dark:bg-gray-700 dark:text-white" placeholder="Describe the image..." />
                <div className="flex gap-2">
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="flex-1 p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                     <select value={size} onChange={(e) => setSize(e.target.value)} className="flex-1 p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        {IMAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                </div>
                <button onClick={handleGenerate} className="w-full p-4 bg-[#15803d] text-white rounded-xl font-bold hover:bg-[#166534]">✨ Generate</button>
                {genImage && <img src={genImage} alt="Generated" className="w-full rounded-xl border-2 border-[#003366]" />}
            </div>
        )}

        {activeTab === 'audio' && (
            <div className="space-y-6">
                <div>
                    <h3 className="text-[#003366] dark:text-white font-bold text-lg mb-2">Text to Speech</h3>
                    <textarea rows={2} value={ttsText} onChange={(e) => setTtsText(e.target.value)} className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-[#003366] outline-none text-sm mb-2 dark:bg-gray-700 dark:text-white" />
                    <button onClick={handleTTS} className="w-full p-3 bg-[#003366] text-white rounded-xl font-bold hover:bg-[#002244]">🔊 Speak</button>
                </div>
                <div className="border-t dark:border-gray-700 pt-4">
                    <h3 className="text-[#003366] dark:text-white font-bold text-lg mb-2">Transcribe Audio</h3>
                     <label className="block w-full p-4 bg-gray-100 dark:bg-gray-700 text-[#003366] dark:text-white text-center rounded-xl cursor-pointer font-bold border-2 border-dashed border-[#003366] dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">
                        🎙️ Upload Audio
                        <input type="file" accept="audio/*" className="hidden" onChange={handleTranscribe} />
                    </label>
                </div>
            </div>
        )}

        {activeTab === 'files' && (
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h3 className="text-[#003366] dark:text-blue-200 font-bold text-lg mb-2">Cloud Storage</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Store your VIN photos, engine tags, and database files securely in your cloud folders. We link directly to your apps.
                    </p>
                    
                    <a href="https://drive.google.com/drive/u/0/my-drive" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow mb-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg text-2xl">📂</div>
                        <div>
                            <p className="font-bold text-[#003366] dark:text-white">Google Drive</p>
                            <p className="text-xs text-gray-500">Open My Drive</p>
                        </div>
                    </a>

                    <a href="https://www.dropbox.com/home" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-lg text-2xl text-blue-500">📦</div>
                        <div>
                            <p className="font-bold text-[#003366] dark:text-white">Dropbox</p>
                            <p className="text-xs text-gray-500">Open Files</p>
                        </div>
                    </a>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                     <h3 className="text-[#003366] dark:text-white font-bold text-lg mb-2">Trash / Cleanup</h3>
                     <p className="text-xs text-gray-500 mb-3">Quickly access your photo trash to free up space.</p>
                     <a href="https://photos.google.com/trash" target="_blank" rel="noreferrer" className="block w-full p-3 text-center bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100">
                         🗑️ Empty Photo Trash
                     </a>
                </div>
            </div>
        )}

        {activeTab === 'resources' && (
            <div className="space-y-4">
                <h3 className="text-[#003366] dark:text-white font-bold text-lg">Useful Resources</h3>
                <a href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx" target="_blank" rel="noopener noreferrer" className="block p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🚛</span>
                        <div>
                            <p className="font-bold text-[#003366] dark:text-white">SAFER Web (FMCSA)</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Lookup DOT Snapshot & Safety Rating</p>
                        </div>
                    </div>
                </a>
                <a href="https://cleantruckcheck.arb.ca.gov/" target="_blank" rel="noopener noreferrer" className="block p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🌲</span>
                        <div>
                            <p className="font-bold text-[#003366] dark:text-white">Official CARB CTC Portal</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pay Fees & Print Certificates</p>
                        </div>
                    </div>
                </a>
            </div>
        )}

        {loading && <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 text-[#15803d] dark:text-green-400 text-center rounded-xl animate-pulse font-bold">Processing...</div>}
        {result && <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 text-[#003366] dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 whitespace-pre-wrap text-sm">{result}</div>}
      </div>
    </div>
  );
};

export default MediaTools;