'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const fmt = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${n.toFixed(2)}`
}
const sigColor = (s: string) =>
  s === 'BUY' ? 'var(--buy)' : s === 'SELL' ? 'var(--sell)' : s === 'WATCH' ? 'var(--watch)' : 'var(--hold)'

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const router = useRouter()
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [capital, setCapital] = useState(100000)
  const [riskPct, setRiskPct] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState('')

  useEffect(() => {
    fetch(`/api/stock?symbol=${symbol}`)
      .then(r => r.json()).then(setData).finally(() => setLoading(false))

    const savedCapital = localStorage.getItem('capital')
    const savedRisk = localStorage.getItem('risk')
    if (savedCapital) setCapital(+savedCapital)
    if (savedRisk) setRiskPct(+savedRisk)
  }, [symbol])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div style={{ color: 'var(--text-2)' }}>Loading {symbol}...</div>
    </div>
  )

  if (!data || data.error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: 'var(--sell)' }}>{data?.error ?? 'Failed to load'}</div>
      <button className="btn btn-outline" onClick={() => router.back()}>← Go Back</button>
    </div>
  )

  const sig = data.signal
  const color = sigColor(sig.signal)
  const riskPerShare = sig.entry_price - sig.stop_loss
  const maxLoss = capital * (riskPct / 100)
  const shares = riskPerShare > 0 ? Math.floor(maxLoss / riskPerShare) : 0
  const capitalRequired = shares * sig.entry_price
  const riskPercent = ((riskPerShare / sig.entry_price) * 100).toFixed(1)

  const scoreEntries = [
    ['Trend', sig.scores.trend, '30%'],
    ['Momentum', sig.scores.momentum, '20%'],
    ['Volume', sig.scores.volume, '20%'],
    ['Sector', sig.scores.sector, '10%'],
    ['Risk', sig.scores.risk, '10%'],
    ['Market', sig.scores.market, '10%'],
  ]

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--text)', lineHeight: 1 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{data.symbol}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{data.company} · {data.sector}</div>
        </div>
        <span className={`badge badge-${sig.signal}`} style={{ fontSize: 13, padding: '5px 14px' }}>{sig.signal}</span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Price + Stop */}
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Entry Price</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt(sig.entry_price)}</div>
            </div>
            <div style={{ background: 'var(--border)', alignSelf: 'stretch' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Stop Loss</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--sell)' }}>{fmt(sig.stop_loss)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Risk {riskPercent}% · ATR {sig.atr_val.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* AI Score */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>AI Score</div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{sig.ai_score}<span style={{ fontSize: 13, color: 'var(--text-3)' }}>/100</span></div>
          </div>
          {scoreEntries.map(([label, value, weight]) => (
            <div key={label as string} className="score-row">
              <div style={{ width: 80, display: 'flex', justifyContent: 'space-between' }}>
                <span className="score-label" style={{ width: 'auto' }}>{label}</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{weight}</span>
              </div>
              <div className="score-bar-bg" style={{ flex: 1 }}>
                <div className="score-bar-fill" style={{ width: `${value}%`, background: color }} />
              </div>
              <span className="score-val" style={{ color }}>{value}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Confidence</span>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(sig.confidence * 100)}%</span>
          </div>
          <div className="conf-bar-bg">
            <div className="conf-bar-fill" style={{ width: `${sig.confidence * 100}%`, background: color }} />
          </div>
        </div>

        {/* Signal reasons */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Signal Reasons</div>
          {sig.reasons.map((r: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* AI Explanation */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>🤖 AI Analysis</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.explanation}</div>
        </div>

        {/* Position Size Calculator */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📐 Position Sizing</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Capital (₹)</div>
              <input type="number" value={capital} onChange={e => { setCapital(+e.target.value); localStorage.setItem('capital', e.target.value) }} style={{ padding: '8px 10px', fontSize: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Risk %</div>
              <input type="number" value={riskPct} step={0.1} onChange={e => { setRiskPct(+e.target.value); localStorage.setItem('risk', e.target.value) }} style={{ padding: '8px 10px', fontSize: 14 }} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Shares to Buy', String(shares), 'var(--buy)'],
              ['Capital Required', fmt(capitalRequired), null],
              ['Max Loss', fmt(maxLoss), 'var(--sell)'],
              ['Risk/Share', fmt(riskPerShare), 'var(--watch)'],
            ].map(([l, v, c]) => (
              <div key={l as string}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: (c as string) ?? 'var(--text)', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 14 }}
            disabled={shares<=0||adding}
            onClick={async()=>{
              setAdding(true); setAddMsg('')
              try{
                const uid=localStorage.getItem('uid')??''
                const res=await fetch('/api/portfolio',{
                  method:'POST',
                  headers:{'Content-Type':'application/json','x-user-id':uid},
                  body:JSON.stringify({
                    symbol: data.symbol,
                    company: data.company,
                    quantity: shares,
                    entry_price: sig.entry_price,
                    stop_loss: sig.stop_loss,
                  }),
                })
                const json=await res.json()
                if(json.error) throw new Error(json.error)
                setAddMsg('✅ Added to Portfolio')
              }catch(e:any){
                setAddMsg('⚠️ '+(e.message??'Failed to add'))
              }finally{
                setAdding(false)
              }
            }}
          >
            {adding ? 'Adding...' : `+ Add ${shares} shares to Portfolio`}
          </button>
          {addMsg && <div style={{ marginTop: 8, fontSize: 13, textAlign: 'center', color: addMsg.startsWith('✅') ? 'var(--buy)' : 'var(--sell)' }}>{addMsg}</div>}
        </div>

        {/* Key levels */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Key Levels</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Breakout Level', fmt(sig.breakout_level), 'var(--buy)'],
              ['Stop Loss', fmt(sig.stop_loss), 'var(--sell)'],
              ['Target 1 (Resistance)', sig.target1 ? fmt(sig.target1) : '—', 'var(--buy)'],
              ['Target 2 (1:2 R:R)', sig.target2 ? fmt(sig.target2) : '—', 'var(--buy)'],
              ['ATR (14)', sig.atr_val.toFixed(2), null],
              ['Sector', data.sector, null],
            ].map(([l, v, c]) => (
              <div key={l as string} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: (c as string) ?? 'var(--text)', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          {sig.target2 && sig.entry_price > sig.stop_loss && (
            <div style={{ marginTop: 12, padding: 10, background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Risk/Reward Ratio</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                {((sig.target2 - sig.entry_price) / (sig.entry_price - sig.stop_loss)).toFixed(1)}:1
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
