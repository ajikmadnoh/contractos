import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';

const TABS = [
  { id: 'vehicles', label: 'Vehicles', icon: '🚛' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
        <p className="text-gray-400 text-sm mt-1">Track vehicles, machinery, and maintenance schedules</p>
      </div>

      {/* Summary */}
      <FleetSummary />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-navy-light">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-gold text-gold' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
    </div>
  );
}

function FleetSummary() {
  const { data } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: () => api.get('/fleet/vehicles').then(r => r.data),
  });
  const vehicles = data?.vehicles || [];
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Fleet', value: vehicles.length, icon: '🚛' },
        { label: 'Available', value: vehicles.filter(v => v.status === 'available').length, icon: '✅', cls: 'text-success' },
        { label: 'In Use', value: vehicles.filter(v => v.status === 'in_use').length, icon: '🔄', cls: 'text-blue-400' },
        { label: 'Under Maintenance', value: vehicles.filter(v => v.status === 'maintenance').length, icon: '🔧', cls: 'text-yellow-400' },
      ].map(c => (
        <div key={c.label} className="card">
          <p className="text-gray-400 text-xs mb-1">{c.icon} {c.label}</p>
          <p className={`text-2xl font-bold ${c.cls || 'text-white'}`}>{c.value}</p>
        </div>
      ))}
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
          <p className="text-4xl mb-3">🚛</p>
          <p className="text-white font-medium">No fleet registered yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your vehicles, machinery and equipment.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Vehicle</button>
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
              <div className="space-y-1 text-sm text-gray-400">
                <p>🏷️ {v.vehicle_type || '—'} {v.make && `· ${v.make}`} {v.model && v.model}</p>
                {v.year && <p>📅 Year: {v.year}</p>}
                {v.assigned_project && <p>📁 Assigned: {v.assigned_project}</p>}
                {v.road_tax_expiry && (
                  <p className={`text-xs ${new Date(v.road_tax_expiry) < new Date() ? 'text-red-400' : 'text-gray-400'}`}>
                    🗒️ Road Tax: {new Date(v.road_tax_expiry).toLocaleDateString('en-MY')}
                  </p>
                )}
                {v.insurance_expiry && (
                  <p className={`text-xs ${new Date(v.insurance_expiry) < new Date() ? 'text-red-400' : 'text-gray-400'}`}>
                    🛡️ Insurance: {new Date(v.insurance_expiry).toLocaleDateString('en-MY')}
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
