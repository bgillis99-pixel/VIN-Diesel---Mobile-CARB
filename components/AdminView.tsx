
import React, { useState, useMemo, useEffect } from 'react';
import { scoutTruckLead, generateMarketingInsights } from '../services/geminiService';
import { AIAnalyticsReport } from '../types';

// Password code required
const ADMIN_CODE = '1225';

// Mocked Analytics Data Generation
const generateStats = () => ({
  totalVinChecks: 1284,
  complianceRate: 72,
  nonComplianceRate: 28,
  scanRate: 64, // 64% Scan, 36% Manual
  manualRate: 36,
  ctr: {
    call: 12.4,
    text: 8.2,
    share: 5.1
  },
  topZipCodes: [
    { zip: '95814', count: 142 },
    { zip: '94103', count: 98 },
    { zip: '90001', count: 85 },
    { zip: '93721', count: 64 },
    { zip: '94510', count: 42 }
  ],
  trafficSources: [
    { source: 'Direct', val: 45 },
    { source: 'QR Scan', val: 30 },
    { source: 'Social/Share', val: 15 },
    { source: 'Partner Link', val: 10 }
  ],
  retention: 42.5, // % of users returning within 7 days
  activityLog: [
    { id: '1', type: 'VIN_CHECK', val: '1N6ED0...', status: 'COMPLIANT', time: '2m ago', loc: 'Sacramento' },
    { id: '2', type: 'VIN_CHECK', val: '2HGFA1...', status: 'FAIL', time: '8m ago', loc: 'Fresno' },
    { id: '3', type: 'SCAN', val: 'OPTICS_LAB', status: 'SUCCESS', time: '14m ago', loc: 'Redding' },
    { id: '4', type: 'LEAD', val: 'Lassen Forest', status: 'HOT', time: '22m ago', loc: 'Red Bluff' },
    { id: '5', type: 'VIN_CHECK', val: '5UXWX7...', status: 'COMPLIANT', time: '45m ago', loc: 'Benicia' },
  ],
  trends: [32, 45, 28, 56, 78, 92, 84] // Last 7 days activity
});

const AdminView: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'INTELLIGENCE' | 'LEADS'>('DASHBOARD');
  const [stats, setStats] = useState(generateStats());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<AIAnalyticsReport | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === ADMIN_CODE) {
      setIsAuthorized(true);
    } else {
      alert("Invalid Authorization Code");
      setPassInput('');
    }
  };

  const fetchAIIntelligence = async () => {
    setAiLoading(true);
    setCurrentTab('INTELLIGENCE');
    try {
      const report = await generateMarketingInsights(stats);
      setAiReport(report);
    } catch (e) {
      alert("AI Analysis Error.");
    } finally {
      setAiLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 text-center">
            <div className="w-20 h-20 bg-blue-600/10 rounded-full mx-auto flex items-center justify-center text-4xl border border-blue-600/20">🔒</div>
            <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Admin Portal</h2>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Code 1225 Required</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <input 
                    type="password"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 text-center text-2xl font-black text-white outline-none focus:border-blue-500 transition-all tracking-[0.5em]"
                    autoFocus
                />
                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs italic active-haptic shadow-lg">Access Command Center</button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carb-navy pb-32 animate-in fade-in duration-500">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-dark border-b border-white/5 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
                <h1 className="text-xs font-black uppercase tracking-[0.2em] italic text-white">KPI COMMAND</h1>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Operator Session: Active</p>
            </div>
        </div>
        <div className="flex gap-2">
            {['DASHBOARD', 'LEADS', 'INTELLIGENCE'].map(t => (
                <button 
                    key={t}
                    onClick={() => t === 'INTELLIGENCE' ? fetchAIIntelligence() : setCurrentTab(t as any)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    {t.slice(0, 3)}
                </button>
            ))}
        </div>
      </header>

      <main className="p-6 space-y-8">
        {currentTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Top Row: Primary KPIs */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Total Checks</p>
                    <p className="text-4xl font-black italic text-white tracking-tighter">{stats.totalVinChecks.toLocaleString()}</p>
                    <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">+18% This Month</p>
                </div>
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Compliance</p>
                    <p className="text-4xl font-black italic text-green-500 tracking-tighter">{stats.complianceRate}%</p>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">721/1284 PASS</p>
                </div>
            </div>

            {/* Daily Trends Chart (SVG) */}
            <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">7-Day Volume Trend</h3>
                    <span className="text-[9px] font-black text-blue-400 uppercase">Velocity Hub</span>
                </div>
                <div className="h-32 w-full relative flex items-end justify-between gap-2 px-2">
                    {stats.trends.map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                                className="w-full bg-blue-500/40 border-t-2 border-blue-500 rounded-t-lg transition-all duration-1000" 
                                style={{ height: `${(v / Math.max(...stats.trends)) * 100}%` }}
                            ></div>
                            <span className="text-[7px] font-black text-gray-600 uppercase">D-{6-i}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input & Performance Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Input Method</p>
                    <div className="flex items-center justify-between">
                        <div className="text-center">
                            <p className="text-xl font-black text-white italic">{stats.scanRate}%</p>
                            <p className="text-[7px] font-black text-blue-500 uppercase">Scan</p>
                        </div>
                        <div className="w-px h-8 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white italic">{stats.manualRate}%</p>
                            <p className="text-[7px] font-black text-gray-600 uppercase">Manual</p>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${stats.scanRate}%` }}></div>
                        <div className="h-full bg-gray-700" style={{ width: `${stats.manualRate}%` }}></div>
                    </div>
                </div>

                <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">User Retention</p>
                    <p className="text-3xl font-black italic text-white tracking-tighter">{stats.retention}%</p>
                    <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest">7D Return Cohort</p>
                </div>
            </div>

            {/* Click Through Metrics */}
            <div className="glass p-8 rounded-[3.5rem] border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic text-center">Engagement CTR</h3>
                <div className="grid grid-cols-3 gap-2">
                    {Object.entries(stats.ctr).map(([key, val]) => (
                        <div key={key} className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                            <p className="text-lg font-black italic text-white">{val}%</p>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{key}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Locations & Traffic Sources */}
            <div className="grid grid-cols-1 gap-6">
                <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-4">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Top Geographic Pings</h3>
                    <div className="space-y-3">
                        {stats.topZipCodes.map(z => (
                            <div key={z.zip} className="flex justify-between items-center">
                                <span className="text-xs font-black text-gray-300 italic">ZIP: {z.zip}</span>
                                <div className="flex items-center gap-3 flex-1 justify-end">
                                    <div className="h-1 bg-white/5 rounded-full flex-1 max-w-[100px] overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(z.count / stats.topZipCodes[0].count) * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-black text-white">{z.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-4">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Traffic Acquisition</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {stats.trafficSources.map(s => (
                            <div key={s.source} className="flex flex-col gap-1">
                                <div className="flex justify-between items-end">
                                    <span className="text-[8px] font-black text-gray-500 uppercase">{s.source}</span>
                                    <span className="text-[10px] font-black text-blue-500">{s.val}%</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{ width: `${s.val}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Log */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic px-4">Live Activity Log</h3>
                <div className="space-y-3">
                    {stats.activityLog.map(log => (
                        <div key={log.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs ${log.status === 'FAIL' ? 'bg-red-500/10 text-red-500' : (log.status === 'HOT' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500')}`}>
                                    {log.type[0]}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white italic uppercase">{log.val}</p>
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{log.loc} • {log.time}</p>
                                </div>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${log.status === 'FAIL' ? 'text-red-500' : (log.status === 'HOT' ? 'text-orange-500' : 'text-green-500')}`}>
                                {log.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {currentTab === 'INTELLIGENCE' && (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-blue-600/10 p-10 rounded-[4rem] border border-blue-500/20 text-center space-y-4">
                    <span className="text-4xl">🧠</span>
                    <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">AI Marketing Strategist</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Generating insights from Command Data...</p>
                </div>

                {aiLoading ? (
                    <div className="flex flex-col items-center py-20 space-y-6">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] animate-pulse">Consulting Neural Core...</p>
                    </div>
                ) : aiReport ? (
                    <div className="space-y-6">
                        <div className="glass p-8 rounded-[3rem] border border-blue-500/30 shadow-2xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic">Executive Summary</h3>
                            <p className="text-sm text-gray-300 leading-relaxed font-medium italic">{aiReport.summary}</p>
                        </div>
                        
                        <div className="bg-blue-600 p-10 rounded-[3.5rem] shadow-2xl space-y-4">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Growth Strategy</h3>
                            <p className="text-sm text-white font-bold leading-relaxed">{aiReport.marketingStrategy}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="glass p-8 rounded-[3rem] border border-green-500/10 space-y-4">
                                <h3 className="text-[10px] font-black text-green-500 uppercase tracking-[0.4em] italic">Velocity Vectors</h3>
                                <ul className="space-y-3">
                                    {aiReport.whatsWorking.map((w, i) => (
                                        <li key={i} className="text-xs text-gray-400 font-black uppercase tracking-tighter flex gap-3">
                                            <span className="text-green-500">↑</span> {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="glass p-8 rounded-[3rem] border border-amber-500/10 space-y-4">
                                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] italic">Suggested Manuevers</h3>
                                <ul className="space-y-3">
                                    {aiReport.suggestedActions.map((s, i) => (
                                        <li key={i} className="text-xs text-gray-400 font-black uppercase tracking-tighter flex gap-3">
                                            <span className="text-amber-500">→</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        )}
      </main>

      {/* Persistent Footer Stats */}
      <footer className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/5 p-4 z-50 flex justify-around">
          <div className="text-center">
              <p className="text-[10px] font-black text-white italic">12:26:25</p>
              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Protocol Date</p>
          </div>
          <div className="text-center">
              <p className="text-[10px] font-black text-green-500 italic">HEALTHY</p>
              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Engine Sync</p>
          </div>
          <div className="text-center">
              <p className="text-[10px] font-black text-blue-500 italic">4.2ms</p>
              <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">AI Latency</p>
          </div>
      </footer>
    </div>
  );
};

export default AdminView;
