'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { addTruck } from './actions'
import { useEffect, useRef } from 'react'

const initialState = {
  message: '',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="bg-[#15803d] text-white font-bold py-3 px-4 rounded-xl shadow hover:bg-[#166534] disabled:opacity-50 flex-1 transition-all active:scale-95"
    >
      {pending ? 'ADDING...' : 'ADD TRUCK'}
    </button>
  )
}

export default function AddTruckForm() {
  const [state, formAction] = useFormState(addTruck, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.message === 'success') {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
      <h3 className="font-bold text-gray-700 mb-3">Add New Vehicle</h3>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input 
          name="nickname"
          type="text" 
          placeholder="Nickname (e.g. Big Red)" 
          className="p-3 border border-gray-200 rounded-lg bg-gray-50 focus:border-[#003366] outline-none text-sm font-bold"
        />
        <input 
          name="vin"
          type="text" 
          required
          maxLength={17}
          placeholder="VIN (17 Characters)" 
          className="p-3 border border-gray-200 rounded-lg bg-gray-50 focus:border-[#003366] outline-none font-mono text-sm uppercase"
        />
        <div className="flex justify-between items-center gap-2 mt-1">
            {state.message && state.message !== 'success' && (
                <p className="text-red-500 text-xs font-bold">{state.message}</p>
            )}
            <div className="flex-1"></div>
            <SubmitButton />
        </div>
      </form>
    </div>
  )
}
