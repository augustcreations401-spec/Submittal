import { NavLink } from 'react-router-dom';
import { BarChart2, BookOpen, FolderOpen, List, Clock, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStats, getSettings } from '../api/settings.js';

function NavItem({ to, icon: Icon, label, badge, disabled }) {
  if (disabled) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', opacity: 0.35, cursor: 'default', color: '#F7F1E0', fontSize: 14 }}>
        <Icon size={16} strokeWidth={1.5} />
        <span style={{ flex: 1 }}>{label}</span>
      </div>
    );
  }
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px',
      color: isActive ? '#F0B429' : '#F7F1E0', fontSize: 14, textDecoration: 'none',
      borderLeft: isActive ? '3px solid #F0B429' : '3px solid transparent',
      background: isActive ? 'rgba(240,180,41,0.08)' : 'transparent',
    })}>
      <Icon size={16} strokeWidth={1.5} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{ background: '#F0B429', color: '#1B1B1B', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{badge}</span>
      )}
    </NavLink>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ padding: '14px 20px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,241,224,0.35)' }}>
      {text}
    </div>
  );
}

export default function Sidebar() {
  const [stats, setStats] = useState({ analysesCount: 0, tdsCount: 0, lastTdsUpload: null });
  const [company, setCompany] = useState('');

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getSettings().then(s => setCompany(s.company_name || '')).catch(() => {});
  }, []);

  const lastSync = stats.lastTdsUpload
    ? (() => {
        const mins = Math.round((Date.now() - new Date(stats.lastTdsUpload)) / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.round(mins / 60);
        return `${hrs}h ago`;
      })()
    : 'never';

  return (
    <div style={{ width: 240, background: '#1B1B1B', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, overflowY: 'auto' }}>
      {/* Wordmark */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* SM monogram */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
            <span style={{ color: '#F7F1E0', fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 600 }}>S</span>
            <div style={{ width: 18, height: 2, background: '#F0B429', margin: '2px 0' }} />
            <span style={{ color: '#F7F1E0', fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 600 }}>M</span>
          </div>
          <span style={{ color: '#F7F1E0', fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>
            Spec<span style={{ color: '#F0B429' }}>/</span>
            <em style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic' }}>Match</em>
          </span>
        </div>
      </div>

      <SectionLabel text="Workspace" />
      <div style={{ padding: '4px 20px 10px', color: '#F7F1E0', fontSize: 14, opacity: 0.6 }}>{company || '—'}</div>

      <SectionLabel text="Spec Match" />
      <NavItem to="/analyses" icon={BarChart2} label="Analyses" badge={stats.analysesCount} />
      <NavItem to="/library" icon={BookOpen} label="Library" badge={stats.tdsCount} />

      <SectionLabel text="Submittals" />
      <NavItem to="/projects" icon={FolderOpen} label="Projects" disabled />
      <NavItem to="/submittals" icon={List} label="All Submittals" disabled />
      <NavItem to="/audit" icon={Clock} label="Audit Trail" disabled />

      <SectionLabel text="System" />
      <NavItem to="/settings" icon={Settings} label="Settings" />

      {/* Bottom badge */}
      <div style={{ marginTop: 'auto', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F0B429' }} />
          <span style={{ color: 'rgba(247,241,224,0.65)', fontSize: 12, fontWeight: 500 }}>SM · LIVE</span>
        </div>
        <div style={{ color: 'rgba(247,241,224,0.35)', fontSize: 11 }}>
          {stats.tdsCount} sheet{stats.tdsCount !== 1 ? 's' : ''} · Last sync {lastSync}
        </div>
      </div>
    </div>
  );
}
