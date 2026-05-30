import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';

const useProfiles = () => useQuery({
  queryKey: ['profiles-all-docs'],
  queryFn: () => api.get('/profiles').then(r => r.data || []),
  staleTime: 5 * 60_000,
});

const DOC_CATEGORIES = [
  'All',
  'Contracts & LOA',
  'Drawings & Plans',
  'Specifications',
  'BQ & Estimates',
  'Progress Claims',
  'Invoices',
  'HR & Payroll',
  'Safety',
  'Insurance & Bonds',
  'Permits & Approvals',
  'Correspondence',
  'Meeting Minutes',
  'Photos',
  'Other',
];

const FILE_ICONS = {
  pdf: '📄',
  doc: '📝', docx: '📝',
  xls: '📊', xlsx: '📊',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
  zip: '🗜️',
  default: '📎',
};

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
};

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function DocumentsPage() {
  const [view, setView] = useState('global'); // 'global' | 'project'
  const [selectedProject, setSelectedProject] = useState(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const { data: projectData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const projects = projectData?.projects || [];

  const qParams = new URLSearchParams();
  if (category !== 'All') qParams.set('category', category);
  if (search) qParams.set('search', search);
  if (view === 'project' && selectedProject) qParams.set('project_id', selectedProject);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', category, search, selectedProject, view],
    queryFn: () => api.get(`/documents?${qParams}`).then(r => r.data),
  });

  const docs = data?.documents || [];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left sidebar — project folders */}
      <aside style={{ width: '200px', borderRight: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div className="nav-section">Views</div>
          <button
            onClick={() => { setView('global'); setSelectedProject(null); }}
            className={`nav-item${view === 'global' ? ' active' : ''}`}
            style={{ width: '100%' }}>
            🌐 All Documents
          </button>
        </div>

        <div style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          <div className="nav-section">Project Folders</div>
          {projects.length === 0 ? (
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-mute)', padding: '4px 8px' }}>No projects yet</p>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => { setView('project'); setSelectedProject(p.id); }}
                className={`nav-item${view === 'project' && selectedProject === p.id ? ' active' : ''}`}
                style={{ width: '100%' }}>
                📁 <span className="truncate">{p.name}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 'var(--font-xl)' }}>
                {view === 'global' ? 'All Documents' : projects.find(p => p.id === selectedProject)?.name || 'Project Documents'}
              </h1>
              <p className="page-sub">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowUpload(true)} className="btn primary sm">
              📤 Upload
            </button>
          </div>

          {/* Search + category filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              className="input"
              style={{ width: '220px' }}
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {DOC_CATEGORIES.slice(0, 7).map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`seg-btn${category === cat ? ' active' : ''}`}
                  style={{ fontSize: 'var(--font-xs)' }}>
                  {cat}
                </button>
              ))}
              <select
                value={DOC_CATEGORIES.slice(7).includes(category) ? category : ''}
                onChange={e => e.target.value && setCategory(e.target.value)}
                className="input" style={{ fontSize: 'var(--font-xs)', padding: '4px 8px', width: 'auto' }}>
                <option value="">More…</option>
                {DOC_CATEGORIES.slice(7).map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Documents list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div className="text-center py-16 text-gray-500">Loading documents...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">📄</p>
              <p className="text-white font-medium text-lg">
                {search || category !== 'All' ? 'No documents match your search' : 'No documents yet'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {search || category !== 'All'
                  ? 'Try adjusting your filters.'
                  : view === 'project'
                  ? 'Upload documents for this project.'
                  : 'Start uploading your company documents here.'}
              </p>
              {!search && category === 'All' && (
                <button onClick={() => setShowUpload(true)} className="btn-primary mt-5">Upload First Document</button>
              )}
            </div>
          ) : (
            <DocumentGrid docs={docs} onRefetch={refetch} />
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal
          projects={projects}
          defaultProjectId={selectedProject}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); refetch(); }}
        />
      )}
    </div>
  );
}

function DocumentGrid({ docs, onRefetch }) {
  const qc = useQueryClient();
  const [expanding, setExpanding] = useState(null);

  const markApproved = useMutation({
    mutationFn: id => api.patch(`/documents/${id}`, { status: 'approved' }),
    onSuccess: () => onRefetch(),
  });

  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div key={doc.id} className="card flex items-center gap-4 hover:border-gold/30 border border-transparent transition-colors">
          <div className="text-3xl flex-shrink-0">{getFileIcon(doc.filename)}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-medium truncate">{doc.title || doc.filename}</p>
              {doc.version > 1 && (
                <span className="text-xs bg-navy-light text-gold px-1.5 py-0.5 rounded font-mono flex-shrink-0">v{doc.version}</span>
              )}
              {doc.status === 'approved' && <span className="badge-success flex-shrink-0">✓ Approved</span>}
              {doc.status === 'pending_approval' && <span className="badge-warning flex-shrink-0">⏳ Pending</span>}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              {doc.category && <span>🏷️ {doc.category}</span>}
              {doc.project_name && <span>📁 {doc.project_name}</span>}
              {doc.profile_name && <span>🏢 {doc.profile_name}</span>}
              <span>{fmtSize(doc.file_size)}</span>
              <span>📅 {new Date(doc.created_at).toLocaleDateString('en-MY')}</span>
              <span>👤 {doc.uploaded_by_name || '—'}</span>
            </div>
            {doc.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.description}</p>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {doc.status === 'pending_approval' && (
              <button onClick={() => markApproved.mutate(doc.id)} className="text-xs btn-secondary py-1 px-3">
                Approve
              </button>
            )}
            <a
              href={doc.file_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gold hover:underline"
              onClick={e => { if (!doc.file_url) { e.preventDefault(); alert('File preview coming once S3 is connected.'); } }}>
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadModal({ projects, defaultProjectId, onClose, onSuccess }) {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { project_id: defaultProjectId || '', profile_id: '', category: 'Other', send_for_approval: false },
  });
  const { data: profiles = [] } = useProfiles();
  const fileRef = useRef();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const onSubmit = async (data) => {
    if (!selectedFile) { alert('Please select a file to upload.'); return; }
    const fd = new FormData();
    fd.append('file', selectedFile);
    Object.entries(data).forEach(([k, v]) => v !== undefined && fd.append(k, v));
    try {
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed. Please try again.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-navy rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">Upload Document</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-gold bg-gold/10' : 'border-navy-light hover:border-gold/50'}`}>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
              onChange={e => setSelectedFile(e.target.files[0])}
            />
            {selectedFile ? (
              <div>
                <p className="text-3xl mb-2">{getFileIcon(selectedFile.name)}</p>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-gray-400 text-xs mt-1">{fmtSize(selectedFile.size)}</p>
                <p className="text-gold text-xs mt-2">Click to change file</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-3">📤</p>
                <p className="text-white font-medium">Drag & drop or click to browse</p>
                <p className="text-gray-400 text-xs mt-1">PDF, Word, Excel, Images, ZIP · Max 50MB</p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Document Title</label>
            <input className="input-field" placeholder="e.g. Structural Drawing Rev A — Ground Floor" {...register('title')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input-field" {...register('category', { required: true })}>
                {DOC_CATEGORIES.filter(c => c !== 'All').map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Link to Project</label>
              <select className="input-field" {...register('project_id')}>
                <option value="">No specific project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Linked Party <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}>(optional — client, subcon or supplier)</span></label>
            <select className="input-field" {...register('profile_id')}>
              <option value="">— No linked party —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.profile_type === 'client' ? '🤝' : p.profile_type === 'subcon' ? '🏗️' : p.profile_type === 'supplier' ? '📦' : '🏢'} {p.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea rows={2} className="input-field resize-none" placeholder="Brief description of this document..." {...register('description')} />
          </div>

          <div className="flex items-center gap-2 p-3 bg-navy-light rounded-lg">
            <input type="checkbox" id="approval" className="accent-gold" {...register('send_for_approval')} />
            <label htmlFor="approval" className="text-sm text-gray-300">
              Send for approval (Director must approve before sharing)
            </label>
          </div>

          <div className="bg-navy-light rounded-lg p-3 text-xs text-gray-400">
            <p className="font-medium text-gray-300 mb-1">📌 Note on file storage</p>
            <p>Files will be stored securely on AWS S3 once connected. For now, document metadata is saved and files can be uploaded when cloud storage is configured.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting || !selectedFile} className="btn-primary flex-1">
              {isSubmitting ? 'Uploading...' : 'Upload Document'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
