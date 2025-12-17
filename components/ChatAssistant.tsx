
import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/geminiService';
import { Message } from '../types';
import { trackEvent } from '../services/analytics';

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Hello! I am VIN DIESEL AI. Ask me about CARB regulations, or upload a photo of a VIN/Label for instant analysis.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'thinking'>('search');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textOverride?: string, imageFile?: File) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && !imageFile) || loading) return;
    
    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: imageFile ? `[Analyzing Image] ${textToSend}` : textToSend, 
        timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      let imageData;
      if (imageFile) {
          const b64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(imageFile);
          });
          imageData = { data: b64, mimeType: imageFile.type };
      }

      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendMessage(
          textToSend || (imageFile ? "Analyze this image for CARB compliance." : ""), 
          imageFile ? 'standard' : mode, 
          history, 
          undefined, 
          imageData
      );

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: "Sorry, I hit a snag. Please check your connection or try again.", 
          timestamp: Date.now() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-180px)] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-[#003366] text-white p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
                <h2 className="font-bold text-sm">VIN DIESEL AI</h2>
                <p className="text-[10px] opacity-80">{mode === 'thinking' ? 'Deep Thinking Mode' : 'Instant Search Mode'}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setMode(m => m === 'search' ? 'thinking' : 'search')}
                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${mode === 'thinking' ? 'bg-orange-500' : 'bg-white/20'}`}
                title="Thinking mode uses more intelligence for complex queries"
            >
                {mode === 'thinking' ? 'THINKING ON' : 'DEEP THINK'}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-white/10 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleSend("Analyze this photo.", e.target.files?.[0])} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
              msg.role === 'user' 
                ? 'bg-[#003366] text-white' 
                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-100 dark:border-gray-600 shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-[10px]">
                  <p className="font-bold opacity-70">Sources:</p>
                  {msg.groundingUrls.map((url, idx) => (
                    <a key={idx} href={url.uri} target="_blank" rel="noreferrer" className="block text-blue-500 hover:underline truncate">
                      {url.title || url.uri}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 animate-pulse">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              </div>
              {mode === 'thinking' && <p className="text-[10px] text-gray-500 mt-2">Analyzing complex compliance data...</p>}
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:border-[#003366] dark:text-white text-sm"
          />
          <button 
            onClick={() => handleSend()}
            disabled={loading}
            className="p-2 bg-[#003366] text-white rounded-xl disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
