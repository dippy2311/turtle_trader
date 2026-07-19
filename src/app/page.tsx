'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScanSignal, MarketStatus, Position } from '@/types'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n/1e7).toFixed(2)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n/1e5).toFixed(2)}L`
  if (Math.abs(n) >= 1e3) return `₹${(n/1e3).toFixed(1)}K`
  return `₹${n.toFixed(2)}`
}
const pct = (n: number) => `${n>=0?'+':''}${n.toFixed(2)}%`
const sigColor = (s: string) => s==='BUY'?'var(--buy)':s==='SELL'?'var(--sell)':s==='WATCH'?'var(--watch)':'var(--hold)'

function Badge({ signal }: { signal: string }) {
  return <span className={`badge badge-${signal}`}>{signal}</span>
}

function Gauge({ score }: { score: number }) {
  const color = score>=75?'var(--buy)':score>=55?'#7BC67E':score>=45?'var(--watch)':score>=25?'#FF8C69':'var(--sell)'
  const label = score>=75?'Greedy':score>=55?'Bullish':score>=45?'Neutral':score>=25?'Bearish':'Fearful'
  const cx=90,cy=80,r=65
  const toXY=(deg:number)=>({ x:cx+r*Math.cos(deg*Math.PI/180), y:cy+r*Math.sin(deg*Math.PI/180) })
  const angle=-180+(score/100)*180
  const needleTip=toXY(angle)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <svg width={180} height={95} viewBox="0 0 180 95">
        {[[-180,-144,'var(--sell)'],[-144,-108,'#FF8C69'],[-108,-72,'var(--watch)'],[-72,-36,'#7BC67E'],[-36,0,'var(--buy)']].map(([s,e,c],i)=>{
          const st=toXY(s as number),en=toXY(e as number)
          return <path key={i} d={`M${st.x},${st.y} A${r},${r} 0 0,1 ${en.x},${en.y}`} stroke={c as string} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.7}/>
        })}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={4} fill={color}/>
        <text x={cx} y={cy+18} textAnchor="middle" fill={color} fontSize={16} fontWeight={700}>{Math.round(score)}</text>
      </svg>
      <span style={{ fontSize:14, fontWeight:700, color, marginTop:-4 }}>{label}</span>
    </div>
  )
}

function ChargingBull() {
  return (
    <svg width="100%" viewBox="0 0 680 360" role="img" xmlns="http://www.w3.org/2000/svg">
      <title>Charging bull scanning animation</title>
      <desc>Powerful charging bull scanning NSE stocks</desc>
      <defs>
        <style>{`
          @keyframes bodyBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
          @keyframes legFL { 0%,100%{transform:rotate(-20deg)} 50%{transform:rotate(25deg)} }
          @keyframes legFR { 0%,100%{transform:rotate(25deg)} 50%{transform:rotate(-20deg)} }
          @keyframes legBL { 0%,100%{transform:rotate(15deg)} 50%{transform:rotate(-25deg)} }
          @keyframes legBR { 0%,100%{transform:rotate(-25deg)} 50%{transform:rotate(15deg)} }
          @keyframes tailWag { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(30deg)} }
          @keyframes eyeGlow { 0%,100%{opacity:0.7} 50%{opacity:1} }
          @keyframes trailFade { 0%{opacity:0.6;transform:translateX(0) scaleX(1)} 100%{opacity:0;transform:translateX(-30px) scaleX(0.2)} }
          @keyframes tp0 { 0%,100%{opacity:0.2} 50%{opacity:1} }
          @keyframes tp1 { 0%,100%{opacity:0.2} 50%{opacity:1} }
          @keyframes tp2 { 0%,100%{opacity:0.2} 50%{opacity:1} }
          @keyframes tp3 { 0%,100%{opacity:0.2} 50%{opacity:1} }
          .g-body { animation:bodyBob 0.55s ease-in-out infinite; transform-origin:350px 185px; }
          .g-lfl  { animation:legFL 0.55s ease-in-out infinite; transform-origin:285px 228px; }
          .g-lfr  { animation:legFR 0.55s ease-in-out infinite; transform-origin:307px 228px; }
          .g-lbl  { animation:legBL 0.55s ease-in-out infinite; transform-origin:389px 228px; }
          .g-lbr  { animation:legBR 0.55s ease-in-out infinite; transform-origin:411px 228px; }
          .g-tail { animation:tailWag 0.55s ease-in-out infinite; transform-origin:438px 175px; }
          .g-eye  { animation:eyeGlow 0.8s ease-in-out infinite; }
          .tr1 { animation:trailFade 0.55s linear infinite 0s; }
          .tr2 { animation:trailFade 0.55s linear infinite 0.18s; }
          .tr3 { animation:trailFade 0.55s linear infinite 0.36s; }
          .tg0 { animation:tp0 2s 0.0s infinite; }
          .tg1 { animation:tp1 2s 0.4s infinite; }
          .tg2 { animation:tp2 2s 0.8s infinite; }
          .tg3 { animation:tp3 2s 1.2s infinite; }
        `}</style>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00C087"/>
          <stop offset="100%" stopColor="#5B6CF9"/>
        </linearGradient>
      </defs>

      <rect width="680" height="360" fill="#0A0A0F"/>
      <line x1="80" y1="272" x2="600" y2="272" stroke="#1E1E2E" strokeWidth="1.5"/>
      <ellipse cx="345" cy="274" rx="115" ry="7" fill="#00C087" opacity="0.07"/>

      <ellipse className="tr1" cx="195" cy="198" rx="55" ry="14" fill="#00C087"/>
      <ellipse className="tr2" cx="165" cy="198" rx="38" ry="10" fill="#00C087"/>
      <ellipse className="tr3" cx="142" cy="198" rx="22" ry="6" fill="#00C087"/>

      <g className="g-body">
        <g className="g-tail">
          <path fill="none" stroke="#00C087" strokeWidth="3" strokeLinecap="round" d="M438,178 Q458,162 462,143 Q466,124 455,112"/>
          <ellipse cx="455" cy="110" rx="5" ry="7" fill="#00C087" opacity="0.8"/>
        </g>
        <ellipse cx="348" cy="192" rx="105" ry="65" fill="#111120" stroke="#00C087" strokeWidth="1.8"/>
        <ellipse cx="268" cy="178" rx="52" ry="48" fill="#111120" stroke="#00C087" strokeWidth="1.5"/>
        <ellipse cx="418" cy="188" rx="42" ry="45" fill="#111120" stroke="#00C087" strokeWidth="1.5"/>
        <path fill="none" stroke="#00C087" strokeWidth="2.2" d="M238,148 Q270,132 320,138 Q360,142 400,145 Q430,148 448,162"/>
        <path fill="none" stroke="#00C087" strokeWidth="1.2" opacity="0.5" d="M248,218 Q300,232 350,233 Q400,233 440,222"/>
        <path fill="#111120" stroke="#00C087" strokeWidth="1.8" d="M248,218 Q232,208 222,192 Q210,172 215,148 Q220,130 235,122 Q250,114 268,118 Q284,122 292,138 Q298,152 295,170 Q292,188 280,200 Z"/>
        <path fill="#111120" stroke="#00C087" strokeWidth="2" d="M168,148 Q172,118 192,108 Q212,98 232,102 Q252,106 258,122 Q264,138 256,155 Q248,168 230,172 Q210,174 192,165 Q174,156 168,148 Z"/>
        <ellipse cx="175" cy="152" rx="22" ry="16" fill="#0d0d1a" stroke="#00C087" strokeWidth="1.5"/>
        <ellipse cx="168" cy="154" rx="5" ry="4" fill="#00C087" opacity="0.6"/>
        <ellipse cx="181" cy="154" rx="5" ry="4" fill="#00C087" opacity="0.6"/>
        <g className="g-eye">
          <circle cx="228" cy="118" r="9" fill="#00C087" opacity="0.25"/>
          <circle cx="228" cy="118" r="6" fill="#00C087"/>
          <circle cx="228" cy="118" r="3" fill="#0A0A0F"/>
          <circle cx="230" cy="116" r="1.5" fill="#00C087" opacity="0.8"/>
        </g>
        <path fill="none" stroke="#00C087" strokeWidth="3" strokeLinecap="round" d="M215,103 Q205,78 198,58 Q194,44 202,36"/>
        <path fill="none" stroke="#00C087" strokeWidth="4" strokeLinecap="round" d="M235,102 Q242,75 252,55 Q258,40 268,34"/>
        <circle cx="202" cy="34" r="3" fill="#00C087" opacity="0.7"/>
        <circle cx="270" cy="33" r="4" fill="#00C087" opacity="0.9"/>
        <ellipse cx="248" cy="105" rx="10" ry="7" fill="#111120" stroke="#00C087" strokeWidth="1.5" transform="rotate(-25 248 105)"/>
        <g className="g-lfl">
          <rect x="278" y="228" width="14" height="52" rx="6" fill="#111120" stroke="#00C087" strokeWidth="1.8"/>
          <ellipse cx="285" cy="282" rx="10" ry="6" fill="#00C087" opacity="0.8"/>
          <ellipse cx="285" cy="250" rx="9" ry="7" fill="#111120" stroke="#00C087" strokeWidth="1.2"/>
        </g>
        <g className="g-lfr">
          <rect x="300" y="228" width="14" height="52" rx="6" fill="#111120" stroke="#00C087" strokeWidth="1.8"/>
          <ellipse cx="307" cy="282" rx="10" ry="6" fill="#00C087" opacity="0.8"/>
          <ellipse cx="307" cy="250" rx="9" ry="7" fill="#111120" stroke="#00C087" strokeWidth="1.2"/>
        </g>
        <g className="g-lbl">
          <rect x="382" y="228" width="14" height="52" rx="6" fill="#111120" stroke="#00C087" strokeWidth="1.8"/>
          <ellipse cx="389" cy="282" rx="10" ry="6" fill="#00C087" opacity="0.8"/>
          <ellipse cx="389" cy="248" rx="10" ry="8" fill="#111120" stroke="#00C087" strokeWidth="1.2"/>
        </g>
        <g className="g-lbr">
          <rect x="404" y="228" width="14" height="52" rx="6" fill="#111120" stroke="#00C087" strokeWidth="1.8"/>
          <ellipse cx="411" cy="282" rx="10" ry="6" fill="#00C087" opacity="0.8"/>
          <ellipse cx="411" cy="248" rx="10" ry="8" fill="#111120" stroke="#00C087" strokeWidth="1.2"/>
        </g>
        <ellipse cx="195" cy="175" rx="16" ry="10" fill="#111120" stroke="#00C087" strokeWidth="1.2" opacity="0.8"/>
      </g>

      <text x="340" y="306" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="15" fontWeight="700" fill="#00C087" letterSpacing="4">SCANNING NIFTY 500</text>
      <text x="340" y="324" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="11" fill="#8888AA">Fetching live NSE data · Applying Turtle Trading rules</text>

      <rect x="200" y="333" width="280" height="6" rx="3" fill="#1E1E2E"/>
      <rect x="200" y="333" height="6" rx="3" fill="url(#pg)">
        <animate attributeName="width" values="15;250;15" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
      </rect>

      <g className="tg0">
        <rect x="30" y="60" width="108" height="24" rx="12" fill="#00C08718" stroke="#00C087" strokeWidth="1"/>
        <text x="84" y="76" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill="#00C087">Fetching prices</text>
      </g>
      <g className="tg1">
        <rect x="30" y="95" width="114" height="24" rx="12" fill="#5B6CF918" stroke="#5B6CF9" strokeWidth="1"/>
        <text x="87" y="111" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill="#5B6CF9">Calculating EMAs</text>
      </g>
      <g className="tg2">
        <rect x="540" y="60" width="112" height="24" rx="12" fill="#FFB30018" stroke="#FFB300" strokeWidth="1"/>
        <text x="596" y="76" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill="#FFB300">Scoring signals</text>
      </g>
      <g className="tg3">
        <rect x="530" y="95" width="122" height="24" rx="12" fill="#00C08718" stroke="#00C087" strokeWidth="1"/>
        <text x="591" y="111" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill="#00C087">Finding BUY signals</text>
      </g>
    </svg>
  )
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomeTab({ onNavigate }: { onNavigate:(tab:string)=>void }) {
  const [market,setMarket]=useState<any>(null)
  const [scan,setScan]=useState<any>(null)
  const [portfolio,setPortfolio]=useState<any>(null)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    Promise.all([
      fetch('/api/market').then(r=>r.json()),
      fetch('/api/scan').then(r=>r.json()),
      fetch('/api/portfolio',{headers:{'x-user-id':localStorage.getItem('uid')??''}}).then(r=>r.json()),
    ]).then(([m,s,p])=>{ setMarket(m); setScan(s); setPortfolio(p) }).finally(()=>setLoading(false))
  },[])

  const niftyColor=(market?.nifty_change_pct??0)>=0?'var(--buy)':'var(--sell)'

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700 }}>Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'} 👋</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:market?.is_open?'var(--buy)':'var(--sell)' }}/>
            <span style={{ fontSize:13, color:'var(--text-2)' }}>{market?.is_open?'Market Open':'Market Closed'}</span>
          </div>
        </div>
        <button className="btn btn-outline" style={{ fontSize:13, padding:'8px 14px' }} onClick={()=>onNavigate('chat')}>🤖 AI Chat</button>
      </div>

      <div className="card">
        <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>NIFTY 50</div>
        {loading?<div className="skeleton" style={{ height:36, width:160, marginBottom:8 }}/>:(
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div style={{ fontSize:32, fontWeight:700 }}>{market?.nifty_close?.toLocaleString('en-IN')}</div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:16, fontWeight:600, color:niftyColor }}>{market?.nifty_change>=0?'+':''}{market?.nifty_change}</div>
              <div style={{ fontSize:13, color:niftyColor }}>{pct(market?.nifty_change_pct??0)}</div>
              <div style={{ marginTop:4 }}><Badge signal={market?.trend??'SIDEWAYS'}/></div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop:12 }}>
        <div className="section-label">Portfolio</div>
        <div style={{ fontSize:28, fontWeight:700, marginBottom:12 }}>
          {loading?<div className="skeleton" style={{ height:28, width:140 }}/>:fmt(portfolio?.summary?.portfolio_value??0)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[['Today P&L',fmt(portfolio?.summary?.total_pnl??0),(portfolio?.summary?.total_pnl??0)>=0?'var(--buy)':'var(--sell)'],
            ['Cash',fmt(portfolio?.summary?.cash_balance??0),null],
            ['Positions',String(portfolio?.summary?.open_positions??0),null],
            ['Deployed',fmt(portfolio?.summary?.total_deployed??0),null]].map(([label,val,color])=>(
            <div key={label as string} style={{ background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', padding:10 }}>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>{label}</div>
              <div style={{ fontSize:15, fontWeight:700, color:(color as string)??'var(--text)', marginTop:2 }}>
                {loading?<div className="skeleton" style={{ height:18, width:80 }}/>:val}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:12 }}>
        {(['BUY','SELL','WATCH'] as const).map(s=>(
          <div key={s} className="card" style={{ textAlign:'center', borderColor:sigColor(s), background:`${sigColor(s)}10`, cursor:'pointer' }} onClick={()=>onNavigate('scanner')}>
            <div style={{ fontSize:30, fontWeight:700, color:sigColor(s) }}>{loading?'--':scan?.counts?.[s]??0}</div>
            <div style={{ fontSize:11, fontWeight:700, color:sigColor(s) }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop:12, alignItems:'center', display:'flex', flexDirection:'column', gap:8 }}>
        <div className="section-label">Market Mood</div>
        <Gauge score={market?.mood_score??50}/>
      </div>

      {(scan?.signals?.filter((s:any)=>s.signal==='BUY')??[]).length>0&&(
        <div className="card" style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div className="section-label" style={{ marginBottom:0 }}>🟢 Top Buy Signals</div>
            <span style={{ fontSize:13, color:'var(--accent)', cursor:'pointer' }} onClick={()=>onNavigate('scanner')}>See all →</span>
          </div>
          {scan.signals.filter((s:any)=>s.signal==='BUY').slice(0,3).map((sig:ScanSignal)=>(
            <a key={sig.symbol} href={`/stock/${sig.symbol}`}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700 }}>{sig.symbol}</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>{sig.sector}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{fmt(sig.entry_price)}</div>
                  <div style={{ fontSize:12, color:'var(--text-2)' }}>{sig.ai_score}/100</div>
                </div>
                <Badge signal="BUY"/>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SCANNER ───────────────────────────────────────────────────────────────────
function ScannerTab() {
  const [signals,setSignals]=useState<ScanSignal[]>([])
  const [counts,setCounts]=useState({BUY:0,SELL:0,WATCH:0,HOLD:0})
  const [tab,setTab]=useState<'BUY'|'SELL'|'WATCH'>('BUY')
  const [scanning,setScanning]=useState(false)
  const [meta,setMeta]=useState<any>({})

  const runScan=useCallback(async(force=false)=>{
    setScanning(true)
    try {
      const res=await fetch(`/api/scan${force?'?force=1':''}`)
      const data=await res.json()
      setSignals(data.signals??[])
      setCounts(data.counts??{BUY:0,SELL:0,WATCH:0,HOLD:0})
      setMeta({scan_date:data.scan_date,total_scanned:data.total_scanned,cached:data.cached})
    } finally { setScanning(false) }
  },[])

  useEffect(()=>{ if(!signals.length) runScan() },[])

  const filtered=signals.filter(s=>s.signal===tab).sort((a,b)=>b.ai_score-a.ai_score)

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div className="page-title">Scanner</div>
          <div className="page-subtitle">{meta.total_scanned??0} stocks · {meta.scan_date??'today'}{meta.cached?' · cached':''}</div>
        </div>
        <button className="btn btn-outline" style={{ fontSize:13, padding:'8px 14px' }} onClick={()=>runScan(true)} disabled={scanning}>
          {scanning?'⏳':'↺ Scan'}
        </button>
      </div>

      <div className="tab-bar">
        {(['BUY','SELL','WATCH'] as const).map(t=>(
          <div key={t} className={`tab ${tab===t?`active-${t.toLowerCase()}`:''}`} onClick={()=>setTab(t)}>
            {t} <span style={{ fontWeight:400, fontSize:11 }}>({counts[t]})</span>
          </div>
        ))}
      </div>

      {scanning&&!signals.length?(
        <div style={{ padding:'0 0 20px' }}>
          <ChargingBull/>
        </div>
      ):filtered.length===0?(
        <div style={{ textAlign:'center', padding:60, color:'var(--text-2)' }}>
          <div style={{ fontSize:40 }}>{tab==='BUY'?'🟢':tab==='SELL'?'🔴':'🟡'}</div>
          <div style={{ marginTop:8, fontWeight:600 }}>No {tab} signals today</div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Tap ↺ Scan to refresh</div>
        </div>
      ):(
        filtered.map((sig,i)=><SignalCard key={sig.symbol} sig={sig} rank={i+1}/>)
      )}
    </div>
  )
}

function SignalCard({ sig, rank }: { sig:ScanSignal; rank:number }) {
  const color=sigColor(sig.signal)
  const riskPct=((sig.entry_price-sig.stop_loss)/sig.entry_price*100).toFixed(1)
  return (
    <a href={`/stock/${sig.symbol}`}>
      <div className="card" style={{ marginBottom:10, borderColor:`${color}30` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:700 }}>#{rank}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>{sig.symbol}</div>
              <div style={{ fontSize:12, color:'var(--text-2)' }}>{sig.company}</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <Badge signal={sig.signal}/>
            <div style={{ fontSize:18, fontWeight:700, marginTop:4 }}>{sig.ai_score}<span style={{ fontSize:11, color:'var(--text-3)' }}>/100</span></div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', padding:'10px 0', marginBottom:10 }}>
          {[['Entry',fmt(sig.entry_price),null],['Stop',fmt(sig.stop_loss),'var(--sell)'],['Risk',`${riskPct}%`,'var(--watch)']].map(([l,v,c])=>(
            <div key={l as string} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-3)' }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:(c as string)??'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11 }}>
          <span style={{ color:'var(--text-2)' }}>Confidence</span>
          <span style={{ color, fontWeight:700 }}>{Math.round(sig.confidence*100)}%</span>
        </div>
        <div className="conf-bar-bg"><div className="conf-bar-fill" style={{ width:`${sig.confidence*100}%`, background:color }}/></div>
        {sig.reasons[0]&&<div style={{ fontSize:12, color:'var(--text-3)', marginTop:8, fontStyle:'italic' }}>↳ {sig.reasons[0]}</div>}
        <div style={{ marginTop:8, display:'inline-block', background:'var(--accent-bg)', borderRadius:'var(--radius-sm)', padding:'2px 8px', fontSize:10, color:'var(--accent)' }}>{sig.sector}</div>
      </div>
    </a>
  )
}

// ── PORTFOLIO ─────────────────────────────────────────────────────────────────
function PortfolioTab() {
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    const uid=localStorage.getItem('uid')??''
    fetch('/api/portfolio',{headers:{'x-user-id':uid}}).then(r=>r.json()).then(setData).finally(()=>setLoading(false))
  },[])

  const summary=data?.summary??{}
  const positions=data?.positions??[]
  const pnlColor=(summary.total_pnl??0)>=0?'var(--buy)':'var(--sell)'

  return (
    <div className="page">
      <div className="page-header"><div className="page-title">Portfolio</div></div>
      <div className="card">
        <div className="section-label">Total Value</div>
        <div style={{ fontSize:34, fontWeight:700, marginBottom:12 }}>
          {loading?<div className="skeleton" style={{ height:34, width:160 }}/>:fmt(summary.portfolio_value??0)}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          {[['P&L',fmt(summary.total_pnl??0),pnlColor],['Cash',fmt(summary.cash_balance??0),'var(--buy)'],['Deployed',fmt(summary.total_deployed??0),null]].map(([l,v,c])=>(
            <div key={l as string} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-3)' }}>{l}</div>
              <div style={{ fontSize:14, fontWeight:700, color:(c as string)??'var(--text)' }}>{loading?'...':v}</div>
            </div>
          ))}
        </div>
        {summary.total_capital>0&&(
          <div style={{ marginTop:12 }}>
            <div className="conf-bar-bg">
              <div className="conf-bar-fill" style={{ width:`${Math.min(100,(summary.total_deployed/summary.total_capital)*100)}%`, background:'var(--accent)' }}/>
            </div>
            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4 }}>{((summary.total_deployed/summary.total_capital)*100).toFixed(0)}% deployed</div>
          </div>
        )}
      </div>
      <div style={{ marginTop:16, marginBottom:8, fontWeight:600 }}>Open Positions ({positions.length})</div>
      {loading?<div className="skeleton" style={{ height:140, borderRadius:12 }}/>
      :positions.length===0?(
        <div style={{ textAlign:'center', padding:50, color:'var(--text-2)' }}>
          <div style={{ fontSize:36 }}>📭</div>
          <div style={{ fontWeight:600, marginTop:8 }}>No open positions</div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Buy signals from Scanner to get started</div>
        </div>
      ):positions.map((pos:any)=>(
        <a key={pos.id} href={`/stock/${pos.symbol}`}>
          <div className="card" style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16 }}>{pos.symbol}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>{pos.holding_days}d held</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, color:pos.pnl>=0?'var(--buy)':'var(--sell)' }}>{fmt(pos.pnl)}</div>
                <div style={{ fontSize:13, color:pos.pnl_pct>=0?'var(--buy)':'var(--sell)' }}>{pct(pos.pnl_pct)}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['Qty',String(pos.quantity),null],['Avg',fmt(pos.avg_price),null],['LTP',fmt(pos.current_price),null],['Stop',fmt(pos.stop_loss),'var(--sell)']].map(([l,v,c])=>(
                <div key={l} style={{ background:'var(--bg-elevated)', borderRadius:6, padding:8 }}>
                  <div style={{ fontSize:10, color:'var(--text-3)' }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:(c as string)??'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

// ── WATCHLIST ─────────────────────────────────────────────────────────────────
function WatchlistTab() {
  const [lists,setLists]=useState<any[]>([])
  const [newName,setNewName]=useState('')
  const [showForm,setShowForm]=useState(false)

  const load=async()=>{
    const uid=localStorage.getItem('uid')??''
    try { const r=await fetch('/api/watchlist',{headers:{'x-user-id':uid}}); const j=await r.json(); setLists(j.data??[]) } catch {}
  }
  useEffect(()=>{ load() },[])

  const create=async()=>{
    if(!newName.trim()) return
    const uid=localStorage.getItem('uid')??''
    await fetch('/api/watchlist',{method:'POST',headers:{'Content-Type':'application/json','x-user-id':uid},body:JSON.stringify({name:newName})})
    setNewName(''); setShowForm(false); load()
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div className="page-title">Watchlists</div>
        <button className="btn btn-outline" style={{ fontSize:13, padding:'8px 14px' }} onClick={()=>setShowForm(!showForm)}>+ New</button>
      </div>
      {showForm&&(
        <div className="card" style={{ marginBottom:12 }}>
          <input placeholder="Watchlist name" value={newName} onChange={e=>setNewName(e.target.value)} style={{ marginBottom:10 }}/>
          <button className="btn btn-primary btn-full" onClick={create}>Create</button>
        </div>
      )}
      {lists.length===0?(
        <div style={{ textAlign:'center', padding:50, color:'var(--text-2)' }}>
          <div style={{ fontSize:36 }}>👁</div>
          <div style={{ fontWeight:600, marginTop:8 }}>No watchlists yet</div>
        </div>
      ):lists.map((wl:any)=>(
        <div key={wl.id} className="card" style={{ marginBottom:10, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:600 }}>{wl.name}</div>
            <div style={{ fontSize:13, color:'var(--text-3)' }}>{wl.count??0} stocks</div>
          </div>
          <span style={{ fontSize:24, color:'var(--text-3)' }}>›</span>
        </div>
      ))}
    </div>
  )
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [capital,setCapital]=useState('100000')
  const [risk,setRisk]=useState('1')
  const [saved,setSaved]=useState(false)

  const save=async()=>{
    const uid=localStorage.getItem('uid')??''
    await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json','x-user-id':uid},body:JSON.stringify({capital:+capital,risk_percent:+risk})})
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  return (
    <div className="page">
      <div className="page-header"><div className="page-title">Settings</div></div>
      <div className="card">
        <div className="section-label">Trading</div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:13, color:'var(--text-2)', display:'block', marginBottom:6 }}>Capital (₹)</label>
          <input type="number" value={capital} onChange={e=>setCapital(e.target.value)}/>
        </div>
        <div>
          <label style={{ fontSize:13, color:'var(--text-2)', display:'block', marginBottom:6 }}>Risk per trade (%)</label>
          <input type="number" value={risk} step="0.1" onChange={e=>setRisk(e.target.value)}/>
        </div>
      </div>
      <div className="card" style={{ marginTop:12 }}>
        <div className="section-label">Turtle Strategy Rules</div>
        {[['Entry','55-day high breakout'],['Exit','20-day low broken'],['Stop Loss','Entry − 2×ATR(14)'],['ADX Filter','ADX > 20'],['Volume Filter','> 1.5× 20-day avg'],['Trend Filter','Price > 200 EMA']].map(([k,v])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, color:'var(--text-2)' }}>{k}</span>
            <span style={{ fontSize:13, fontWeight:500 }}>{v}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-full" style={{ marginTop:16 }} onClick={save}>
        {saved?'✅ Saved':'Save Settings'}
      </button>
    </div>
  )
}

// ── 3:16 PM ───────────────────────────────────────────────────────────────────
function Candle316Tab() {
  const [symbol,setSymbol]=useState('')
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState<any[]>([])

  const lookup=async(sym?:string)=>{
    const s=(sym??symbol).trim().toUpperCase()
    if(!s) return
    setLoading(true); setError(''); setData(null)
    try {
      const res=await fetch(`/api/candle?symbol=${s}`)
      const json=await res.json()
      if(json.error) throw new Error(json.error)
      setData(json)
      setHistory(h=>[{symbol:s,color:json.candle_316?.color},...h.filter((x:any)=>x.symbol!==s)].slice(0,10))
    } catch(e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const c316=data?.candle_316
  const day=data?.day_candle
  const isGreen=c316?.color==='GREEN'
  const isDayGreen=day?.color==='GREEN'

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:'56px 16px 16px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>🕯️ 3:16 PM</div>
        <div style={{ fontSize:13, color:'var(--text-2)' }}>Any NSE stock — Green or Red candle at 3:16 PM</div>
      </div>

      <div style={{ padding:16 }}>
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==='Enter'&&lookup()}
            placeholder="Type any NSE symbol e.g. RELIANCE"
            style={{ flex:1, textTransform:'uppercase', fontWeight:600 }}/>
          <button className="btn btn-primary" style={{ padding:'0 20px', minWidth:70 }}
            onClick={()=>lookup()} disabled={loading||!symbol.trim()}>
            {loading?'⏳':'Check'}
          </button>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
          {['RELIANCE','TCS','HDFCBANK','INFY','SBIN','TATAMOTORS','IRFC','RVNL','HAL','BEL'].map(s=>(
            <button key={s} onClick={()=>{ setSymbol(s); lookup(s) }}
              style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:20, padding:'5px 14px', fontSize:12, color:'var(--text-2)', cursor:'pointer', fontWeight:600 }}>{s}</button>
          ))}
        </div>

        {error&&(
          <div style={{ background:'var(--sell-bg)', border:'1px solid var(--sell)', borderRadius:12, padding:14, color:'var(--sell)', fontSize:14, marginBottom:16 }}>
            ⚠️ {error} — Check the NSE symbol and try again
          </div>
        )}

        {loading&&(
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🕯️</div>
            <div style={{ color:'var(--text-2)' }}>Fetching 3:16 PM candle...</div>
          </div>
        )}

        {data&&c316&&!loading&&(
          <>
            <div style={{ background:isGreen?'var(--buy-bg)':'var(--sell-bg)', border:`2px solid ${isGreen?'var(--buy)':'var(--sell)'}`, borderRadius:20, padding:24, textAlign:'center', marginBottom:14 }}>
              <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:8 }}>{data.symbol} · {c316.time} IST · {data.date}</div>
              <div style={{ fontSize:88, lineHeight:1 }}>{isGreen?'🟢':'🔴'}</div>
              <div style={{ fontSize:30, fontWeight:800, color:isGreen?'var(--buy)':'var(--sell)', marginTop:10 }}>
                {isGreen?'GREEN CANDLE':'RED CANDLE'}
              </div>
              <div style={{ fontSize:34, fontWeight:700, marginTop:8 }}>₹{c316.close}</div>
              <div style={{ fontSize:16, color:isGreen?'var(--buy)':'var(--sell)', marginTop:4 }}>
                {c316.change>=0?'+':''}₹{c316.change} ({c316.change_pct>=0?'+':''}{c316.change_pct}%)
              </div>
            </div>

            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ fontWeight:700, marginBottom:12 }}>3:16 PM Candle Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[['Open',`₹${c316.open}`,null],['Close',`₹${c316.close}`,isGreen?'var(--buy)':'var(--sell)'],['High',`₹${c316.high}`,'var(--buy)'],['Low',`₹${c316.low}`,'var(--sell)'],['Volume',c316.volume.toLocaleString('en-IN'),null],['Body',`₹${Math.abs(c316.change).toFixed(2)}`,null]].map(([l,v,c])=>(
                  <div key={l as string} style={{ background:'var(--bg-elevated)', borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{l}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:(c as string)??'var(--text)', marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontWeight:700 }}>Full Day Candle</div>
                <span style={{ fontSize:13, fontWeight:700, color:isDayGreen?'var(--buy)':'var(--sell)', background:isDayGreen?'var(--buy-bg)':'var(--sell-bg)', padding:'3px 12px', borderRadius:20 }}>
                  {isDayGreen?'🟢 GREEN':'🔴 RED'}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['Prev Close',`₹${data.prev_close}`],['Day Open',`₹${day.open}`],['Day Close',`₹${day.close}`],['Day High',`₹${day.high}`],['Day Low',`₹${day.low}`],['Gap',`${data.gap_pct>=0?'+':''}${data.gap_pct}%`]].map(([l,v])=>(
                  <div key={l} style={{ background:'var(--bg-elevated)', borderRadius:8, padding:10 }}>
                    <div style={{ fontSize:10, color:'var(--text-3)' }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {data.gap_pct!==0&&(
              <div className="card" style={{ marginBottom:14 }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>Gap Analysis</div>
                <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.8 }}>
                  {data.symbol} opened with a <strong style={{ color:data.gap_pct>0?'var(--buy)':'var(--sell)' }}>{data.gap_pct>0?'gap up':'gap down'} of {Math.abs(data.gap_pct)}%</strong> from yesterday's close of ₹{data.prev_close}.
                  The 3:16 PM candle is <strong style={{ color:isGreen?'var(--buy)':'var(--sell)' }}>{isGreen?'green':'red'}</strong> —
                  {isGreen&&data.gap_pct>0?' gap up held. Bulls in control. 💪':''}
                  {isGreen&&data.gap_pct<0?' gap down recovered. Buyers stepped in. 🔄':''}
                  {!isGreen&&data.gap_pct>0?' gap up failed. Selling pressure emerged. ⚠️':''}
                  {!isGreen&&data.gap_pct<0?' gap down continued. Bears in control. 🐻':''}
                </div>
              </div>
            )}
          </>
        )}

        {history.length>0&&!data&&!loading&&(
          <div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Recent Lookups</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {history.map((h:any)=>(
                <button key={h.symbol} onClick={()=>{ setSymbol(h.symbol); lookup(h.symbol) }}
                  style={{ background:h.color==='GREEN'?'var(--buy-bg)':'var(--sell-bg)', border:`1px solid ${h.color==='GREEN'?'var(--buy)':'var(--sell)'}`, borderRadius:20, padding:'6px 14px', fontSize:13, color:h.color==='GREEN'?'var(--buy)':'var(--sell)', cursor:'pointer', fontWeight:600 }}>
                  {h.color==='GREEN'?'🟢':'🔴'} {h.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {!data&&!loading&&!error&&(
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-3)' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🕯️</div>
            <div style={{ fontSize:18, fontWeight:600, color:'var(--text-2)', marginBottom:10 }}>Check Any NSE Stock</div>
            <div style={{ fontSize:13, lineHeight:1.8 }}>
              Type any NSE symbol above.<br/>
              See if the 3:16 PM candle is<br/>
              <span style={{ color:'var(--buy)', fontWeight:700 }}>🟢 Green</span> or <span style={{ color:'var(--sell)', fontWeight:700 }}>🔴 Red</span><br/>
              <span style={{ fontSize:11, color:'var(--text-3)', marginTop:8, display:'block' }}>Works for ALL NSE listed stocks</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AI CHAT ───────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages,setMessages]=useState([{role:'ai',text:'👋 Ask me about any NSE stock or the Turtle Trading strategy.\n\nTry: "Should I buy Reliance?" or "Explain the strategy"'}])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const bottomRef=useRef<HTMLDivElement>(null)

  const send=async(text?:string)=>{
    const q=(text??input).trim()
    if(!q||loading) return
    setMessages(m=>[...m,{role:'user',text:q}])
    setInput('')
    setLoading(true)
    try {
      const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:q}]})})
      const data=await res.json()
      setMessages(m=>[...m,{role:'ai',text:data.reply}])
    } finally {
      setLoading(false)
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <div style={{ padding:'56px 16px 12px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:22, fontWeight:700 }}>AI Chat 🤖</div>
        <div style={{ fontSize:13, color:'var(--text-2)' }}>Rule-based · Free · No API key</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
            <div className={m.role==='user'?'bubble bubble-user':'bubble bubble-ai'}>{m.text}</div>
          </div>
        ))}
        {loading&&<div style={{ display:'flex' }}><div className="bubble bubble-ai" style={{ color:'var(--text-2)' }}>Thinking...</div></div>}
        {messages.length<=1&&(
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
            {['Explain Turtle Trading','How to size positions?','What is ADX?','What is ATR?'].map(s=>(
              <button key={s} onClick={()=>send(s)} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-full)', padding:'6px 14px', fontSize:13, color:'var(--text-2)', cursor:'pointer' }}>{s}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:'10px 16px 44px', borderTop:'1px solid var(--border)', display:'flex', gap:10, background:'var(--bg)', position:'sticky' as const, bottom:0, zIndex:200 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about any NSE stock..." onKeyDown={e=>e.key==='Enter'&&send()} style={{ flex:1 }}/>
        <button className="btn btn-primary" style={{ padding:'0 16px', minWidth:44 }} onClick={()=>send()} disabled={!input.trim()||loading}>↑</button>
      </div>
    </div>
  )
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth:()=>void }) {
  const [isLogin,setIsLogin]=useState(true)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  const submit=async()=>{
    setLoading(true); setError('')
    try {
      const {createClient}=await import('@supabase/supabase-js')
      const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      if(isLogin) {
        const {data,error}=await sb.auth.signInWithPassword({email,password})
        if(error) throw error
        localStorage.setItem('uid',data.user?.id??'')
      } else {
        const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}})
        if(error) throw error
        localStorage.setItem('uid',data.user?.id??'')
      }
      onAuth()
    } catch(e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', marginBottom:40 }}>
        <div style={{ fontSize:60, marginBottom:8 }}>🐢</div>
        <div style={{ fontSize:28, fontWeight:700 }}>TurtleTrader AI</div>
        <div style={{ fontSize:14, color:'var(--text-2)', marginTop:4 }}>Indian Equity · Turtle Strategy · Free</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {!isLogin&&<input placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)}/>}
        <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        {error&&<div style={{ color:'var(--sell)', fontSize:13 }}>{error}</div>}
        <button className="btn btn-primary btn-full" onClick={submit} disabled={loading} style={{ marginTop:4 }}>
          {loading?'...':isLogin?'Sign In':'Create Account'}
        </button>
        <div style={{ textAlign:'center', color:'var(--accent)', fontSize:14, cursor:'pointer' }} onClick={()=>setIsLogin(!isLogin)}>
          {isLogin?"Don't have an account? Sign Up":'Already registered? Sign In'}
        </div>
      </div>
      <div style={{ marginTop:32, background:'var(--buy-bg)', borderRadius:'var(--radius-md)', padding:12, textAlign:'center', border:'1px solid var(--buy)' }}>
        <div style={{ color:'var(--buy)', fontWeight:600, fontSize:13 }}>🔒 No third-party accounts needed</div>
        <div style={{ color:'var(--buy)', fontSize:12, marginTop:2, opacity:0.8 }}>Self-hosted · Zero cost · No API keys</div>
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
const NAV=[
  {id:'home',      icon:'🏠', label:'Home'},
  {id:'scanner',   icon:'🔍', label:'Scanner'},
  {id:'portfolio', icon:'📊', label:'Portfolio'},
  {id:'watchlist', icon:'👁', label:'Watchlist'},
  {id:'settings',  icon:'⚙️', label:'Settings'},
  {id:'candle316', icon:'🕯️', label:'3:16 PM'},
]

export default function App() {
  const [authed,setAuthed]=useState(false)
  const [tab,setTab]=useState('home')

  useEffect(()=>{ if(localStorage.getItem('uid')) setAuthed(true) },[])

  if(!authed) return <AuthScreen onAuth={()=>setAuthed(true)}/>

  return (
    <>
      {tab==='home'      &&<HomeTab onNavigate={setTab}/>}
      {tab==='scanner'   &&<ScannerTab/>}
      {tab==='portfolio' &&<PortfolioTab/>}
      {tab==='watchlist' &&<WatchlistTab/>}
      {tab==='settings'  &&<SettingsTab/>}
      {tab==='chat'      &&<ChatTab/>}
      {tab==='candle316' &&<Candle316Tab/>}
      <nav className="bottom-nav">
        {NAV.map(n=>(
          <div key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)}>
            <span>{n.icon}</span>{n.label}
          </div>
        ))}
      </nav>
    </>
  )
}
