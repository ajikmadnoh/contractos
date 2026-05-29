import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format, differenceInMinutes } from 'date-fns';

export default function HRPage() {
  const [tab, setTab] = useState('attendance');
  const qc = useQueryClient();

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.get('/hr/attendance').then(r => r.data),
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => api.get('/hr/leave').then(r => r.data),
  });

  const clockIn = useMutation({
    mutationFn: () => api.post('/hr/clock-in', {}),
    onSuccess: () => qc.invalidateQueries(['attendance']),
    onError: (err) => alert(err.response?.data?.error || 'Failed to clock in.'),
  });

  const clockOut = useMutation({
    mutationFn: () => api.post('/hr/clock-out', {}),
    onSuccess: () => qc.invalidateQueries(['attendance']),
    onError: (err) => alert(err.response?.data?.error || 'Failed to clock out.'),
  });

  const activeSession = attendance.find(a => !a.clock_out);
  const todayRecords = attendance.filter(a => {
    const d = new Date(a.clock_in);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const tabs = [
    { id: 'attendance', label: 'Attendance' },
    { id: 'leave', label: 'Leave Requests' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">HR</h1>
          <p className="text-gray-400 text-sm mt-1">Attendance, leave and payroll</p>
        </div>

        {/* Clock in / out */}
        <div className="flex items-center gap-3">
          {activeSession ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success text-sm font-medium">Clocked In</span>
                </div>
                <p className="text-xs text-gray-400">Since {format(new Date(activeSession.clock_in), 'HH:mm')}</p>
              </div>
              <button onClick={() => clockOut.mutate()} disabled={clockOut.isPending} className="btn-secondary">
                {clockOut.isPending ? 'Clocking out...' : 'Clock Out'}
              </button>
            </div>
          ) : (
            <button onClick={() => clockIn.mutate()} disabled={clockIn.isPending} className="btn-primary">
              {clockIn.isPending ? 'Clocking in...' : '▶ Clock In'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy rounded-lg p-1 mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-gold text-navy-dark' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <div className="card overflow-hidden p-0">
          {attendance.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">No attendance records yet. Clock in to start tracking.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-light">
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Date</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Clock In</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Clock Out</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">Hours</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => {
                  const hours = a.clock_out
                    ? (differenceInMinutes(new Date(a.clock_out), new Date(a.clock_in)) / 60).toFixed(1)
                    : null;
                  return (
                    <tr key={a.id} className="border-b border-navy-light hover:bg-navy-light">
                      <td className="px-6 py-3 text-white">{format(new Date(a.clock_in), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-3 text-gray-300">{format(new Date(a.clock_in), 'HH:mm')}</td>
                      <td className="px-6 py-3 text-gray-300">{a.clock_out ? format(new Date(a.clock_out), 'HH:mm') : <span className="text-success text-xs">Active</span>}</td>
                      <td className="px-6 py-3 text-gray-400">{hours ? `${hours}h` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'leave' && (
        <LeaveTab leaves={leaves} refetch={() => qc.invalidateQueries(['leaves'])} />
      )}
    </div>
  );
}

function LeaveTab({ leaves, refetch }) {
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', daysRequested: 1, reason: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/hr/leave', form);
      setShowNew(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit leave.');
    } finally {
      setSaving(false);
    }
  };

  const STATUS_STYLE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', cancelled: 'text-xs text-gray-400' };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(true)} className="btn-primary">+ Apply Leave</button>
      </div>

      {leaves.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">No leave requests submitted yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                {['Type', 'Start', 'End', 'Days', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} className="border-b border-navy-light hover:bg-navy-light">
                  <td className="px-6 py-3 text-white capitalize">{l.leave_type.replace('_', ' ')}</td>
                  <td className="px-6 py-3 text-gray-300">{format(new Date(l.start_date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-3 text-gray-300">{format(new Date(l.end_date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-3 text-gray-400">{l.days_requested}</td>
                  <td className="px-6 py-3"><span className={STATUS_STYLE[l.status]}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Apply for Leave</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Leave Type</label>
                <select className="input-field" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                  {['annual','sick','emergency','unpaid','maternity','paternity','other'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Number of Days</label>
                <input type="number" className="input-field" min="0.5" step="0.5" value={form.daysRequested}
                  onChange={e => setForm(f => ({ ...f, daysRequested: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Reason</label>
                <textarea rows={2} className="input-field resize-none" value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
