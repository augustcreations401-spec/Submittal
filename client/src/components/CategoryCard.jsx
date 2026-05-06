export default function CategoryCard({ category, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(category.id)}
      style={{
        background: selected ? 'rgba(240,180,41,0.12)' : 'var(--cream)',
        border: `1.5px solid ${selected ? 'var(--saffron)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 4, padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
        color: selected ? 'var(--charcoal)' : 'var(--smoke)',
        fontSize: 14, fontWeight: selected ? 600 : 400,
        transition: 'all 0.15s', width: '100%',
      }}
    >
      {category.name}
    </button>
  );
}
