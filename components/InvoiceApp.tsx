
import React, { useState, useEffect } from 'react';
import { Contact, TestAppointment, Invoice } from '../types';

interface Props {
  onComplete: () => void;
}

const InvoiceApp: React.FC<Props> = ({ onComplete }) => {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [billTo, setBillTo] = useState<Contact>({
    name: '',
    company: '',
    address: '',
    cityState: '',
    phone: '',
    email: ''
  });
  const [items, setItems] = useState<TestAppointment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Business Info Constants
  const BUSINESS_INFO = {
    name: "Bryan",
    company: "NorCal CARB Mobile",
    number: "916-890-4427",
    address: "4810 7th Ave",
    cityState: "Sacramento, CA 95820",
    phone: "916-890-4427",
    fax: "617-359-6953",
    website: "https://www.norcalcarbmobile.com",
    email: "sales@norcalcarbmobile.com"
  };

  const importGoogleContacts = () => {
    setLoadingContacts(true);
    // Simulate Google Contacts API delay
    setTimeout(() => {
      setBillTo({
        name: 'John Doe',
        company: 'Doe Trucking LLC',
        address: '123 Logistics Way',
        cityState: 'Sacramento, CA 95814',
        phone: '916-555-0199',
        email: 'john@doetrucking.com'
      });
      setLoadingContacts(false);
    }, 1200);
  };

  const importGoogleCalendar = () => {
    setLoadingCalendar(true);
    // Simulate Google Calendar API delay & CARB integration
    setTimeout(() => {
      const newItem: TestAppointment = {
        id: Math.random().toString(36).substr(2, 9),
        testName: 'HD I/M Compliance Smoke Test',
        testDate: new Date().toLocaleDateString(),
        testId: 'CARB-99821-X',
        eVin: '17XTESTVIN99821',
        userVin: '17XTESTVIN99821',
        plate: '8K22190',
        comment: 'Standard periodic smoke opacity test. Vehicle passing with 0.2% opacity.',
        result: 'PASS',
        resultMessage: 'COMPLIANT - VEHICLE MEETS 12/26 PROTOCOLS',
        amount: 85.00
      };
      setItems(prev => [...prev, newItem]);
      setLoadingCalendar(false);
    }, 1500);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Invoice Generator</h2>
        <div className="flex gap-2">
            <button onClick={importGoogleContacts} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-600/30 hover:bg-blue-600/30 transition-all">
                {loadingContacts ? 'Syncing Contacts...' : 'Import Contact'}
            </button>
            <button onClick={importGoogleCalendar} className="px-4 py-2 bg-green-600/20 text-green-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-600/30 hover:bg-green-600/30 transition-all">
                {loadingCalendar ? 'Syncing Calendar...' : 'Pull Appt Data'}
            </button>
        </div>
      </div>

      {/* Invoice Paper View */}
      <div className="bg-white text-slate-800 shadow-2xl rounded-sm p-8 sm:p-12 overflow-x-auto min-h-[1056px]">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between border-b-4 border-[#3d4d7a] pb-8 mb-10 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#3d4d7a] rounded-lg flex items-center justify-center text-white text-2xl font-black">NCM</div>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-[#3d4d7a] leading-none">{BUSINESS_INFO.company}</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Regulatory Solutions</p>
                </div>
            </div>
            <div className="text-[11px] leading-relaxed font-medium">
              <p className="font-bold text-[#3d4d7a]">{BUSINESS_INFO.name}</p>
              <p>Business Number: {BUSINESS_INFO.number}</p>
              <p>{BUSINESS_INFO.address}</p>
              <p>{BUSINESS_INFO.cityState}</p>
              <p>Phone: {BUSINESS_INFO.phone}</p>
              <p>Fax: {BUSINESS_INFO.fax}</p>
              <p>Website: <a href={BUSINESS_INFO.website} className="text-blue-600">{BUSINESS_INFO.website}</a></p>
              <p>Email: {BUSINESS_INFO.email}</p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-end space-y-2">
            <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 block tracking-widest">Invoice Date</label>
                <input 
                    type="date" 
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="text-lg font-black bg-transparent border-none p-0 focus:ring-0 text-right outline-none"
                />
            </div>
            <div className="pt-4">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Balance Due (USD)</p>
                <p className="text-5xl font-black text-[#3d4d7a] tracking-tighter">${totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-12">
            <h3 className="text-[11px] font-black uppercase text-white bg-[#3d4d7a] inline-block px-6 py-2 tracking-[0.3em] mb-4">BILL TO</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                <input 
                  placeholder="Company Name"
                  value={billTo.company}
                  onChange={e => setBillTo({...billTo, company: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#3d4d7a] text-sm font-bold uppercase"
                />
                <input 
                  placeholder="Contact Name"
                  value={billTo.name}
                  onChange={e => setBillTo({...billTo, name: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#3d4d7a] text-sm font-bold uppercase"
                />
                <input 
                  placeholder="Address"
                  value={billTo.address}
                  onChange={e => setBillTo({...billTo, address: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#3d4d7a] text-sm font-bold uppercase"
                />
                <input 
                  placeholder="City, State Zip"
                  value={billTo.cityState}
                  onChange={e => setBillTo({...billTo, cityState: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#3d4d7a] text-sm font-bold uppercase"
                />
                <input 
                  placeholder="Phone"
                  value={billTo.phone}
                  onChange={e => setBillTo({...billTo, phone: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#3d4d7a] text-sm font-bold uppercase"
                />
                <input 
                  placeholder="Email"
                  value={billTo.email}
                  onChange={e => setBillTo({...billTo, email: e.target.value})}
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-[#3d4d7a] text-sm font-bold lowercase"
                />
            </div>
        </div>

        {/* Description Table */}
        <div className="mb-10 min-w-[600px]">
            <table className="w-full">
                <thead>
                    <tr className="bg-[#3d4d7a] text-white">
                        <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-[0.4em]">DESCRIPTION</th>
                        <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-[0.4em] w-32">AMOUNT</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={2} className="px-6 py-12 text-center text-gray-300 italic font-medium uppercase text-xs tracking-widest">No tests selected. Use Google Calendar to pull appointment data.</td>
                        </tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={idx} className="group">
                                <td className="px-6 py-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-[#3d4d7a] text-sm uppercase italic tracking-tight">{item.testName}</h4>
                                            <span className="text-[9px] font-black text-green-600 border border-green-200 px-2 py-0.5 rounded uppercase tracking-widest">{item.result}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                            <p><span className="text-[#3d4d7a]/50">Date:</span> {item.testDate}</p>
                                            <p><span className="text-[#3d4d7a]/50">Test ID:</span> {item.testId}</p>
                                            <p><span className="text-[#3d4d7a]/50">eVIN:</span> {item.eVin}</p>
                                            <p><span className="text-[#3d4d7a]/50">User VIN:</span> {item.userVin}</p>
                                            <p><span className="text-[#3d4d7a]/50">Plate:</span> {item.plate}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border-l-4 border-[#3d4d7a]">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tester