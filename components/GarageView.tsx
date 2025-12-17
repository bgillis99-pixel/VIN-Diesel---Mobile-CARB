import React, { useState, useEffect } from 'react';
import { Truck, User } from '../types';
import { addTruckToGarage, deleteTruckFromGarage, updateTruckStatus, subscribeToGarage, auth } from '../services/firebase';
import { checkTruckCompliance } from '../services/compliance';
import { trackEvent } from '../services/analytics';

interface Props {
  user: User | null;
  onNavigateLogin: () => void;
}

const GarageView: React.FC<Props> = ({ user, onNavigateLogin }) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [vinInput, setVinInput] = useState('');
  const [nickInput, setNickInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Realtime Subscription
  useEffect(() => {
    if (!auth?.currentUser) {
        setLoading(false);
        return;
    }
    
    const unsubscribe = subscribeToGarage(auth.currentUser.uid, (data) => {
        setTrucks(data);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser) return;
    
    const vin = vinInput.trim().toUpperCase();
    const nickname = nickInput.trim();

    // Validation
    if (vin.length !== 17) {
        setErrorMsg("VIN must be 17 characters.");
        return;
    }
    if (/[IOQ]/.test(vin)) {
        setErrorMsg("VINs cannot contain I, O, or Q.");
        return;
    }
    if (!nickname) {
        setErrorMsg("Please give this truck a nickname.");
        return;
    }

    setAdding(true);
    setErrorMsg('');

    try {
        // 1. Check Compliance Immediately
        const status = await checkTruckCompliance(vin);
        
        // 2. Add to Firebase
        await addTruckToGarage(auth.currentUser.uid, {
            vin,
            nickname,
            status,
            lastChecked: Date.now()
        });

        trackEvent('garage_add_truck', { status });
        setVinInput('');
        setNickInput('');
    } catch (err) {
        setErrorMsg("Failed to save truck. Check connection.");
    } finally {
        setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (!auth?.currentUser || !confirm("Remove this truck from your garage?")) return;
      await deleteTruckFromGarage(auth.currentUser.uid, id);
      trackEvent('garage_delete_truck');
  };

  const handleRefreshCheck = async (truck: Truck) => {
      if (!auth?.currentUser) return;
      // Optimistic Update
      const oldStatus = truck.status;
      // We could set a loading state on the specific card here
      
      const newStatus = await checkTruckCompliance(truck.vin);
      
      if (newStatus !== oldStatus || Date.now() - truck.lastChecked > 86400000) {
          await updateTruckStatus(auth.currentUser.uid, truck.id, newStatus, Date.now());
          trackEvent('garage_refresh_check', { status: newStatus });
      } else {
          alert("Status is up to date!");
      }
  };

  if (!user) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-6">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-4xl">
                  🚛
              </div>
              <div>
                  <h2 className="text-2xl font-black text-[#003366] dark:text-white">My Fleet Garage</h2>
                  <p className="text-gray-500 mt-2 max-w-xs mx-auto">Sign in to save your trucks, track compliance status automatically, and get renewal alerts.</p>
              </div>
              <button onClick={onNavigateLogin} className="bg-[#003366] text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-[#002244] transition-transform active:scale-95">
                  Sign In / Create Account
              </button>
          </div>
      );
  }

  return (
    <div className="pb-24">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-2xl font-black text-[#003366] dark:text-white mb-1">My Garage</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage fleet compliance in one place.</p>
            
            {/* Add Form */}
            <form onSubmit={handleAddTruck} className="mt-6 space-y-3">
                <div className="flex gap-2">
                    <input 
                        value={nickInput}
                        onChange={(e) => setNickInput(e.target.value)}
                        placeholder="Nickname (e.g. Unit #5)"
                        className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-sm outline-none focus:border-[#003366] dark:text-white"
                    />
                </div>
                <div className="flex gap-2">
                    <input 
                        value={vinInput}
                        onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                        placeholder="VIN (17 Characters)"
                        maxLength={17}
                        className="flex-[2] p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-mono text-sm outline-none focus:border-[#003366] dark:text-white uppercase"
                    />
                    <button 
                        type="submit" 
                        disabled={adding}
                        className="flex-1 bg-[#15803d] text-white font-bold rounded-xl shadow hover:bg-[#166534] disabled:opacity-50 text-sm"
                    >
                        {adding ? '...' : '+ ADD'}
                    </button>
                </div>
                {errorMsg && <p className="text-red-500 text-xs font-bold pl-1">{errorMsg}</p>}
            </form>
        </div>

        {/* List */}
        {loading ? (
            <div className="text-center py-10 text-gray-400 animate-pulse">Loading fleet...</div>
        ) : trucks.length === 0 ? (
            <div className="text-center py-10 px-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <p className="text-4xl mb-2">🚛</p>
                <p className="font-bold text-gray-500 dark:text-gray-400">Your garage is empty.</p>
                <p className="text-xs text-gray-400 mt-1">Add a truck above to track its status.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {trucks.map(truck => (
                    <div key={truck.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-lg text-[#003366] dark:text-white">{truck.nickname}</h3>
                                <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-0.5 tracking-wider">
                                    VIN: •••••{truck.vin.slice(-4)}
                                </p>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-black border uppercase ${
                                truck.status === 'COMPLIANT' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300' :
                                truck.status === 'NOT_COMPLIANT' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300' :
                                'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                {truck.status.replace('_', ' ')}
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Last Checked</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    {new Date(truck.lastChecked).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleDelete(truck.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">DELETE</button>
                                <button onClick={() => handleRefreshCheck(truck)} className="text-[#003366] dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    REFRESH
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default GarageView;
