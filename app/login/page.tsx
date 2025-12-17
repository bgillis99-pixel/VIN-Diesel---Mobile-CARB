'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full">
        <h1 className="text-2xl font-black text-[#003366] mb-2 text-center">GARAGE LOGIN</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Manage your fleet compliance in one place.</p>
        
        {message ? (
          <div className={`p-4 rounded-lg text-sm font-bold text-center ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-[#003366] outline-none"
                placeholder="driver@company.com"
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-[#003366] text-white font-bold py-3 rounded-lg hover:bg-[#002244] disabled:opacity-50 transition-colors"
            >
              {loading ? 'SENDING...' : 'SEND MAGIC LINK'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}