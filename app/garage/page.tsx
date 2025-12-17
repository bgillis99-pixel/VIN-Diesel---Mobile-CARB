import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TruckList from './TruckList'
import AddTruckForm from './AddTruckForm'

export default async function GaragePage() {
  const supabase = createClient()

  // 1. Verify Auth
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  // 2. Fetch Data
  const { data: trucks } = await supabase
    .from('trucks')
    .select(`
      id, 
      vin, 
      nickname, 
      created_at,
      truck_checks (
        status,
        checked_at
      )
    `)
    .order('created_at', { ascending: false })

  // Process data to get latest check easily
  const formattedTrucks = trucks?.map(t => {
    // Sort checks to get latest if array returned, though usually we limit via query or simple sort logic here
    const checks = t.truck_checks as any[] || []
    const latestCheck = checks.sort((a,b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())[0]
    return {
      ...t,
      latestStatus: latestCheck?.status || 'UNKNOWN',
      lastChecked: latestCheck?.checked_at
    }
  }) || []

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* Header */}
      <header className="bg-[#003366] text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight">MY GARAGE</h1>
          <p className="text-[10px] opacity-80 uppercase tracking-widest">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
           {/* Simple signout button triggering auth endpoint if exists, or link */}
           <a href="/login" className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded hover:bg-white/20">LOGOUT</a>
        </form>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Add Form */}
        <AddTruckForm />

        <div className="border-t border-gray-200 my-6"></div>

        {/* List */}
        <h2 className="text-[#003366] font-bold text-lg">Your Fleet ({formattedTrucks.length})</h2>
        <TruckList trucks={formattedTrucks} />
      </main>
    </div>
  )
}
