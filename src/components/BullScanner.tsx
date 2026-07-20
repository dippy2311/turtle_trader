'use client'

export default function BullScanner() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '20px 16px 30px',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes bullFloat {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes bullGlow {
          0%,100% { filter: drop-shadow(0 0 12px #00C087) drop-shadow(0 0 24px #00C08760); }
          50%      { filter: drop-shadow(0 0 28px #00C087) drop-shadow(0 0 56px #00C08790) drop-shadow(0 0 10px #ffffff30); }
        }
        @keyframes groundPulse {
          0%,100% { opacity: 0.25; transform: scaleX(0.9); }
          50%      { opacity: 0.55; transform: scaleX(1.1); }
        }
        @keyframes scanLine {
          0%   { transform: translateX(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(200%); opacity: 0; }
        }
        @keyframes candleUp1 { 0%,100%{height:50px} 50%{height:65px} }
        @keyframes candleUp2 { 0%,100%{height:80px} 50%{height:100px} }
        @keyframes candleUp3 { 0%,100%{height:60px} 50%{height:78px} }
        @keyframes candleUp4 { 0%,100%{height:95px} 50%{height:118px} }
        @keyframes tagFloat {
          0%,100% { transform: translateY(0); opacity: 0.55; }
          50%      { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes progMove {
          0%  { width: 5%; }
          75% { width: 88%; }
          100%{ width: 94%; }
        }
        .bull-anim { animation: bullFloat 2s ease-in-out infinite, bullGlow 2s ease-in-out infinite; }
        .ground    { animation: groundPulse 2s ease-in-out infinite; }
        .scan-line { animation: scanLine 3.5s linear infinite; }
        .c1 { animation: candleUp1 2s ease-in-out infinite; }
        .c2 { animation: candleUp2 2s 0.3s ease-in-out infinite; }
        .c3 { animation: candleUp3 2s 0.15s ease-in-out infinite; }
        .c4 { animation: candleUp4 2s 0.45s ease-in-out infinite; }
        .tg1 { animation: tagFloat 2.2s 0.0s ease-in-out infinite; }
        .tg2 { animation: tagFloat 2.2s 0.5s ease-in-out infinite; }
        .tg3 { animation: tagFloat 2.2s 1.0s ease-in-out infinite; }
        .tg4 { animation: tagFloat 2.2s 1.5s ease-in-out infinite; }
      `}</style>

      {/* Container for bull + candles */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>

        {/* Candles behind bull */}
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-around', padding: '0 10px',
          zIndex: 0, pointerEvents: 'none',
        }}>
          {[
            { cls:'c1', color:'#00C087' },
            { cls:'c2', color:'#00C087' },
            { cls:'c3', color:'#FF4757' },
            { cls:'c4', color:'#00C087' },
          ].map((c,i)=>(
            <div key={i} className={c.cls} style={{
              width: 16, background: c.color, borderRadius: 4,
              opacity: 0.45, boxShadow: `0 0 10px ${c.color}80`,
            }}/>
          ))}
        </div>

        {/* Scan sweep */}
        <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:1, borderRadius:16, pointerEvents:'none' }}>
          <div className="scan-line" style={{
            position:'absolute', top:0, bottom:0, width:'35%',
            background:'linear-gradient(90deg,transparent,#00C08718,#00C08735,#00C08718,transparent)',
          }}/>
        </div>

        {/* Bull image */}
        <img src="/bull-scan.png" alt="Charging bull" className="bull-anim"
          style={{ width:'100%', borderRadius:16, position:'relative', zIndex:2 }}
        />

        {/* Ground glow */}
        <div className="ground" style={{
          height:10, marginTop:-6,
          background:'radial-gradient(ellipse at center, #00C087, transparent 70%)',
          borderRadius:'50%', zIndex:1,
        }}/>
      </div>

      {/* Floating tags */}
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8, marginTop:16 }}>
        {[
          {cls:'tg1', label:'Fetching prices',     color:'#00C087'},
          {cls:'tg2', label:'Calculating EMAs',    color:'#5B6CF9'},
          {cls:'tg3', label:'Checking breakouts',  color:'#FFB300'},
          {cls:'tg4', label:'Finding BUY signals', color:'#00C087'},
        ].map(t=>(
          <div key={t.label} className={t.cls} style={{
            background:`${t.color}18`, border:`1px solid ${t.color}`,
            borderRadius:20, padding:'5px 14px',
            fontSize:11, fontWeight:600, color:t.color,
          }}>{t.label}</div>
        ))}
      </div>

      <div style={{ marginTop:16, fontSize:17, fontWeight:700, color:'#00C087', letterSpacing:3, textAlign:'center' }}>
        SCANNING NIFTY 500
      </div>
      <div style={{ fontSize:12, color:'#8888AA', marginTop:4, textAlign:'center' }}>
        Fetching live NSE data · Applying Turtle Trading rules
      </div>

      {/* Progress bar */}
      <div style={{ marginTop:14, width:'80%', maxWidth:280, height:6, background:'#1E1E2E', borderRadius:6, overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:6,
          background:'linear-gradient(90deg,#00C087,#5B6CF9)',
          animation:'progMove 3s ease-in-out infinite',
        }}/>
      </div>
      <div style={{ fontSize:11, color:'#55556A', marginTop:6 }}>
        First scan takes 60–90 seconds · Results cached for the day
      </div>
    </div>
  )
}
