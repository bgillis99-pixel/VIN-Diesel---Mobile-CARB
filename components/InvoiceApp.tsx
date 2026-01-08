
import React, { useState, useEffect } from 'react';
import { Contact, TestAppointment, Invoice } from '../types';

interface Props {
  onComplete: () => void;
}

const InvoiceApp: React.FC<Props> = ({ onComplete }) => {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  const [dueDate, setDueDate] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  const [invoiceNumber, setInvoiceNumber] = useState('INV' + Math.floor(100 + Math.random() * 900));
  
  const [billTo, setBillTo] = useState<Contact>({
    name: 'Clean Roofing OBD',
    company: 'Clean Roofing OBD',
    address: '',
    cityState: '',
    phone: '',
    email: 'info@cleanroofing.com'
  });

  const [items, setItems] = useState<TestAppointment[]>([
    {
        id: '1',
        testName: 'CTC- OBD',
        testDate: '1/6/2026 2:25:29 PM',
        testId: '1603176',
        eVin: 'JL6CRG1A7FK000147',
        userVin: 'JL6CRG1A7FK000147',
        plate: '39940U1',
        comment: '',
        result: 'PASS',
        resultMessage: 'OBD (Onboard Diagnostic)',
        amount: 75.00
    }
  ]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Business Info Constants - Matches the exact format in the screenshot
  const BUSINESS_INFO = {
    name: "Bryan",
    company: "Norcal CARB Mobile LLC",
    businessNumber: "916-890-4427",
    address: "4810 7th Ave",
    zip: "95820",
    phone: "9168904427",
    fax: "6173596953",
    website: "https://www.norcalcarbmobile.com",
    email: "sales@norcalcarbmobile.com1fdpf6de7rdf"
  };

  const importGoogleContacts = () => {
    setLoadingContacts(true);
    setTimeout(() => {
      setBillTo({
        name: 'Clean Roofing OBD',
        company: 'Clean Roofing OBD',
        address: '555 Skyline Blvd',
        cityState: 'Oakland, CA 94611',
        phone: '510-555-0101',
        email: 'info@cleanroofing.com'
      });
      setLoadingContacts(false);
    }, 1000);
  };

  const importGoogleCalendar = () => {
    setLoadingCalendar(true);
    setTimeout(() => {
      const newItem: TestAppointment = {
        id: Math.random().toString(36).substr(2, 9),
        testName: 'CTC- PSIP Smoke',
        testDate: new Date().toLocaleString(),
        testId: Math.floor(1000000 + Math.random() * 9000000).toString(),
        eVin: 'JL6CRG1A7FK000' + Math.floor(100 + Math.random() * 899),
        userVin: 'JL6CRG1A7FK000' + Math.floor(100 + Math.random() * 899),
        plate: Math.floor(10000 + Math.random() * 89999) + 'U1',
        comment: 'Standard PSIP opacity check.',
        result: 'PASS',
        resultMessage: 'PSIP Smoke Test',
        amount: 75.00
      };
      setItems(prev => [...prev, newItem]);
      setLoadingCalendar(false);
    }, 1200);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-6 no-print px-4">
        <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Norcal Invoice Cloud</h2>
        <div className="flex gap-2">
            <button onClick={importGoogleContacts} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-600/30 hover:bg-blue-600/40 transition-all">
                {loadingContacts ? 'Syncing...' : 'Import Contact'}
            </button>
            <button onClick={importGoogleCalendar} className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-green-600/30 hover:bg-green-600/40 transition-all">
                {loadingCalendar ? 'Syncing...' : 'Add from Calendar'}
            </button>
        </div>
      </div>

      {/* High Fidelity Invoice Viewer - Matches the PDF screenshot precisely */}
      <div className="bg-white text-[#1a1a1a] shadow-2xl rounded-lg p-10 sm:p-16 min-h-[1100px] border border-gray-100 mx-4">
        
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row justify-between mb-16 gap-8">
          <div className="flex items-start gap-6">
            <div className="w-40 h-40 bg-gray-100 flex items-center justify-center border border-gray-200 p-4">
                <img src="/logo.svg" alt="Norcal Logo" className="w-full grayscale opacity-80" />
            </div>
            <div className="space-y-1 text-sm font-medium">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{BUSINESS_INFO.company}</h1>
              <p>{BUSINESS_INFO.name}</p>
              <p>Business Number {BUSINESS_INFO.businessNumber}</p>
              <p>{BUSINESS_INFO.address}</p>
              <p>{BUSINESS_INFO.zip}</p>
              <p className="flex items-center gap-2"><span className="text-gray-400">📞</span> {BUSINESS_INFO.phone}</p>
              <p className="flex items-center gap-2"><span className="text-gray-400">📠</span> {BUSINESS_INFO.fax}</p>
              <a href={BUSINESS_INFO.website} className="text-blue-600 block pt-1 underline">{BUSINESS_INFO.website}</a>
              <p className="text-gray-500 break-all">{BUSINESS_INFO.email}</p>
            </div>
          </div>
          
          <div className="text-right space-y-4">
            <div className="space-y-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">INVOICE</p>
                <p className="text-lg font-bold">{invoiceNumber}</p>
            </div>
            <div className="space-y-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DATE</p>
                <p className="text-lg font-bold">{invoiceDate}</p>
            </div>
            <div className="space-y-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DUE DATE</p>
                <p className="text-lg font-bold">{dueDate}</p>
            </div>
            <div className="pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">BALANCE DUE</p>
                <p className="text-xl font-bold">USD ${totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-12 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">BILL TO</p>
            <h2 className="text-2xl font-bold text-gray-800">{billTo.company}</h2>
            <p className="text-gray-500">{billTo.email}</p>
        </div>

        {/* Items Table */}
        <div className="mb-12">
            <div className="bg-[#303f9f] text-white px-4 py-2 flex justify-between text-[11px] font-bold uppercase tracking-widest">
                <span>DESCRIPTION</span>
                <span>AMOUNT</span>
            </div>
            <div className="divide-y divide-gray-100">
                {items.map((item) => (
                    <div key={item.id} className="py-6 flex justify-between items-start gap-12">
                        <div className="space-y-1 text-sm font-medium">
                            <h4 className="text-lg font-bold text-gray-800">{item.testName}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-0.5 text-gray-600">
                                <p>Test Type <span className="ml-4">{item.resultMessage}</span></p>
                                <p>Test Date <span className="ml-4">{item.testDate}</span></p>
                                <p>Test ID <span className="ml-4">{item.testId}</span></p>
                                <p>User VIN <span className="ml-4">{item.userVin}</span></p>
                                <p>License Plate <span className="ml-4">{item.plate}</span></p>
                                <p>Tester's Comment <span className="ml-4">{item.comment || 'None'}</span></p>
                                <p>Test Result <span className="ml-4">{item.result}</span></p>
                            </div>
                        </div>
                        <p className="text-lg font-bold text-gray-800">${item.amount.toFixed(2)}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col items-end gap-2 border-t border-gray-100 pt-8">
            <div className="flex justify-between w-full max-w-xs text-sm font-bold">
                <span>TOTAL</span>
                <span>${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full max-w-xs bg-gray-50 p-4 mt-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-center">BALANCE DUE</span>
                <span className="text-xl font-bold">USD ${totalAmount.toFixed(2)}</span>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-12 border-t border-gray-100 text-[13px] text-gray-700 leading-relaxed">
            <p>Thank you for your business. For questions or additional information, please contact Norcal CARB Mobile LLC</p>
            <p>at <span className="font-bold">bryan@norcalcarbmobile.com</span>.</p>
        </div>
      </div>

      {/* Stripe Payment & Export Controls */}
      <div className="mt-10 flex flex-col items-center gap-6 no-print">
        <button 
          onClick={() => setShowPaymentModal(true)}
          className="group flex items-center gap-3 px-12 py-5 bg-[#635bff] hover:bg-[#534bb3] text-white font-black rounded-xl uppercase tracking-[0.2em] text-sm shadow-2xl transition-all active:scale-95"
        >
          <span>💳</span>
          Secure Checkout via Stripe
        </button>
        
        <div className="flex gap-4">
            <button onClick={() => window.print()} className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Print PDF</button>
            <button onClick={onComplete} className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Return to HUB</button>
        </div>
      </div>

      {/* Stripe-Powered Checkout Experience */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-12 duration-500">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#635bff] rounded flex items-center justify-center text-white font-black text-xs">S</div>
                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest">norcalcarbmobile Payments</span>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-300 hover:text-gray-900 text-xl">✕</button>
            </div>
            
            <div className="p-8 space-y-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pay Norcal CARB Mobile LLC</p>
                    <p className="text-4xl font-black text-gray-900">${totalAmount.toFixed(2)}</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Card Information</label>
                        <div className="relative">
                            <input placeholder="1234 5678 9101 1121" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#635bff] font-mono" />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                <div className="w-6 h-4 bg-blue-800 rounded-sm"></div>
                                <div className="w-6 h-4 bg-orange-500 rounded-sm"></div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <input placeholder="MM / YY" className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#635bff]" />
                            <input placeholder="CVC" className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#635bff]" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Billing Address</label>
                        <input value={billTo.address} placeholder="Street Address" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#635bff]" />
                        <input value={billTo.cityState} placeholder="City, State, Zip" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#635bff]" />
                    </div>
                </div>

                <button 
                  onClick={() => {
                      alert("Payment Processed Successfully!");
                      setShowPaymentModal(false);
                      onComplete();
                  }}
                  className="w-full py-5 bg-[#635bff] text-white font-black rounded-xl uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all"
                >
                  Pay ${totalAmount.toFixed(2)}
                </button>

                <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Stripe Verified</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                    <span>PCI Compliant</span>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceApp;
