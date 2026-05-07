const STATUSES = {
  not_yet_submitted:   { label: 'Not submitted',     bg: '#E0E0E0', color: '#555' },
  submitted:           { label: 'Submitted',          bg: '#FFF3CD', color: '#856404' },
  approved:            { label: 'Approved',           bg: '#C8E6C9', color: '#2E7D32' },
  approved_as_noted:   { label: 'Approved as noted',  bg: '#B2DFDB', color: '#00695C' },
  rejected:            { label: 'Rejected',           bg: '#FFCDD2', color: '#C62828' },
  revise_and_resubmit: { label: 'Revise & resubmit',  bg: '#FFE0B2', color: '#C68C0F' },
};

export default function SubmittalStatusPill({ status }) {
  const s = STATUSES[status] || { label: status, bg: '#E0E0E0', color: '#555' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 600,
    }}>
      {s.label}
    </span>
  );
}
