import React from 'react';
import DevinBackground from './DevinBackground';

const App: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#020617' }}>
      <DevinBackground />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          color: '#cbd5e1',
          fontSize: '48px',
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontWeight: 300,
          letterSpacing: '0.15em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        Welcome
      </div>
    </div>
  );
};

export default App;
