
import React, { useState, useEffect } from 'react';
import { Contact, TestAppointment, Invoice } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  initialData?: any;
  onComplete: () => void;
}

const InvoiceApp: React.FC<Props> = ({ onComplete, initialData }) => {
  const [invoiceDate] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  const [invoiceNumber] = useState('INV' + Math.floor(100 + Math.random() * 900));
  
  const [billTo, setBillTo] = useState<Contact>({
    name: initialData?.name || 'New Client',
    company: initialData?.company || 'New Fleet Entity',
    address: initialData?.address || 'Street Address Required',
    cityState: initialData?.cityState || 'City, CA 9XXXX',
    phone: initialData?.phone || 'Phone Required',
    email: initialData?.email || 'Email Required'
  });

  const [items, setItems] = useState<TestAppointment[]>([
    {
        id: '1',
        testName: 'CTC- OBD Submission',
        testDate: new Date().toLocaleString(),
        testId: Math.floor(1000000 + Math.random() * 9000000).toString(),
        eVin: initialData?.vin || 'VIN REQUIRED',
        userVin: initialData?.vin || 'VIN REQUIRED',
        plate: initialData?.plate || 'PLATE REQUIRED',
        comment: 'Regulatory compliance verified via Field Intake.',
        result: 'PASS',
        resultMessage: 'OBD (Onboard Diagnostic)',
        amount: 75.00
    }
  ]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const BUSINESS_INFO = {
    company: "Norcal CARB Mobile LLC",
    businessNumber: "916-890-4427",
    address: "4810 7th Ave",
    zip: "Sacramento, CA 95820",
    phone: "9168904427",
    website: "www.norcalcarbmobile.com",
    email: "sales@norcalcarbmobile.com"
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-1000">
      <div className="flex justify-between items-center mb-10 no-print px-4">
        <div className="space-y-1">
            <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Invoice Hub</h2>
            <p className="text-[10px] font-black text-carb-accent uppercase tracking-[0.4em] italic">Command Sync Active</p>
        </div>
        <button onClick={onComplete} className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic border border-white/5 px-4 py-2 rounded-xl">Return to Hub</button>
      </div>

      <div className="bg-white text-slate-900 shadow-2xl rounded-[3rem] p-10 sm:p-20 border border-white/10 mx-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between mb-20 gap-12 relative z-10">
          <div className="flex items-start gap-8">
            <div className="w-48 h-48 bg-slate-900 rounded-3xl flex flex-col items-center justify-center p-6 shadow-xl">
                <span className="text-white text-4xl font-black italic tracking-tighter">NORCAL</span>
                <span className="text-carb-green text-3xl font-black italic tracking-tighter -mt-2">CARB</span>
            </div>
            <div className="space-y-1.5 text-[13px] font-bold text-slate-600">
              <h1 className="text-3xl font-black text-slate-900 mb-3 italic uppercase tracking-tighter">{BUSINESS_INFO.company}</h1>
              <p>{BUSINESS_INFO.address}</p>
              <p>{BUSINESS_INFO.zip}</p>
              <p className="pt-4 font-black text-carb-accent">{BUSINESS_INFO.website}</p>
            </div>
          </div>
          
          <div className="text-right space-y-6">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Invoice Control</p>
                <p className="text-3xl font-black italic tracking-tighter text-slate-900">{invoiceNumber}</p>
            </div>
            <div className="pt-8 border-t border-slate-100">
                <p className="text-[10px] font-black text-carb-accent uppercase tracking-[0.4em] mb-1">Account Balance Due</p>
                <p className="text-4xl font-black italic tracking-tighter text-slate-900">USD ${totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mb-16 space-y-3 relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Billing Recipient</p>
            <h2 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">{billTo.company}</h2>
            <div className="pl-1 space-y-1 text-slate-500 font-bold text-sm">
              <p>{billTo.name}</p>
              <p>{billTo.email}</p>
            </div>
        </div>

        <div className="mb-20 relative z-10">
            <div className="bg-slate-900 text-white px-8 py-5 flex justify-between text-[11px] font-black uppercase tracking-[0.4em] italic rounded-2xl">
                <span>Services</span>
                <span>Total</span>
            </div>
            <div className="divide-y divide-slate-100">
                {items.map((item) => (
                    <div key={item.id} className="py-10 flex justify-between items-start gap-16 group hover:bg-slate-50 transition-colors rounded-2xl px-6 -mx-6">
                        <div className="space-y-4 text-sm font-bold flex-1">
                            <h4 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">{item.testName}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-slate-500">
                                <div><p className="text-[8px] uppercase tracking-widest text-slate-400">VIN</p><p className="text-slate-900 font-mono">{item.userVin}</p></div>
                                <div><p className="text-[8px] uppercase tracking-widest text-slate-400">Date</p><p className="text-slate-900 italic">{item.testDate}</p></div>
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">${item.amount.toFixed(2)}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex flex-col items-end gap-3 border-t-2 border-slate-900 pt-10">
            <div className="flex justify-between w-full max-w-md bg-slate-900 p-8 mt-6 rounded-[2rem] text-white">
                <p className="text-[10px] font-black text-carb-accent uppercase tracking-[0.4em] italic">Net Balance Due</p>
                <span className="text-4xl font-black italic tracking-tighter">${totalAmount.toFixed(2)}</span>
            </div>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-8 no-print">
        <button onClick={() => setShowPaymentModal(true)} className="group relative flex items-center gap-4 px-16 py-7 bg-slate-900 text-white font-black rounded-[2.5rem] uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-95 transition-all italic">
          <div className="w-8 h-8 bg-carb-green rounded-full flex items-center justify-center text-slate-900 text-lg shadow-lg">💳</div>
          <span>Process Settlement via Stripe</span>
        </button>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-sm italic">S</div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic">Stripe Merchant Portal</span>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-300 hover:text-slate-900 text-2xl p-2 transition-colors">✕</button>
            </div>
            <div className="p-10 space-y-10">
                <div className="text-center space-y-2">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Total Authorization</p>
                    <p className="text-6xl font-black italic tracking-tighter text-slate-900">${totalAmount.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => { triggerHaptic('success'); alert("Payment Approved. Record Finalized."); onComplete(); }}
                  className="w-full py-7 bg-slate-900 text-white font-black rounded-[2.5rem] uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-95 italic"
                >
                  Confirm Authorization
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceApp;
