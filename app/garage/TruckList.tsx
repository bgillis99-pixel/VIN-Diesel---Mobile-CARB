'use client'

import React, { useState } from 'react'
import { checkComplianceAction, deleteTruck, updateNickname } from './actions'

interface Truck {
  id: string
  vin: string
  nickname: string | null
  latestStatus: string
  lastChecked: string | null
}

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'COMPLIANT') return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black border border-green-200">✓ COMPLIANT</span>
  if (status === 'NOT_COMPLIANT') return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black border border-red-200">⚠️ NOT COMPLIANT</span>
  return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-black border border-gray-200">? UNKNOWN</span>
}

const TruckCard: React.FC<{ truck: Truck }> = ({ truck }) => {
  const [showVin, setShowVin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(truck.nickname || '')

  const handleRefresh = async () => {
    setLoading(true)
    await checkComplianceAction(truck.id, truck.vin)
    setLoading(false)
  }

  const handleSaveName = async () => {
    await updateNickname(truck.id, editName)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if(confirm("Delete this truck?")) {
        await deleteTruck(truck.id)
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {isEditing ? (
             <div className="flex gap-2 items-center">
                 <input 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="border p-1 rounded text-sm font-bold w-full" 
                    autoFocus
                 />
                 <button onClick={handleSaveName} className="text-green-600 font-bold text-xs">SAVE</button>
             </div>
          ) : (
             <div className="flex gap-2 items-center group">
                <h3 className="font-black text-[#003366] text-lg">{truck.nickname || 'Unnamed Truck'}</h3>
                <button onClick={() => setIsEditing(true)} className="text-gray-300 hover:text-gray-500">✎</button>
             </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <p className="font-mono text-sm text-gray-600">
                {showVin ? truck.vin : `•••••••••••••${truck.vin.slice(-4)}`}
            </p>
            <button onClick={() => setShowVin(!showVin)} className="text-[10px] text-blue-500 font-bold">
                {showVin ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>
        <StatusBadge status={truck.latestStatus} />
      </div>

      <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-100">
        <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Last Checked</p>
            <p className="text-xs text-gray-600">
                {truck.lastChecked ? new Date(truck.lastChecked).toLocaleDateString() + ' ' + new Date(truck.lastChecked).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
            </p>
        </div>
        <div className="flex gap-2">
            <button onClick={handleDelete} className="px-3 py-2 text-red-400 hover:text-red-600 text-xs font-bold transition-colors">
                DELETE
            </button>
            <button 
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-[#003366] text-white rounded-lg text-xs font-bold shadow hover:bg-[#002244] disabled:opacity-50 transition-colors"
            >
                {loading ? 'CHECKING...' : 'CHECK NOW'}
            </button>
        </div>
      </div>
    </div>
  )
}

export default function TruckList({ trucks }: { trucks: Truck[] }) {
  if (trucks.length === 0) {
    return <div className="text-center text-gray-400 py-10 italic">No trucks in garage yet.</div>
  }

  return (
    <div className="space-y-4">
      {trucks.map(truck => (
        <TruckCard key={truck.id} truck={truck} />
      ))}
    </div>
  )
}