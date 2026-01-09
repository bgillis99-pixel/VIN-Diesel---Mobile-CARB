
import React, { useState, useEffect } from 'react';
import { Contact, TestAppointment } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  initialData?: any;
  onComplete: () => void;
}

const InvoiceApp: React.FC<Props> = ({ onComplete, initialData }) => {
  const [invoiceNumber] = useState('INV-' + Math.floor(1000 + Math.random() * 9000));
  const [invoiceDate] = useState(new Date().toLocaleDateString());
  
  const [billTo, setBillTo] = useState<Contact>({
    name: initialData?.name || initialData?.clientName || '',
    company: initialData?.company || initialData?.clientName || '',
    address: initialData?.address || '',
    cityState: initialData?.cityState || '',
    phone: initialData?.phone || '',
    email: initialData?.email || ''
  });

  const [items, setItems] = useState<TestAppointment[]>([
    {
      id: '1',
      type: 'OBD',
      truckNumber: initialData?.truckNumber || '',
      details: 'Clean Truck Check OBD Verification',
      amount: 75.00,
      date: new Date().toLocaleDateString()
    }
  ]);

  const [includeReview, setIncludeReview] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const addItem = (type: 'OBD' | 'OVI' | 'OTHER') => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      truckNumber: '',
      details: type === 'OBD' ? 'Standard OBD Scan' : type === 'OVI' ? 'Visual Inspection' : '',
      amount: 75.00,
      date: new Date().toLocaleDateString()
    }]);
    triggerHaptic('light');
  };

  const updateItem = (id: string, field: keyof TestAppointment, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const handleShare = (method: 'sms' | 'email') => {
    const paymentLink = `https://stripe.com/pay/${invoiceNumber}`;
    const text = `Invoice ${invoiceNumber} for ${billTo.company || billTo.name}: $${total.toFixed(2)}. Pay securely via Stripe: ${paymentLink} (Venmo/Apple/Google Pay accepted)`;
    
    if (method === 'sms') {
      window.location.href = `sms:${billTo.phone || ''}?body=${encodeURIComponent(text)}`;
    } else {
      window.location.href = `mailto:${billTo.email || ''}?subject=Invoice ${invoiceNumber} - NorCal CARB Compliance&body=${encodeURIComponent(text)}`;
    }
    triggerHaptic('medium');
  };

  return (
    <div className="max-w-2xl mx-auto pb-40 animate-in fade-in duration-700 bg-slate-950 min-h-screen sm:bg-transparent">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex justify-between items-center py-4 px-6 bg-slate-950/80 backdrop-blur-md border-b border-white/5 no-print sm:rounded-t-[2rem]">
        <button onClick={onComplete} className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
          <span>‹</span> COMMAND HUB
        </button>
        <div className="flex items-center gap-4">
           <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">Review Link</span>
              <div 
                onClick={() => { triggerHaptic('light'); setIncludeReview(!includeReview); }}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${includeReview ? 'bg-carb-green' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-lg ${includeReview ? 'left-7' : 'left-1'}`}></div>
              </div>
           </label>
        </div>
      </div>

      {/* Main Invoice Sheet */}
      <div className="bg-white text-slate-900 rounded-b-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 sm:p-14 border border-white/10 relative overflow-hidden mx-auto">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rotate-45 pointer-events-none"></div>

        {/* Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-14 gap-8">
           <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                 <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-slate-950">NORCAL</h1>
                 <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-carb-green">CARB</h1>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Mobile Testing LLC • Sacramento</p>
           </div>
           <div className="text-left sm:text-right space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Official Service Record</p>
              <p className="text-2xl font-black italic text-slate-900 leading-none">{invoiceNumber}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{invoiceDate}</p>
           </div>
        </div>

        {/* Client Billing Info */}
        <div className="mb-14 space-y-4">
           <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <p className="text-[10px] font-black text-carb-accent uppercase tracking-widest italic">Client Billing</p>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Legal Name / Company</p>
                <input 
                  value={billTo.company} 
                  onChange={e => setBillTo({...billTo, company: e.target.value})}
                  className="w-full bg-slate-50 border-none p-3 text-sm font-bold uppercase rounded-xl outline-none focus:ring-1 focus:ring-carb-accent"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact Email</p>
                <input 
                  value={billTo.email} 
                  onChange={e => setBillTo({...billTo, email: e.target.value})}
                  className="w-full bg-slate-50 border-none p-3 text-sm font-bold rounded-xl outline-none focus:ring-1 focus:ring-carb-accent"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</p>
                <input 
                  value={billTo.phone} 
                  onChange={e => setBillTo({...billTo, phone: e.target.value})}
                  className="w-full bg-slate-50 border-none p-3 text-sm font-bold rounded-xl outline-none focus:ring-1 focus:ring-carb-accent"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mailing Address</p>
                <input 
                  value={billTo.address} 
                  onChange={e => setBillTo({...billTo, address: e.target.value})}
                  className="w-full bg-slate-50 border-none p-3 text-sm font-bold rounded-xl outline-none focus:ring-1 focus:ring-carb-accent"
                />
              </div>
           </div>
        </div>

        {/* Services / Line Items */}
        <div className="space-y-8 mb-14">
           <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] italic text-slate-900">Compliance Services</span>
              <div className="flex gap-2">
                {['OBD', 'OVI', 'OTHER'].map(t => (
                  <button key={t} onClick={() => addItem(t as any)} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-[9px] font-black transition-all active:scale-95">{t} +</button>
                ))}
              </div>
           </div>

           <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="py-8 space-y-4 group animate-in slide-in-from-right-4 duration-300">
                   <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-wrap items-center gap-3 flex-1">
                        <span className="bg-slate-950 text-white px-3 py-1.5 rounded-lg text-[10px] font-black italic tracking-widest">{item.type}</span>
                        <div className="relative flex-1 min-w-[140px]">
                           <p className="absolute -top-3 left-2 text-[7px] font-black text-slate-400 uppercase">Truck / Unit #</p>
                           <input 
                            placeholder="e.g. T-105" 
                            value={item.truckNumber} 
                            onChange={e => updateItem(item.id, 'truckNumber', e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 px-4 py-3 rounded-xl text-xs font-black uppercase outline-none border-2 border-transparent focus:border-carb-accent/20"
                           />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative text-right">
                           <p className="absolute -top-3 right-0 text-[7px] font-black text-slate-400 uppercase">Amount</p>
                           <input 
                            type="number"
                            value={item.amount} 
                            onChange={e => updateItem(item.id, 'amount', e.target.value)}
                            className="w-24 text-right font-black italic text-xl outline-none bg-transparent"
                           />
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50">✕</button>
                      </div>
                   </div>
                   <div className="relative">
                      <p className="absolute -top-3 left-3 text-[7px] font-black text-slate-400 uppercase">Audit Details / OVI Remarks</p>
                      <textarea 
                        placeholder="Detail observations, defects, or regulatory notes here..."
                        value={item.details}
                        onChange={e => updateItem(item.id, 'details', e.target.value)}
                        className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-bold italic text-slate-600 min-h-[70px] outline-none border-2 border-transparent focus:border-carb-accent/20 resize-none"
                      />
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Totals & QR / Multi-Pay */}
        <div className="flex flex-col items-end gap-10">
           <div className="text-right space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Net Settlement Amount</p>
              <h2 className="text-6xl font-black italic tracking-tighter text-slate-950">${total.toFixed(2)}</h2>
           </div>

           <div className="w-full flex flex-col md:flex-row gap-8 items-center justify-between pt-10 border-t-2 border-slate-950">
              <div className="flex items-center gap-6">
                 <div className="w-28 h-28 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-slate-100 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-carb-accent/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase text-carb-accent">Dynamic QR</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 p-3">
                       {Array.from({length: 25}).map((_, i) => <div key={i} className={`w-3 h-3 rounded-sm ${Math.random() > 0.4 ? 'bg-slate-900' : 'bg-transparent'}`}></div>)}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Scan to Settle</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed max-w-[120px]">Scan with phone camera for instant checkout.</p>
                 </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-4">
                 <button 
                  onClick={() => setShowPaymentModal(true)} 
                  className="w-full sm:w-auto bg-slate-950 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase italic tracking-[0.2em] active-haptic shadow-2xl hover:bg-carb-accent transition-all group flex items-center justify-center gap-3"
                 >
                   <span className="text-lg group-hover:scale-125 transition-transform">💳</span>
                   STRIPE CHECKOUT
                 </button>
                 <div className="flex flex-wrap justify-center md:justify-end gap-2">
                    {['PayPal', 'Venmo', 'Apple', 'Google'].map(p => (
                      <button key={p} onClick={() => triggerHaptic('light')} className="bg-slate-50 px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-100">{p}</button>
                    ))}
                 </div>
              </div>
           </div>

           {includeReview && (
             <div className="w-full mt-8 p-8 bg-carb-accent/5 rounded-[2.5rem] border border-carb-accent/10 text-center space-y-3 animate-in zoom-in duration-500">
                <div className="flex justify-center gap-1 text-yellow-500 text-xl">★★★★★</div>
                <p className="text-[11px] font-black text-slate-950 uppercase tracking-widest italic">Proactive Service Review</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase px-12 leading-relaxed">As a local small business, your feedback keeps our mobile units running. Support our mission to educate the fleet community.</p>
                <a href="https://g.page/norcalcarb/review" target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-black underline text-carb-accent hover:text-carb-navy transition-colors">GO TO GOOGLE BUSINESS PROFILE</a>
             </div>
           )}
        </div>
      </div>

      {/* Sharing & Management Actions */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 no-print">
         <button onClick={() => handleShare('sms')} className="py-7 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active-haptic hover:bg-white/10 transition-all">
            <span className="text-3xl">📱</span>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Dispatch via SMS</span>
         </button>
         <button onClick={() => handleShare('email')} className="py-7 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active-haptic hover:bg-white/10 transition-all">
            <span className="text-3xl">📧</span>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Dispatch via Email</span>
         </button>
      </div>

      {/* Stripe Payment Settlement Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-6 no-print">
           <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white italic font-black text-lg shadow-xl">S</div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black uppercase text-slate-950 tracking-[0.2em] italic">Stripe Merchant Portal</span>
                       <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Authorized Transaction ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                    </div>
                 </div>
                 <button onClick={() => setShowPaymentModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors text-2xl p-2">✕</button>
              </div>
              <div className="p-10 sm:p-14 text-center space-y-12">
                 <div className="space-y-3">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Total Authorization Amount</p>
                    <p className="text-7xl font-black italic tracking-tighter text-slate-950">${total.toFixed(2)}</p>
                 </div>
                 
                 <div className="space-y-4">
                   <button 
                    onClick={() => { 
                      triggerHaptic('success'); 
                      alert("Stripe: Payment Processed. Syncing Record to WAVE Bookkeeping..."); 
                      setShowPaymentModal(false); 
                      onComplete(); 
                    }}
                    className="w-full py-8 bg-slate-950 text-white font-black rounded-[2.5rem] uppercase tracking-[0.4em] text-xs italic active-haptic shadow-2xl hover:bg-carb-green transition-all"
                   >
                     CONFIRM SETTLEMENT
                   </button>
                   <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Stripe Connect • WAVE Sync via Make.ai</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Wave Bookkeeping Note */}
      <div className="mt-8 px-10 text-center no-print pb-20">
         <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] italic leading-relaxed">System: This invoice is tracked via WAVE Bookkeeping. AI models are trained to reconcile payments & compliance logs for fleet audits.</p>
      </div>
    </div>
  );
};

export default InvoiceApp;
