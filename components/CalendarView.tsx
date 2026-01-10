
import React, { useState, useMemo, useEffect } from 'react';
import { Appointment } from '../types';
import { triggerHaptic } from '../services/haptics';

const MOCK_APPOINTMENTS: Appointment[] = [
    { id: '1', date: '2026-08-15', time: '09:00', title: 'OBD - M-F Transport - Galt - $150', status: 'scheduled' },
    { id: '2', date: '2026-08-15', time: '13:30', title: 'OVI - Cal-Waste - Lodi - $250', status: 'scheduled' },
    { id: '3', date: '2026-08-21', time: '11:00', title: 'OBD - A+ CTC - Sacramento', status: 'completed' },
    { id: '4', date: '2026-09-02', time: '10:00', title: 'RV - Private Owner - Roseville', status: 'scheduled' },
];

const CalendarView: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date('2026-08-01'));
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
    const [showModal, setShowModal] = useState(false);
    
    // Form state for new appointment
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('09:00');

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const today = new Date();

    const appointmentsByDate = useMemo(() => {
        return appointments.reduce((acc, appt) => {
            (acc[appt.date] = acc[appt.date] || []).push(appt);
            return acc;
        }, {} as Record<string, Appointment[]>);
    }, [appointments]);

    const selectedDateAppointments = useMemo(() => {
        const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        return appointmentsByDate[dateKey] || [];
    }, [selectedDate, appointmentsByDate]);

    const handlePrevMonth = () => {
        triggerHaptic('light');
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        triggerHaptic('light');
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    const handleDayClick = (day: number) => {
        triggerHaptic('light');
        setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    };

    const handleAddAppointment = (e: React.FormEvent) => {
        e.preventDefault();
        const newAppt: Appointment = {
            id: Date.now().toString(),
            date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
            time: newEventTime,
            title: newEventTitle,
            status: 'scheduled'
        };
        setAppointments(prev => [...prev, newAppt].sort((a,b) => a.time.localeCompare(b.time)));
        setShowModal(false);
        setNewEventTitle('');
        setNewEventTime('09:00');
        triggerHaptic('success');
    };

    const renderCells = () => {
        const cells = [];
        for (let i = 0; i < startDay; i++) {
            cells.push(<div key={`empty-start-${i}`} className="h-16"></div>);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
            const isSelected = day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() && currentDate.getFullYear() === selectedDate.getFullYear();
            const hasAppointments = appointmentsByDate[dateKey];

            cells.push(
                <div key={day} onClick={() => handleDayClick(day)} className={`h-16 flex items-center justify-center p-1 cursor-pointer transition-all relative ${isSelected ? 'bg-carb-accent/20' : 'hover:bg-white/5'}`}>
                    <span className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${isToday ? 'bg-carb-accent text-white shadow-lg' : isSelected ? 'bg-carb-accent text-white' : 'text-slate-300'}`}>
                        {day}
                    </span>
                    {hasAppointments && <div className="absolute bottom-3 w-1.5 h-1.5 bg-carb-accent rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>}
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Calendar */}
            <div className="glass-card rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
                <header className="p-6 flex justify-between items-center bg-white/5 border-b border-white/5">
                    <button onClick={handlePrevMonth} className="p-3 rounded-xl hover:bg-white/10 text-xl">‹</button>
                    <h2 className="text-xl font-black italic uppercase tracking-wider">
                        {currentDate.toLocaleString('default', { month: 'long' })}
                        <span className="text-carb-accent ml-2">{currentDate.getFullYear()}</span>
                    </h2>
                    <button onClick={handleNextMonth} className="p-3 rounded-xl hover:bg-white/10 text-xl">›</button>
                </header>
                <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest py-4 border-b border-white/5">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 text-center">
                    {renderCells()}
                </div>
            </div>
            
            {/* Appointments for selected day */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Schedule: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                    <button onClick={() => { triggerHaptic('medium'); setShowModal(true); }} className="bg-carb-accent text-slate-950 px-5 py-3 rounded-2xl text-[9px] font-black uppercase italic shadow-lg active-haptic">+ New Job</button>
                </div>
                {selectedDateAppointments.length > 0 ? (
                    <div className="space-y-3">
                        {selectedDateAppointments.map(appt => (
                            <div key={appt.id} className="glass-card p-5 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-carb-accent/20 transition-colors">
                                <div className="w-16 h-16 bg-slate-900 rounded-xl flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black italic">{appt.time.split(':')[0]}</span>
                                    <span className="text-[9px] font-bold text-slate-500 -mt-1">:{appt.time.split(':')[1]}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-sm">{appt.title}</p>
                                    <span className="text-[9px] font-black uppercase text-carb-green tracking-widest">{appt.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                        <p className="text-3xl mb-2 opacity-40">📅</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">No jobs scheduled for this date.</p>
                    </div>
                )}
            </div>

            {/* Add Appointment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
                    <form onSubmit={handleAddAppointment} className="w-full max-w-md glass-card p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center">
                            <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">New Appointment</h2>
                            <p className="text-[10px] font-bold text-carb-accent uppercase tracking-widest">{selectedDate.toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-4">
                             <input value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="[Service] - [Company] - [City]" required className="w-full bg-slate-900/60 p-5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-carb-accent transition-all" />
                             <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} required className="w-full bg-slate-900/60 p-5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-carb-accent transition-all" />
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-white/5 text-white font-black rounded-2xl text-xs uppercase tracking-widest italic">Cancel</button>
                            <button type="submit" className="flex-1 py-5 bg-carb-accent text-slate-900 font-black rounded-2xl text-xs uppercase tracking-widest italic shadow-lg">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
