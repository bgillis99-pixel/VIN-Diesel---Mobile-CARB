import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/geminiService';
import { Message } from '../types';

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: 'Hello! I am VIN DIESEL AI. Ask me about CARB regulations, find testers near you, or clarify complex compliance rules.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for pending queries from Home Page
  useEffect(() => {
      const pending = sessionStorage.getItem('pending_chat_query');
      if (pending) {
          sessionStorage.removeItem('pending_chat_query');
          handleSend(pending);
      }
  }, []);

  const saveRecentQuestion = (question: string) => {
      if (question.length < 5) return;
      try {
          const existing = JSON.parse(localStorage.getItem('vin_diesel_recent_questions') || '[]');
          // Add to top, unique only, limit to 5
          const updated = [question, ...existing.filter((q: string) => q !== question)].slice(0, 5);
          localStorage.setItem('vin_diesel_recent_questions', JSON.stringify(updated));
      } catch (e) {
          console.error("Failed to save question", e);
      }
  };

  const handleSend = async (textOverride?: string, imageFile?: File) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && !imageFile) || loading) return;
    
    // Save question for Home Page "Common Questions" tracking
    if (!imageFile && textToSend) {
        saveRecentQuestion(textToSend);
    }

    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: imageFile ? `[Uploaded Image: ${imageFile.name}] ${textToSend || 'Analyze this image.'}` : textToSend, 
        timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      // Handle Image Conversion if present
      let imageData;
      if (imageFile) {
          const b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(imageFile);
          });
          imageData = { data: b64, mimeType: imageFile.type };
      }

      // Filter out the 'init' message so the history starts with a 'user' role
      const history = messages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

      // Default to standard mode since UI toggles were removed
      const response = await sendMessage(
          imageFile ? (textToSend || "Analyze this image.") : textToSend, 
          'standard', 
          history, 
          undefined, 
          imageData
      );

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error connecting to headquarters. Please try again.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          handleSend("Analyze this image.", file);
      }
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
            await navigator.share({ title: 'Mobile Carb Check', url: 'https://carbcleantruckcheck.app' });
          } catch (e) { /* ignore dismissals */ }
      } else {
          alert('Share: https://carbcleantruckcheck.app');
      }
  };

  const handleDownloadChat = () => {
      const chatText = messages
          .filter(m => m.id !== 'init')
          .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.text}`)
          .join('\n\n');
      
      const blob = new Blob([chatText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carb-chat-${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleContact = () => {
      window.location.href = 'tel:6173596953';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white dark:bg-gray-800 rounded-2xl border-2 border-[#003366] dark:border-gray-600 overflow-hidden transition-colors">
      <div className="bg-[#003366] dark:bg-gray-900 text-white p-4 flex justify-between items-center transition-colors">
        <h2 className="font-bold text-lg">VIN DIESEL AI</h2>
        <div className="flex gap-4">
          <button onClick={handleShare} className="text-white hover:text-[#15803d] transition-colors" title="Share App">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
          <button onClick={handleDownloadChat} className="text-white hover:text-[#15803d] transition-colors" title="Save Chat">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={handleContact} className="text-white hover:text-[#15803d] transition-colors" title="Contact Support">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-white hover:text-[#15803d] transition-colors" title="Upload Image">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] dark:bg-gray-800 transition-colors">
        {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => handleSend('Why is my vehicle blocked?')} className="bg-white dark:bg-gray-700 border border-[#15803d] text-[#003366] dark:text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#e6f4ea] dark:hover:bg-gray-600">Why am I blocked?</button>
                <button onClick={() => handleSend('Lost Password')} className="bg-white dark:bg-gray-700 border border-[#15803d] text-[#003366] dark:text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#e6f4ea] dark:hover:bg-gray-600">Lost Password?</button>
                <button onClick={() => handleSend('When is my next test deadline?')} className="bg-white dark:bg-gray-700 border border-[#15803d] text-[#003366] dark:text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#e6f4ea] dark:hover:bg-gray-600">Next Test Deadline?</button>
            </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm font-medium shadow-sm ${
              msg.role === 'user' 
                ? 'bg-[#003366] text-white rounded-br-none' 
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[#003366] dark:text-white rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs">
                  <p className="font-bold mb-1 text-gray-500 dark:text-gray-400">Sources:</p>
                  {msg.groundingUrls.map((url, idx) => (
                    <a key={idx} href={url.uri} target="_blank" rel="noopener noreferrer" className="block text-[#15803d] hover:underline truncate mb-1">
                      {url.title || url.uri}
                    </a>
                  ))}
                </div>
              )}
              {msg.isThinking && <div className="mt-1 text-[10px] text-[#15803d] font-bold uppercase tracking-wider">Thinking Mode Analysis</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#15803d] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#15803d] rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-[#15803d] rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about compliance..."
            className="w-full pl-4 pr-12 py-3 rounded-full border-2 border-[#003366] bg-white dark:bg-gray-700 text-[#003366] dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#15803d] font-medium transition-colors"
          />
          <button 
            onClick={() => handleSend()}
            disabled={loading}
            className="absolute right-2 p-2 bg-[#003366] text-white rounded-full hover:bg-[#15803d] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;