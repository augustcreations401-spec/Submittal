import { useEffect, useState } from 'react';

export default function LoadingDot({ messages = ['Loading…'] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setI(prev => Math.min(prev + 1, messages.length - 1)), 2500);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--smoke)', fontSize: 15 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block',
        animation: 'pulse 1s ease-in-out infinite',
      }} />
      {messages[i]}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  );
}
