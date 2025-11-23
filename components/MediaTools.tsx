import React, { useState } from 'react';
import { analyzeMedia, generateAppImage, generateSpeech, transcribeAudio } from '../services/geminiService';
import { ASPECT_RATIOS, IMAGE_SIZES } from '../constants';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate' | 'audio'>('analyze');
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
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-20">
      <div className="flex border-b border-gray-200">
        <button className={`flex-1 p-4 font-bold text-sm ${activeTab === 'analyze' ? 'text-[#003366] border-b-4 border-[#00C853]' : 'text-gray-400'}`} onClick={() => setActiveTab('analyze')}>Analyze</button>
        <button className={`flex-1 p-4 font-bold text-sm ${activeTab === 'generate' ? 'text-[#003366] border-b-4 border-[#00C853]' : 'text-gray-400'}`} onClick={() => setActiveTab('generate')}>Generate</button>
        <button className={`flex-1 p-4 font-bold text-sm ${activeTab === 'audio' ? 'text-[#003366] border-b-4 border-[#00C853]' : 'text-gray-400'}`} onClick={() => setActiveTab('audio')}>Audio</button>
      </div>

      <div className="p-6">
        {activeTab === 'analyze' && (
            <div className="space-y-4">
                <h3 className="text-[#003366] font-bold text-lg">Visual Inspection</h3>
                <p className="text-sm text-gray-500">Upload photos of Engine Tags, Smoke Tests, or Trucks.</p>
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    <button onClick={() => setAnalysisPrompt("Check this Engine Control Label for legibility and family name.")} className="text-xs bg-gray-100 p-2 rounded border hover:bg-gray-200 whitespace-nowrap">Engine Tag</button>
                    <button onClick={() => setAnalysisPrompt("Analyze smoke opacity from this tailpipe.")} className="text-xs bg-gray-100 p-2 rounded border hover:bg-gray-200 whitespace-nowrap">Smoke</button>
                </div>
                <textarea rows={3} value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#003366] outline-none text-sm" />
                <label className="block w-full p-4 bg-[#003366] text-white text-center rounded-xl cursor-pointer font-bold hover:bg-[#002244]">
                    📷 Upload Photo/Video
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleAnalyze} />
                </label>
            </div>
        )}

        {activeTab === 'generate' && (
            <div className="space-y-4">
                <h3 className="text-[#003366] font-bold text-lg">Image Generation</h3>
                <textarea rows={3} value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#003366] outline-none text-sm" placeholder="Describe the image..." />
                <div className="flex gap-2">
                     <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="flex-1 p-2 border rounded-lg">
                        {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                     <select value={size} onChange={(e) => setSize(e.target.value)} className="flex-1 p-2 border rounded-lg">
                        {IMAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                </div>
                <button onClick={handleGenerate} className="w-full p-4 bg-[#00C853] text-white rounded-xl font-bold hover:bg-[#00a844]">✨ Generate</button>
                {genImage && <img src={genImage} alt="Generated" className="w-full rounded-xl border-2 border-[#003366]" />}
            </div>
        )}

        {activeTab === 'audio' && (
            <div className="space-y-6">
                <div>
                    <h3 className="text-[#003366] font-bold text-lg mb-2">Text to Speech</h3>
                    <textarea rows={2} value={ttsText} onChange={(e) => setTtsText(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#003366] outline-none text-sm mb-2" />
                    <button onClick={handleTTS} className="w-full p-3 bg-[#003366] text-white rounded-xl font-bold hover:bg-[#002244]">🔊 Speak</button>
                </div>
                <div className="border-t pt-4">
                    <h3 className="text-[#003366] font-bold text-lg mb-2">Transcribe Audio</h3>
                     <label className="block w-full p-4 bg-gray-100 text-[#003366] text-center rounded-xl cursor-pointer font-bold border-2 border-dashed border-[#003366] hover:bg-gray-200">
                        🎙️ Upload Audio
                        <input type="file" accept="audio/*" className="hidden" onChange={handleTranscribe} />
                    </label>
                </div>
            </div>
        )}

        {loading && <div className="mt-4 p-4 bg-gray-50 text-[#00C853] text-center rounded-xl animate-pulse font-bold">Processing...</div>}
        {result && <div className="mt-4 p-4 bg-gray-50 text-[#003366] rounded-xl border border-gray-200 whitespace-pre-wrap text-sm">{result}</div>}
      </div>
    </div>
  );
};

export default MediaTools;