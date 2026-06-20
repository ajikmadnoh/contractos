import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';
import Icon from './Icon';

const TYPE_ICON = {
  alert: 'alert',
  payment: 'money',
  hr: 'users',
  project: 'folder',
  system: 'bell',
  safety: 'shield',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter(n => !n.is_read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleItemClick = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell trigger */}
      <button
        className="icon-btn"
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            minWidth: 16, height: 16, padding: '0 3px',
            background: 'var(--danger)', color: '#fff',
            fontSize: 9, fontWeight: 700, borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--surface)', lineHeight: 1,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Notifications
              {unread > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 700,
                  background: 'var(--accent-soft)', color: 'var(--accent-2)',
                  borderRadius: 99, padding: '1px 6px',
                }}>
                  {unread} new
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                style={{
                  fontSize: 11, color: 'var(--accent-2)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                color: 'var(--text-dim)', fontSize: 13,
              }}>
                You're all caught up 🎉
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    width: '100%', padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: !n.is_read ? 'var(--surface-2)' : 'transparent',
                    cursor: n.link ? 'pointer' : 'default',
                    textAlign: 'left',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = !n.is_read ? 'var(--surface-2)' : 'transparent'; }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 6,
                    background: !n.is_read ? 'var(--accent-soft)' : 'var(--bg-2)',
                    color: !n.is_read ? 'var(--accent-2)' : 'var(--text-dim)',
                    flexShrink: 0, marginTop: 1
                  }}>
                    <Icon name={TYPE_ICON[n.type] || 'bell'} size={12} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 12, fontWeight: n.is_read ? 400 : 600,
                      color: n.is_read ? 'var(--text-dim)' : 'var(--text)',
                      lineHeight: 1.4,
                    }}>
                      {n.title}
                    </p>
                    <p style={{
                      margin: '2px 0 0', fontSize: 11, color: 'var(--text-dim)',
                      lineHeight: 1.4,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {n.message}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-mute)' }}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--accent)', flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
