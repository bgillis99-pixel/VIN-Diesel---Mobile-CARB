import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/geminiService';
import { Message } from '../types';

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Hello! I am VIN DIESEL AI. Ask me about CARB regulations, find testers near you, or clarify complex compliance rules.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'standard' | 'search' | 'maps' | 'thinking'>('standard');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let location;
      if (mode === 'maps') {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          console.warn("Location denied, proceeding without precise location.");
        }
      }

      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendMessage(userMsg.text, mode, history, location);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls,
        isThinking: mode === 'thinking'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error connecting to headquarters.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-2xl border-2 border-[#003366] overflow-hidden">
      <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
        <h2 className="font-bold text-lg">VIN DIESEL AI</h2>
        <div className="flex gap-2 text-xs">
          <button onClick={() => setMode('standard')} className={`px-2 py-1 rounded ${mode === 'standard' ? 'bg-[#00C853] text-white' : 'bg-blue-900 text-gray-300'}`}>Fast</button>
          <button onClick={() => setMode('search')} className={`px-2 py-1 rounded ${mode === 'search' ? 'bg-[#00C853] text-white' : 'bg-blue-900 text-gray-300'}`}>Web</button>
          <button onClick={() => setMode('maps')} className={`px-2 py-1 rounded ${mode === 'maps' ? 'bg-[#00C853] text-white' : 'bg-blue-900 text-gray-300'}`}>Maps</button>
          <button onClick={() => setMode('thinking')} className={`px-2 py-1 rounded ${mode === 'thinking' ? 'bg-[#00C853] text-white' : 'bg-blue-900 text-gray-300'}`}>Deep Think</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa]">
        {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setInput('Why is my vehicle blocked?')} className="bg-white border border-[#00C853] text-[#003366] px-3 py-1 rounded-full text-xs font-bold hover:bg-[#e6f4ea]">Why am I blocked?</button>
                <button onClick={() => setInput('Lost Password')} className="bg-white border border-[#00C853] text-[#003366] px-3 py-1 rounded-full text-xs font-bold hover:bg-[#e6f4ea]">Lost Password?</button>
                <button onClick={() => setInput('When is my next test deadline?')} className="bg-white border border-[#00C853] text-[#003366] px-3 py-1 rounded-full text-xs font-bold hover:bg-[#e6f4ea]">Next Test Deadline?</button>
            </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm font-medium shadow-sm ${
              msg.role === 'user' 
                ? 'bg-[#003366] text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-[#003366] rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                  <p className="font-bold mb-1 text-gray-500">Sources:</p>
                  {msg.groundingUrls.map((url, idx) => (
                    <a key={idx} href={url.uri} target="_blank" rel="noopener noreferrer" className="block text-[#00C853] hover:underline truncate mb-1">
                      {url.title || url.uri}
                    </a>
                  ))}
                </div>
              )}
              {msg.isThinking && <div className="mt-1 text-[10px] text-[#00C853] font-bold uppercase tracking-wider">Thinking Mode Analysis</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#00C853] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#00C853] rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-[#00C853] rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={mode === 'maps' ? "Find a diesel tester near me..." : "Ask about compliance..."}
            className="w-full pl-4 pr-12 py-3 rounded-full border-2 border-[#003366] bg-white text-[#003366] placeholder:text-gray-400 focus:outline-none focus:border-[#00C853] font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="absolute right-2 p-2 bg-[#003366] text-white rounded-full hover:bg-[#00C853] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;