import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/geminiService';
import { Message } from '../types';
import { trackEvent } from '../services/analytics';

interface ExtendedMessage extends Message {
  isOffline?: boolean;
}

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([
    { id: 'init', role: 'model', text: 'Hello! I am VIN DIESEL AI. Ask me about CARB regulations, find testers near you, or clarify complex compliance rules.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escalation Modal State
  const [showEscalation, setShowEscalation] = useState(false);
  const [escName, setEscName] = useState('');
  const [escPhone, setEscPhone] = useState('');
  const [escIssue, setEscIssue] = useState('');
  const [escSubmitted, setEscSubmitted] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          const updated = [question, ...existing.filter((q: string) => q !== question)].slice(0, 5);
          localStorage.setItem('vin_diesel_recent_questions', JSON.stringify(updated));
      } catch (e) {
          console.error("Failed to save question", e);
      }
  };

  const handleSend = async (textOverride?: string, imageFile?: File) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && !imageFile) || loading) return;
    
    if (!imageFile && textToSend) {
        saveRecentQuestion(textToSend);
        trackEvent('chat_send', { message_length: textToSend.length });
    }

    if (imageFile) {
        trackEvent('chat_upload_image');
    }

    const userMsg: ExtendedMessage = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: imageFile ? `[Uploaded Image: ${imageFile.name}] ${textToSend || 'Analyze this image.'}` : textToSend, 
        timestamp: Date.now() 
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
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

      const history = messages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

      const response: any = await sendMessage(
          imageFile ? (textToSend || "Analyze this image.") : textToSend, 
          'search', // Force Search Mode by default for online queries
          history, 
          undefined, 
          imageData
      );

      const botMsg: ExtendedMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls,
        isOffline: response.isOffline
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error(error);
      const contactInfo = "\n\n📞 **IMMEDIATE SUPPORT:**\nText/Call: 617-359-6953";
      
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: "⚠️ Connection Failed. " + contactInfo, 
          timestamp: Date.now() 
      }]);
      trackEvent('chat_error');
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

  const handleDownloadChat = () => {
      const chatText = messages
          .filter(m => m.id !== 'init')
          .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.text}`)
          .join('\n\n');
      
      const blob = new Blob([chatText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carb-chat.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      trackEvent('chat_download_history');
  };

  const submitEscalation = () => {
      if (!escName || !escPhone) return alert("Please fill in Name and Phone.");
      
      // Save data locally (Simulating a backend save)
      const escalationData = {
          id: Date.now(),
          name: escName,
          phone: escPhone,
          issue: escIssue,
          timestamp: new Date().toISOString()
      };
      
      try {
          const existing = JSON.parse(localStorage.getItem('carb_escalations') || '[]');
          localStorage.setItem('carb_escalations', JSON.stringify([escalationData, ...existing]));
          setEscSubmitted(true);
          trackEvent('chat_escalation_submitted');
      } catch (e) {
          alert("Error saving data");
      }
  };

  if (showEscalation) {
      return (
          <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col p-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-[#003366] dark:text-white">Escalate to CARB</h2>
                  <button onClick={() => setShowEscalation(false)} className="text-gray-500 text-xl font-bold">✕</button>
              </div>

              {!escSubmitted ? (
                  <div className="flex-1 space-y-6">
                      <div className="bg-yellow-50 p-4 rounded-xl border-l-4 border-yellow-400">
                          <p className="text-sm text-yellow-800 font-bold">
                              We will document your issue in our knowledge base before providing the official CARB contact methods.
                          </p>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                          <input type="text" value={escName} onChange={e => setEscName(e.target.value)} className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                          <input type="tel" value={escPhone} onChange={e => setEscPhone(e.target.value)} className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">What is the issue?</label>
                          <textarea rows={4} value={escIssue} onChange={e => setEscIssue(e.target.value)} className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600" placeholder="e.g. My account is blocked but I paid..." />
                      </div>
                      
                      <button onClick={submitEscalation} className="w-full py-4 bg-[#003366] text-white font-bold rounded-xl shadow-lg">
                          SUBMIT & GET CARB CONTACT
                      </button>
                  </div>
              ) : (
                  <div className="flex-1 space-y-8 text-center pt-10">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                      <div>
                          <h3 className="text-xl font-bold text-[#003366] dark:text-white">Data Saved.</h3>
                          <p className="text-gray-500">You can now contact CARB directly.</p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                          <div className="text-left">
                              <p className="text-xs font-bold text-gray-400 uppercase">Official Email</p>
                              <a href="mailto:hdim@arb.ca.gov" className="text-lg font-bold text-[#003366] dark:text-blue-400 underline">hdim@arb.ca.gov</a>
                          </div>
                          <div className="text-left">
                              <p className="text-xs font-bold text-gray-400 uppercase">Official Hotline</p>
                              <a href="tel:8666343735" className="text-lg font-bold text-[#003366] dark:text-blue-400 underline">866-634-3735</a>
                          </div>
                      </div>

                      <button onClick={() => setShowEscalation(false)} className="text-gray-500 font-bold hover:text-gray-800">Close</button>
                  </div>
              )}
          </div>
      );
  }

  return (
    // Updated Height calculation for mobile safety (dvh) and reduced bottom padding
    <div className="flex flex-col h-[calc(100dvh-150px)] bg-white dark:bg-gray-800 rounded-2xl border border-[#003366] dark:border-gray-600 overflow-hidden shadow-xl">
      
      {/* COMPACT HEADER */}
      <div className="bg-[#003366] dark:bg-gray-900 text-white p-2 px-3 flex justify-between items-center shadow-md z-10">
        <div>
            <h2 className="font-bold text-sm leading-tight">VIN DIESEL AI</h2>
            <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-[9px] opacity-80">Online</span>
            </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowEscalation(true); trackEvent('chat_open_escalation'); }} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors">
            CARB HELP
          </button>
          <button onClick={handleDownloadChat} className="text-white hover:text-green-400 p-1">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-white hover:text-green-400 p-1">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f8f9fa] dark:bg-gray-800 scroll-smooth">
        {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
                <button onClick={() => handleSend('Why is my vehicle blocked?')} className="bg-white dark:bg-gray-700 border border-gray-300 text-gray-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-gray-50">Why am I blocked?</button>
                <button onClick={() => handleSend('Lost Password')} className="bg-white dark:bg-gray-700 border border-gray-300 text-gray-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-gray-50">Lost Password?</button>
                <button onClick={() => handleSend('Next Test Deadline?')} className="bg-white dark:bg-gray-700 border border-gray-300 text-gray-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-gray-50">Test Deadline?</button>
            </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm font-medium shadow-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-[#003366] text-white rounded-br-none' 
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              
              {/* Sources Display */}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs">
                  <p className="font-bold mb-1 text-gray-700 dark:text-gray-400">Sources:</p>
                  {msg.groundingUrls.map((url, idx) => (
                    <a key={idx} href={url.uri} target="_blank" rel="noopener noreferrer" className="block text-[#15803d] hover:underline truncate mb-1">
                      {url.title || url.uri}
                    </a>
                  ))}
                </div>
              )}

              {/* Offline Indicator */}
              {msg.isOffline && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                     <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                         📡 Offline Mode
                     </span>
                  </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 p-2 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-[#15803d] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#15803d] rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-[#15803d] rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about compliance..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border-2 border-[#003366] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#15803d] font-medium text-base shadow-inner"
          />
          <button 
            onClick={() => handleSend()}
            disabled={loading}
            className="absolute right-2 p-2 bg-[#003366] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;