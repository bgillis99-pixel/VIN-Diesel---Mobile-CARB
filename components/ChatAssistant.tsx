import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, speakText } from '../services/geminiService';
import { Message } from '../types';

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Hello! I am your CARB CTC Assistant. How can I help you navigate the new regulations today?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | undefined>(undefined);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location access denied")
      );
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendMessage(input, history, location);
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'model', text: response.text, timestamp: Date.now(), groundingUrls: response.groundingUrls
      }]);
      if (voiceEnabled && response.text) speakText(response.text);
    } catch (error) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Service temporarily unavailable. Please try again.", timestamp: Date.now() }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] animate-in fade-in duration-500">
      <div className="bg-slate-800/80 p-5 rounded-t-[2.5rem] flex justify-between items-center shadow-xl border-x border-t border-white/5 backdrop-blur-lg">
          <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <div>
                  <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest italic leading-tight">CTC ASSISTANT</h2>
                  <p className="text-[8px] font-bold text-carb-accent uppercase tracking-[0.2em]">{location ? '📍 Grounding Active' : 'Regulations Expert'}</p>
              </div>
          </div>
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${voiceEnabled ? 'bg-carb-accent text-slate-900 shadow-lg' : 'bg-slate-900 text-slate-500'}`}>
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-900/30 border-x border-white/5 backdrop-blur-md">
          {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] p-4 rounded-[1.5rem] text-[13px] font-medium leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-carb-accent/20 text-slate-100 border border-carb-accent/30 rounded-tr-none' 
                      : 'bg-slate-800/60 text-slate-300 border border-white/5 rounded-tl-none'
                  }`}>
                      {msg.text}
                      {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                              <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Sources:</p>
                              {msg.groundingUrls.map((url, i) => (
                                  <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-carb-accent hover:underline truncate italic text-[11px]">
                                      <span className="truncate">{url.title || 'Official Document'}</span>
                                  </a>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          ))}
          {loading && <div className="text-[9px] font-black text-carb-accent uppercase tracking-widest animate-pulse pl-2">Syncing Knowledge...</div>}
          <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-900/40 rounded-b-[2.5rem] border-x border-b border-white/5 shadow-xl backdrop-blur-xl">
          <div className="flex gap-2 bg-slate-950/40 p-1.5 rounded-2xl border border-white/5">
              <input 
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about quarterly deadlines..."
                className="flex-1 bg-transparent py-3 px-4 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-700"
              />
              <button onClick={handleSend} className="bg-carb-accent text-slate-950 px-5 rounded-xl active-haptic font-black text-lg transition-colors hover:bg-carb-accent/80">➔</button>
          </div>
      </div>
    </div>
  );
};

export default ChatAssistant;