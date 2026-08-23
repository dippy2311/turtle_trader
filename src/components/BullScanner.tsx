'use client'

export default function BullScanner() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <style>{`
        @keyframes bullRun {
          0%   { transform: translateX(-14px) scaleX(1); }
          48%  { transform: translateX(14px) scaleX(1); }
          50%  { transform: translateX(14px) scaleX(-1); }
          98%  { transform: translateX(-14px) scaleX(-1); }
          100% { transform: translateX(-14px) scaleX(1); }
        }
        @keyframes bullBob {
          0%,100% { transform: translateY(0); }
          25%      { transform: translateY(-6px); }
          50%      { transform: translateY(0); }
          75%      { transform: translateY(-3px); }
        }
        @keyframes shadowPulse {
          0%,100% { opacity: 0.3; transform: scaleX(0.9); }
          50%      { opacity: 0.15; transform: scaleX(1.15); }
        }
        @keyframes dotPulse {
          0%,100% { opacity: 0.25; }
          50%      { opacity: 1; }
        }
        .bull-run-wrap { animation: bullRun 1.8s ease-in-out infinite; }
        .bull-bob       { animation: bullBob 0.4s ease-in-out infinite; }
        .bull-shadow    { animation: shadowPulse 0.4s ease-in-out infinite; }
        .dot1 { animation: dotPulse 1.2s 0s infinite; }
        .dot2 { animation: dotPulse 1.2s 0.2s infinite; }
        .dot3 { animation: dotPulse 1.2s 0.4s infinite; }
      `}</style>

      {/* Running bull icon in a bounded track */}
      <div style={{ width: 100, height: 72, position: 'relative', overflow: 'visible' }}>
        <div className="bull-run-wrap" style={{ position: 'absolute', left: '50%', top: 0, marginLeft: -28 }}>
          <img
            src="/bull-scan.png"
            alt="Loading"
            className="bull-bob"
            style={{
              width: 56, height: 56, objectFit: 'contain',
              filter: 'drop-shadow(0 0 8px #00C08790)',
            }}
          />
        </div>
        {/* Ground shadow that pulses with the run cycle */}
        <div className="bull-shadow" style={{
          position: 'absolute', bottom: 4, left: '50%', marginLeft: -20,
          width: 40, height: 8, borderRadius: '50%',
          background: 'radial-gradient(ellipse, #00C087, transparent 70%)',
        }}/>
      </div>

      {/* Label with animated dots */}
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 2 }}>
        Scanning
        <span className="dot1" style={{ color: 'var(--buy)' }}>.</span>
        <span className="dot2" style={{ color: 'var(--buy)' }}>.</span>
        <span className="dot3" style={{ color: 'var(--buy)' }}>.</span>
      </div>
    </div>
  )
}
