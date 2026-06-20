import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const TABS = [
  { id: 'vehicles', label: 'Vehicles', icon: 'truck' },
  { id: 'maintenance', label: 'Maintenance', icon: 'tool' },
];

const STATUS_STYLES = {
  available: 'badge-success',
  in_use: 'bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full',
  maintenance: 'badge-warning',
  decommissioned: 'badge-danger',
};

export default function FleetPage() {
  const [tab, setTab] = useState('vehicles');

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Fleet Management</h1>
          <p className="page-sub">Track vehicles, machinery, and maintenance schedules</p>
        </div>
      </div>
      <FleetSummary />
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>
      <div className="page-body">
        {tab === 'vehicles' && <VehiclesTab />}
        {tab === 'maintenance' && <MaintenanceTab />}
      </div>
    </>
  );
}

function FleetSummary() {
  const { data } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: () => api.get('/fleet/vehicles').then(r => r.data),
  });
  const vehicles = data?.vehicles || [];
  const stats = [
    { label: 'Total Fleet', value: vehicles.length, icon: 'truck', color: 'var(--accent)' },
    { label: 'Available', value: vehicles.filter(v => v.status === 'available').length, icon: 'check', color: 'var(--good)' },
    { label: 'In Use', value: vehicles.filter(v => v.status === 'in_use').length, icon: 'refresh', color: 'var(--info)' },
    { label: 'Under Maintenance', value: vehicles.filter(v => v.status === 'maintenance').length, icon: 'tool', color: 'var(--warn)' },
  ];
  return (
    <div className="kpi-strip">
      <div className="kpi-grid">
        {stats.map(s => (
          <div key={s.label} className="kpi">
            <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name={s.icon} size={13} className="ico" style={{ color: s.color }} /> {s.label}
            </div>
            <div className="kpi-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VehiclesTab() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: () => api.get('/fleet/vehicles').then(r => r.data),
  });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/fleet/vehicles', d),
    onSuccess: () => { qc.invalidateQueries(['fleet-vehicles']); setShowModal(false); reset(); },
  });

  const vehicles = data?.vehicles || [];

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Vehicle / Machine</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : vehicles.length === 0 ? (
        <div className="card text-center py-16">
          <div style={{ 
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="truck" size={26} />
          </div>
          <p className="text-white font-medium">No fleet registered yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your vehicles, machinery and equipment.</p>
          <button onClick={() => setShowModal(true)} className="btn primary mt-4">Add First Vehicle</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold">{v.name}</p>
                  <p className="text-gray-400 text-sm">{v.plate_number || 'No plate'}</p>
                </div>
                <span className={STATUS_STYLES[v.status] || 'badge-warning'}>
                  {v.status?.replace('_', ' ') || 'Unknown'}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-gray-400" style={{ marginTop: 8 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="tag" size={12} /> {v.vehicle_type || '—'} {v.make && `· ${v.make}`} {v.model && v.model}</p>
                {v.year && <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={12} /> Year: {v.year}</p>}
                {v.assigned_project && <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="folder" size={12} /> Assigned: {v.assigned_project}</p>}
                {v.road_tax_expiry && (
                  <p className={`text-xs ${new Date(v.road_tax_expiry) < new Date() ? 'text-red-400' : 'text-gray-400'}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="doc" size={12} /> Road Tax: {new Date(v.road_tax_expiry).toLocaleDateString('en-MY')}
                  </p>
                )}
                {v.insurance_expiry && (
                  <p className={`text-xs ${new Date(v.insurance_expiry) < new Date() ? 'text-red-400' : 'text-gray-400'}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="shield" size={12} /> Insurance: {new Date(v.insurance_expiry).toLocaleDateString('en-MY')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-5">Add Vehicle / Machine</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Name / Description</label>
                <input className="input-field" placeholder="e.g. Lorry — 5 Tonne, Tower Crane #1" {...register('name', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vehicle / Equipment Type</label>
                  <select className="input-field" {...register('vehicle_type')}>
                    <option value="">Select type...</option>
                    <option>Lorry</option>
                    <option>Pickup Truck</option>
                    <option>Van</option>
                    <option>Car / MPV</option>
                    <option>Tower Crane</option>
                    <option>Mobile Crane</option>
                    <option>Excavator</option>
                    <option>Bulldozer</option>
                    <option>Forklift</option>
                    <option>Concrete Mixer</option>
                    <option>Generator</option>
                    <option>Compressor</option>
                    <option>Other Machinery</option>
                  </select>
                </div>
                <div>
                  <label className="label">Plate Number / Serial</label>
                  <input className="input-field" placeholder="e.g. WXY 1234" {...register('plate_number')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Make</label>
                  <input className="input-field" placeholder="e.g. Isuzu" {...register('make')} />
                </div>
                <div>
                  <label className="label">Model</label>
                  <input className="input-field" placeholder="e.g. NPR" {...register('model')} />
                </div>
                <div>
                  <label className="label">Year</label>
                  <input type="number" className="input-field" placeholder="2022" min="1990" max="2030" {...register('year')} />
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input-field" {...register('status')}>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Road Tax Expiry</label>
                  <input type="date" className="input-field" {...register('road_tax_expiry')} />
                </div>
                <div>
                  <label className="label">Insurance Expiry</label>
                  <input type="date" className="input-field" {...register('insurance_expiry')} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : 'Add to Fleet'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function MaintenanceTab() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const { data: vehicleData } = useQuery({ queryKey: ['fleet-vehicles'], queryFn: () => api.get('/fleet/vehicles').then(r => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['fleet-maintenance'],
    queryFn: () => api.get('/fleet/maintenance').then(r => r.data),
  });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const create = useMutation({
    mutationFn: d => api.post('/fleet/maintenance', d),
    onSuccess: () => { qc.invalidateQueries(['fleet-maintenance']); setShowModal(false); reset(); },
  });

  const records = data?.records || [];
  const vehicles = vehicleData?.vehicles || [];

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Log Maintenance</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-light">
                <th className="text-left text-gray-400 font-medium py-3 px-4">Vehicle</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Type</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Description</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Date</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Cost (RM)</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Next Service</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-500 py-12">No maintenance records yet.</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-navy-light/50 hover:bg-navy-light/30">
                  <td className="py-3 px-4 text-white font-medium">{r.vehicle_name || '—'}</td>
                  <td className="py-3 px-4 text-gray-400">{r.maintenance_type}</td>
                  <td className="py-3 px-4 text-gray-300">{r.description}</td>
                  <td className="py-3 px-4 text-gray-400">{r.maintenance_date ? new Date(r.maintenance_date).toLocaleDateString('en-MY') : '—'}</td>
                  <td className="py-3 px-4 text-gold">RM {parseFloat(r.cost || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-400">{r.next_service_date ? new Date(r.next_service_date).toLocaleDateString('en-MY') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-navy rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-5">Log Maintenance</h2>
            <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Vehicle / Equipment</label>
                <select className="input-field" {...register('vehicle_id', { required: true })}>
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} {v.plate_number ? `(${v.plate_number})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Maintenance Type</label>
                  <select className="input-field" {...register('maintenance_type')}>
                    <option>Oil Change</option>
                    <option>Tyre Replacement</option>
                    <option>Brake Service</option>
                    <option>Engine Service</option>
                    <option>Battery Replacement</option>
                    <option>Scheduled Service</option>
                    <option>Repair</option>
                    <option>Inspection / JPJ</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Service Date</label>
                  <input type="date" className="input-field" {...register('maintenance_date', { required: true })} />
                </div>
              </div>
              <div>
                <label className="label">Description / Workshop</label>
                <input className="input-field" placeholder="e.g. 10,000km service at Proton SC Cheras" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cost (RM)</label>
                  <input type="number" className="input-field" step="0.01" placeholder="450.00" {...register('cost')} />
                </div>
                <div>
                  <label className="label">Next Service Date</label>
                  <input type="date" className="input-field" {...register('next_service_date')} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
