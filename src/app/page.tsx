'use client'
import BullScanner from '@/components/BullScanner'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScanSignal, MarketStatus, Position } from '@/types'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n/1e7).toFixed(2)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n/1e5).toFixed(2)}L`
  if (Math.abs(n) >= 1e3) return `₹${(n/1e3).toFixed(1)}K`
  return `₹${n.toFixed(2)}`
}
const pct = (n: number) => `${n>=0?'+':''}${n.toFixed(2)}%`
const sigColor = (s: string) => s==='BUY'||s==='STRONG BUY'?'var(--buy)':s==='SELL'?'var(--sell)':s==='WATCH'?'var(--watch)':'var(--hold)'

function Badge({ signal }: { signal: string }) {
  const cls = signal === 'STRONG BUY' ? 'badge-BUY' : `badge-${signal}`
  return <span className={`badge ${cls}`}>{signal}</span>
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
          {scan.signals.filter((s:any)=>s.signal==='BUY'||s.signal==='STRONG BUY').slice(0,3).map((sig:ScanSignal)=>(
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
  const [tab,setTab]=useState<'BUY'|'SELL'|'WATCH'|'HOLD'>('BUY')
  const [scanning,setScanning]=useState(false)
  const [meta,setMeta]=useState<any>({is_market_hours:false})

  const runScan=useCallback(async(force=false)=>{
    setScanning(true)
    try {
      // Batch 0 first — returns quickly with first 50 stocks + cached check
      const res0=await fetch(`/api/scan${force?'?force=1':''}`)
      const data0=await res0.json()

      // If cached, use directly — no need to fetch more batches
      if(data0.cached && !force){
        setSignals(data0.signals??[])
        setCounts(data0.counts??{BUY:0,'STRONG BUY':0,SELL:0,WATCH:0,HOLD:0})
        setMeta({scan_date:data0.scan_date,total_scanned:data0.total_scanned,cached:true,is_market_hours:data0.is_market_hours})
        return
      }

      // Fresh scan — collect all signals from all batches
      let allSignals=[...(data0.signals??[])]
      const totalBatches=7 // 7 batches × 50 = 350 stocks

      // Fetch remaining batches in parallel (2 at a time to avoid rate limits)
      for(let b=1; b<totalBatches; b++){
        try {
          const res=await fetch(`/api/scan?batch=${b}${force?'&force=1':''}`)
          const data=await res.json()
          allSignals=[...allSignals,...(data.signals??[])]
          // Update UI progressively as each batch comes in
          const counts:{[k:string]:number}={BUY:0,'STRONG BUY':0,SELL:0,WATCH:0,HOLD:0}
          allSignals.forEach(s=>{ counts[s.signal]=(counts[s.signal]??0)+1 })
          setSignals([...allSignals])
          setCounts(counts as any)
          setMeta({scan_date:data0.scan_date,total_scanned:allSignals.length,cached:false,is_market_hours:data0.is_market_hours})
        } catch(e){ console.warn('Batch '+b+' failed:', e) }
      }
    } finally { setScanning(false) }
  },[])

  useEffect(()=>{ if(!signals.length) runScan() },[])

  const filtered=signals.filter(s=>tab==='BUY'?(s.signal==='BUY'||s.signal==='STRONG BUY'):s.signal===tab).sort((a,b)=>(b.ai_score??0)-(a.ai_score??0))

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div className="page-title">Scanner</div>
          <div className="page-subtitle">{(counts.BUY??0)+(counts.SELL??0)+(counts.WATCH??0)+(counts.HOLD??0)} signals · {meta.scan_date??'today'}{meta.is_market_hours?' · 🟢 Live':' · 🔴 Closed'}</div>
        </div>
        <button className="btn btn-outline" style={{ fontSize:13, padding:'8px 14px' }} onClick={()=>runScan(true)} disabled={scanning}>
          {scanning?'⏳':meta.is_market_hours?'🟢 Scan Live':'↺ Scan'}
        </button>
      </div>

      <div style={{ display:"flex", gap:6, padding:"10px 0 14px", borderBottom:"none" }}>
        {(['BUY','SELL','WATCH','HOLD'] as const).map(t=>{
          const tabColor = t==='BUY'?'var(--buy)':t==='SELL'?'var(--sell)':t==='WATCH'?'var(--watch)':'var(--text-2)'
          const isActive = tab===t
          return (
            <div key={t} onClick={()=>setTab(t)} style={{
              flex:1, padding:'8px 4px', textAlign:'center', cursor:'pointer',
              borderRadius:10,
              background: isActive ? (t==='BUY'?'var(--buy-bg)':t==='SELL'?'var(--sell-bg)':t==='WATCH'?'var(--watch-bg)':'var(--bg-elevated)') : 'transparent',
              border: isActive ? `1.5px solid ${tabColor}` : '1.5px solid transparent',
              transition:'all 0.2s',
            }}>
              <div style={{ fontSize:12, fontWeight:700, color: isActive ? tabColor : 'var(--text-3)' }}>{t}</div>
              <div style={{ fontSize:11, color: isActive ? tabColor : 'var(--text-3)', opacity:0.8 }}>{(counts as any)[t]??0}</div>
            </div>
          )
        })}
      </div>

      {/* Bearish market warning banner — BUY tab only */}
      {tab==='BUY'&&!scanning&&signals.length>0&&(counts.BUY??0)===0&&(
        <div style={{
          margin:'0 0 12px',
          background:'#FF475710',
          border:'1px solid #FF4757',
          borderRadius:12,
          padding:'12px 14px',
          display:'flex',
          gap:10,
          alignItems:'flex-start',
        }}>
          <span style={{ fontSize:20 }}>🛡️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--sell)', marginBottom:3 }}>
              Capital Protection Mode — Market is BEARISH
            </div>
            <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>
              Nifty 50 EMA is below 200 EMA. No BUY signals generated.
              This protects your capital. Check WATCH tab for stocks to monitor — they will turn BUY when the market recovers.
            </div>
          </div>
        </div>
      )}

      {scanning&&!signals.length?(
        <div style={{ padding:'0 0 20px' }}>
          <BullScanner/>
        </div>
      ):(
        <div
          style={{ touchAction:'pan-y' }}
          onTouchStart={e=>{
            const el=e.currentTarget as any
            el._touchStartX=e.touches[0].clientX
          }}
          onTouchEnd={e=>{
            const el=e.currentTarget as any
            const dx=e.changedTouches[0].clientX-(el._touchStartX??0)
            const TABS=['BUY','SELL','WATCH','HOLD'] as const
            const idx=TABS.indexOf(tab as any)
            if(dx < -50 && idx < TABS.length-1) setTab(TABS[idx+1])
            if(dx > 50  && idx > 0)             setTab(TABS[idx-1])
          }}
        >
          {filtered.length===0?(
            <div style={{ textAlign:'center', padding:60, color:'var(--text-2)' }}>
              <div style={{ fontSize:40 }}>{tab==='BUY'?'🟢':tab==='SELL'?'🔴':tab==='WATCH'?'🟡':'⚪'}</div>
              <div style={{ marginTop:8, fontWeight:600 }}>No {tab} signals today</div>
              <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Tap ↺ Scan to refresh</div>
            </div>
          ):(
            filtered.map((sig,i)=><SignalCard key={sig.symbol} sig={sig} rank={i+1}/>)
          )}
        </div>
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


// ── CANDLES TAB (wrapper with subpages) ──────────────────────────────────────
function CandlesTab() {
  const [subpage, setSubpage] = useState<'316'|'15m'>('316')

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Subpage header */}
      <div style={{ padding: '56px 16px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>🕯️ Candles</div>
        <div style={{ display: 'flex', gap: 0 }}>
          <button onClick={() => setSubpage('316')} style={{
            flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: subpage === '316' ? '2px solid var(--buy)' : '2px solid transparent',
            color: subpage === '316' ? 'var(--buy)' : 'var(--text-3)',
          }}>3:16 PM</button>
          <button onClick={() => setSubpage('15m')} style={{
            flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: subpage === '15m' ? '2px solid var(--accent)' : '2px solid transparent',
            color: subpage === '15m' ? 'var(--accent)' : 'var(--text-3)',
          }}>15 Min</button>
        </div>
      </div>

      {subpage === '316' && <Candle316Content/>}
      {subpage === '15m' && <Candle15mContent/>}
    </div>
  )
}

// ── 15 MIN CANDLE CONTENT ─────────────────────────────────────────────────────
function Candle15mContent() {
  const [symbol, setSymbol] = useState('INFY')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState('')

  const fetch15m = async (sym?: string) => {
    const s = (sym ?? symbol).trim().toUpperCase()
    if (!s) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/candles15m?symbol=${s}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch(e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch15m('INFY') }, [])

  const curr = data?.current_candle
  const isGreen = curr?.color === 'GREEN'

  return (
    <div style={{ padding: 16 }}>

      {/* Symbol input */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && fetch15m()}
          placeholder="NSE symbol e.g. INFY"
          style={{ flex: 1, textTransform: 'uppercase', fontWeight: 600 }}/>
        <button className="btn btn-outline" style={{ padding: '0 16px', minWidth: 52 }}
          onClick={() => fetch15m()} disabled={loading}>
          {loading ? '⏳' : '↺'}
        </button>
      </div>

      {/* Quick picks */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {['INFY','RELIANCE','TCS','HDFCBANK','SBIN','TATAMOTORS'].map(s => (
          <button key={s} onClick={() => { setSymbol(s); fetch15m(s) }}
            style={{ background: symbol === s ? 'var(--accent-bg)' : 'var(--bg-elevated)',
              border: `1px solid ${symbol === s ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 20, padding: '5px 14px', fontSize: 12,
              color: symbol === s ? 'var(--accent)' : 'var(--text-2)',
              cursor: 'pointer', fontWeight: 600 }}>{s}</button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--sell-bg)', border: '1px solid var(--sell)', borderRadius: 12, padding: 14, color: 'var(--sell)', fontSize: 14, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🕯️</div>
          <div style={{ color: 'var(--text-2)' }}>Fetching 15-min candles...</div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.is_market_open ? 'var(--buy)' : 'var(--sell)' }}/>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{data.is_market_open ? 'Market Open' : 'Market Closed'}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Last refresh: {lastRefresh}</span>
          </div>

          {/* Day info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              ['Day Open', `₹${data.day_open}`, 'var(--accent)'],
              ['Prev Close', `₹${data.prev_close}`, null],
              ['Gap', `${data.gap_pct >= 0 ? '+' : ''}${data.gap_pct}%`, data.gap_pct >= 0 ? 'var(--buy)' : 'var(--sell)'],
            ].map(([l,v,c]) => (
              <div key={l as string} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: (c as string) ?? 'var(--text)', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Current 15-min candle */}
          {curr && (
            <div style={{
              background: isGreen ? 'var(--buy-bg)' : 'var(--sell-bg)',
              border: `2px solid ${isGreen ? 'var(--buy)' : 'var(--sell)'}`,
              borderRadius: 20, padding: 20, textAlign: 'center', marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>
                Current 15-min Candle · {curr.time_ist} IST
              </div>
              <div style={{ fontSize: 64, lineHeight: 1 }}>{isGreen ? '🟢' : '🔴'}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: isGreen ? 'var(--buy)' : 'var(--sell)', marginTop: 8 }}>
                {isGreen ? 'GREEN' : 'RED'} CANDLE
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>₹{curr.close}</div>
              <div style={{ fontSize: 15, color: isGreen ? 'var(--buy)' : 'var(--sell)', marginTop: 4 }}>
                {curr.change >= 0 ? '+' : ''}₹{curr.change} ({curr.change_pct >= 0 ? '+' : ''}{curr.change_pct}%)
              </div>

              {/* Alert inside current candle */}
              {curr.alert && (
                <div style={{
                  marginTop: 14, padding: '10px 16px',
                  background: curr.alert.type === 'BUY' ? 'var(--buy-bg)' : 'var(--sell-bg)',
                  border: `1px solid ${curr.alert.type === 'BUY' ? 'var(--buy)' : 'var(--sell)'}`,
                  borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: curr.alert.type === 'BUY' ? 'var(--buy)' : 'var(--sell)',
                }}>
                  {curr.alert.message}
                </div>
              )}
            </div>
          )}

          {/* Current candle OHLC */}
          {curr && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Current Candle OHLC</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Open',   `₹${curr.open}`,   null],
                  ['Close',  `₹${curr.close}`,  isGreen ? 'var(--buy)' : 'var(--sell)'],
                  ['High',   `₹${curr.high}`,   'var(--buy)'],
                  ['Low',    `₹${curr.low}`,    'var(--sell)'],
                  ['Volume', curr.volume.toLocaleString('en-IN'), null],
                  ['Body',   `₹${Math.abs(curr.change).toFixed(2)}`, null],
                ].map(([l,v,c]) => (
                  <div key={l as string} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: (c as string) ?? 'var(--text)', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All alerts today */}
          {data.alerts?.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>🔔 Alerts Today</div>
              {data.alerts.map((a: any, i: number) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 8,
                  background: a.alert.type === 'BUY' ? 'var(--buy-bg)' : 'var(--sell-bg)',
                  border: `1px solid ${a.alert.type === 'BUY' ? 'var(--buy)' : 'var(--sell)'}`,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{a.time_ist} IST</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: a.alert.type === 'BUY' ? 'var(--buy)' : 'var(--sell)' }}>
                    {a.alert.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All 15-min candles table */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>All 15-Min Candles · {data.session_date}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Time','O','H','L','C','Color','Alert'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', color: 'var(--text-3)', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...data.candles].reverse().map((c: any, i: number) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--border)',
                      background: c.is_current ? 'var(--bg-elevated)' : 'transparent',
                    }}>
                      <td style={{ padding: '7px 8px', fontWeight: c.is_current ? 700 : 400, color: c.is_current ? 'var(--accent)' : 'var(--text-2)' }}>
                        {c.time_ist}{c.is_current ? ' ●' : ''}
                      </td>
                      <td style={{ padding: '7px 8px' }}>₹{c.open}</td>
                      <td style={{ padding: '7px 8px', color: 'var(--buy)' }}>₹{c.high}</td>
                      <td style={{ padding: '7px 8px', color: 'var(--sell)' }}>₹{c.low}</td>
                      <td style={{ padding: '7px 8px', fontWeight: 600, color: c.color === 'GREEN' ? 'var(--buy)' : 'var(--sell)' }}>₹{c.close}</td>
                      <td style={{ padding: '7px 8px' }}>
                        <span style={{ fontSize: 14 }}>{c.color === 'GREEN' ? '🟢' : '🔴'}</span>
                      </td>
                      <td style={{ padding: '7px 8px' }}>
                        {c.alert && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: c.alert.type === 'BUY' ? 'var(--buy-bg)' : 'var(--sell-bg)',
                            color: c.alert.type === 'BUY' ? 'var(--buy)' : 'var(--sell)',
                          }}>{c.alert.type}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="btn btn-outline btn-full" onClick={() => fetch15m()} disabled={loading}>
            {loading ? '⏳ Refreshing...' : '↺ Refresh Candles'}
          </button>
        </>
      )}
    </div>
  )
}

// ── 3:16 PM ───────────────────────────────────────────────────────────────────
function Candle316Content() {
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
              <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:4 }}>{data.symbol} · 3:16 PM IST</div>
              <div style={{ fontSize:12, color:'var(--accent)', marginBottom:8 }}>{data.session_label}</div>
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
  {id:'candles',   icon:'🕯️', label:'Candles'},
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
      {tab==='candles'   &&<CandlesTab/>}
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
