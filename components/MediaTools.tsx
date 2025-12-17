
import React, { useState } from 'react';
import { analyzeMedia, generateAppImage, generateSpeech, transcribeAudio } from '../services/geminiService';
import { ASPECT_RATIOS, IMAGE_SIZES } from '../constants';
import { trackEvent } from '../services/analytics';

const MediaTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate' | 'audio'>('analyze');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('Inspect this label for CARB EFN codes.');
  const [genPrompt, setGenPrompt] = useState('A professional fleet truck with clean emission decals');
  const [genImage, setGenImage] = useState('');

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
    setLoading(true);
    try {
        const b64 = await generateAppImage(genPrompt, { aspectRatio: '1:1', size: '1K' });
        setGenImage(b64);
    } catch (err) {
        alert("Generation failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 mb-24">
      <div className="flex bg-gray-50 dark:bg-gray-900">
        {['analyze', 'generate', 'audio'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 p-4 text-xs font-bold uppercase transition-colors ${activeTab === tab ? 'text-[#003366] bg-white border-b-2 border-[#15803d]' : 'text-gray-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {activeTab === 'analyze' && (
            <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <p className="text-[10px] font-black text-[#003366] dark:text-blue-300 uppercase mb-2">Advanced Visual Intel</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Uses Gemini 3 Pro to read blurry tags, detect engine mods, and verify emission stickers.</p>
                </div>
                <textarea 
                    value={analysisPrompt} 
                    onChange={e => setAnalysisPrompt(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-[#003366] dark:text-white"
                    placeholder="Ask Gemini to analyze something..."
                />
                <label className="block w-full p-4 bg-[#003366] text-white text-center rounded-xl font-bold cursor-pointer hover:bg-[#002244] active:scale-95 transition-all">
                    📷 UPLOAD PHOTO / VIDEO
                    <input type="file" className="hidden" onChange={handleAnalyze} accept="image/*,video/*" />
                </label>
            </div>
        )}

        {activeTab === 'generate' && (
            <div className="space-y-4">
                <textarea 
                    value={genPrompt} 
                    onChange={e => setGenPrompt(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-[#003366] dark:text-white"
                />
                <button onClick={handleGenerate} className="w-full p-4 bg-[#15803d] text-white rounded-xl font-bold">✨ GENERATE IMAGE</button>
                {genImage && <img src={genImage} alt="Generated" className="w-full rounded-2xl border border-gray-200" />}
            </div>
        )}

        {loading && (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-xl text-center animate-pulse">
                <p className="text-sm font-bold text-[#15803d]">Intelligence at work...</p>
                <p className="text-[10px] text-gray-500">Processing large multimodal data with Pro models</p>
            </div>
        )}

        {result && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm whitespace-pre-wrap dark:text-white">
                {result}
            </div>
        )}
      </div>
    </div>
  );
};

export default MediaTools;
