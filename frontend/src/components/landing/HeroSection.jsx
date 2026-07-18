import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

/* ── Pre-computed constellation nodes ────────────────────────── */
const NODES = [
  {x:8,y:15},{x:25,y:8},{x:45,y:20},{x:65,y:10},{x:82,y:18},
  {x:92,y:35},{x:78,y:45},{x:60,y:38},{x:40,y:50},{x:20,y:42},
  {x:5,y:55},{x:15,y:68},{x:35,y:72},{x:55,y:65},{x:75,y:70},
  {x:88,y:58},{x:95,y:72},{x:70,y:82},{x:50,y:88},{x:30,y:85},
  {x:10,y:80},{x:22,y:25},{x:38,y:35},{x:58,y:28},{x:72,y:22},
  {x:85,y:50},{x:48,y:75},{x:68,y:55},{x:32,y:58},{x:18,y:48},
]
const EDGES = [
  [0,1],[0,21],[1,21],[1,2],[21,9],[21,22],[2,22],[2,23],[22,8],[22,28],
  [23,3],[23,7],[23,24],[3,24],[3,4],[4,24],[4,5],[4,6],[5,6],[5,25],
  [6,7],[6,25],[6,27],[7,27],[7,8],[7,13],[8,28],[8,9],[9,29],[9,11],
  [29,11],[29,10],[10,11],[11,12],[11,20],[12,28],[12,26],[12,19],
  [19,20],[19,18],[19,26],[18,26],[18,17],[17,26],[17,14],[17,16],
  [14,13],[14,27],[14,15],[15,25],[15,16],[13,26],[13,27],[27,25],[28,29],
]

function AnimatedBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>

      {/* === 1. DEEP SPACE BASE === */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #020510 0%, #050308 25%, #020a08 50%, #05020f 75%, #020510 100%)',
      }} />

      {/* === 2. MASSIVE BREATHING AURORA BLOBS === */}
      <motion.div animate={{ scale:[1,1.3,1,1.15,1], opacity:[0.5,1,0.7,0.9,0.5], x:[0,40,-20,30,0], y:[0,-30,20,-10,0] }}
        transition={{ duration:12, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', top:'-20%', left:'45%', transform:'translateX(-50%)',
          width:'1200px', height:'900px', filter:'blur(80px)',
          background:'radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.32) 0%, rgba(160,110,20,0.12) 40%, transparent 68%)' }} />
      <motion.div animate={{ scale:[1,1.4,1], x:[0,100,0], y:[0,50,0], opacity:[0.3,0.7,0.3] }}
        transition={{ duration:15, repeat:Infinity, ease:'easeInOut', delay:2 }}
        style={{ position:'absolute', top:'0%', left:'-25%', width:'900px', height:'800px', filter:'blur(90px)',
          background:'radial-gradient(ellipse, rgba(0,212,255,0.2) 0%, transparent 65%)' }} />
      <motion.div animate={{ scale:[1,1.25,1], y:[0,-100,0], x:[0,-50,0], opacity:[0.25,0.6,0.25] }}
        transition={{ duration:13, repeat:Infinity, ease:'easeInOut', delay:1 }}
        style={{ position:'absolute', top:'-5%', right:'-20%', width:'850px', height:'750px', filter:'blur(85px)',
          background:'radial-gradient(ellipse, rgba(139,92,246,0.25) 0%, transparent 62%)' }} />
      <motion.div animate={{ scale:[1,1.35,1], x:[0,-60,0], opacity:[0.2,0.5,0.2] }}
        transition={{ duration:17, repeat:Infinity, ease:'easeInOut', delay:5 }}
        style={{ position:'absolute', bottom:'-20%', left:'-10%', width:'700px', height:'600px', filter:'blur(75px)',
          background:'radial-gradient(ellipse, rgba(52,211,153,0.2) 0%, transparent 65%)' }} />
      <motion.div animate={{ scale:[1,1.5,1], opacity:[0.08,0.3,0.08] }}
        transition={{ duration:20, repeat:Infinity, ease:'easeInOut', delay:8 }}
        style={{ position:'absolute', bottom:'-30%', right:'10%', width:'1000px', height:'700px', filter:'blur(100px)',
          background:'radial-gradient(ellipse, rgba(244,114,182,0.12) 0%, transparent 60%)' }} />
      <motion.div animate={{ scale:[1,1.2,1], opacity:[0.12,0.35,0.12], x:[0,30,0] }}
        transition={{ duration:14, repeat:Infinity, ease:'easeInOut', delay:3 }}
        style={{ position:'absolute', bottom:'-5%', left:'30%', width:'800px', height:'500px', filter:'blur(90px)',
          background:'radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 65%)' }} />

      {/* === 3. PULSING RADAR RINGS from center === */}
      {[0,1,2,3,4].map(i => (
        <motion.div key={`ring-${i}`}
          animate={{ scale:[0.3, 3.5], opacity:[0.5, 0] }}
          transition={{ duration:5, repeat:Infinity, ease:'easeOut', delay:i * 1 }}
          style={{
            position:'absolute', top:'28%', left:'50%',
            transform:'translate(-50%,-50%)',
            width:'280px', height:'280px',
            borderRadius:'50%',
            border:`1px solid rgba(59,130,246,${0.6 - i*0.08})`,
            pointerEvents:'none',
          }} />
      ))}

      {/* === 4. SVG NOISE GRAIN === */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }}>
        <filter id='noise'>
          <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
          <feColorMatrix type='saturate' values='0'/>
        </filter>
        <rect width='100%' height='100%' filter='url(#noise)'/>
      </svg>

      {/* === 5. COLOR-CYCLING CONSTELLATION === */}
      <svg width='100%' height='100%' style={{ position:'absolute', inset:0 }}>
        {EDGES.map(([a,b],i) => (
          <motion.line key={i}
            x1={`${NODES[a].x}%`} y1={`${NODES[a].y}%`}
            x2={`${NODES[b].x}%`} y2={`${NODES[b].y}%`}
            strokeWidth='0.6'
            animate={{
              opacity:[0.06, 0.45, 0.06],
              stroke:['rgba(59,130,246,0.4)','rgba(0,212,255,0.4)','rgba(139,92,246,0.4)','rgba(52,211,153,0.4)','rgba(59,130,246,0.4)'],
            }}
            transition={{ duration:4+i%5, repeat:Infinity, delay:i*0.1, ease:'easeInOut' }}
          />
        ))}
        {NODES.map((n,i) => (
          <motion.circle key={i}
            cx={`${n.x}%`} cy={`${n.y}%`}
            fill={i%7===0?'#3B82F6':i%5===0?'#00D4FF':i%4===0?'#4CAF7D':i%3===0?'#3B82F6':'rgba(255,255,255,0.8)'}
            animate={{
              opacity:[0.15,1,0.15],
              r:[i%5===0?2:1.2, i%5===0?4.5:2.8, i%5===0?2:1.2],
            }}
            r={i%5===0?2.5:i%3===0?1.8:1.2}
            transition={{ duration:2+i%5, repeat:Infinity, delay:i*0.18, ease:'easeInOut' }}
            style={{ filter: i%5===0 ? 'drop-shadow(0 0 6px #3B82F6)' : i%7===0 ? 'drop-shadow(0 0 5px #00D4FF)' : 'none' }}
          />
        ))}
      </svg>

      {/* === 6. FLOATING EMBER PARTICLES === */}
      {[...Array(30)].map((_, i) => (
        <motion.div key={`ember-${i}`}
          animate={{
            y: [0, -(120 + (i%6)*70)],
            x: [0, (i%2===0?1:-1) * (15 + (i%5)*18)],
            opacity: [0, 0.9, 0.5, 0],
            scale: [0, 1.2, 0.8, 0],
          }}
          transition={{
            duration: 3 + (i%6),
            repeat: Infinity,
            delay: i * 0.35,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            bottom: `${5 + (i%5)*14}%`,
            left: `${(i * 113.7) % 94 + 3}%`,
            width: i%4===0 ? 4 : i%3===0 ? 3 : 2,
            height: i%4===0 ? 4 : i%3===0 ? 3 : 2,
            borderRadius: '50%',
            background: i%5===0?'#3B82F6':i%5===1?'#00D4FF':i%5===2?'#3B82F6':i%5===3?'#4CAF7D':'#F472B6',
            boxShadow: i%5===0?'0 0 8px #3B82F6':i%5===1?'0 0 8px #00D4FF':i%5===2?'0 0 6px #3B82F6':'0 0 6px #4CAF7D',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* === 7. SHOOTING STARS === */}
      {[
        { top:'12%', delay:0,  dur:1.8, repeatDelay:9  },
        { top:'30%', delay:5,  dur:2.2, repeatDelay:14 },
        { top:'50%', delay:11, dur:1.5, repeatDelay:18 },
        { top:'20%', delay:17, dur:2.0, repeatDelay:12 },
      ].map((s,i) => (
        <motion.div key={`star-${i}`}
          animate={{ x:['-5%','105%'], opacity:[0,1,1,0] }}
          transition={{ duration:s.dur, repeat:Infinity, delay:s.delay, ease:'linear', repeatDelay:s.repeatDelay }}
          style={{
            position:'absolute', top:s.top, left:0,
            width:'180px', height:'2px',
            background:'linear-gradient(90deg, transparent, rgba(59,130,246,0.9), rgba(255,255,255,0.6), transparent)',
            borderRadius:'2px',
            transform:'rotate(-8deg)',
            filter:'drop-shadow(0 0 4px rgba(59,130,246,0.8))',
          }}
        />
      ))}

      {/* === 8. PERSPECTIVE GRID FLOOR === */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%',
        WebkitMaskImage:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
        maskImage:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
        <svg width='100%' height='100%' preserveAspectRatio='none'
          style={{ transform:'perspective(400px) rotateX(60deg)', transformOrigin:'bottom', opacity:0.22 }}>
          <defs>
            <linearGradient id='gfade' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='#3B82F6' stopOpacity='1'/>
              <stop offset='100%' stopColor='#3B82F6' stopOpacity='0'/>
            </linearGradient>
          </defs>
          {Array.from({length:16},(_,i)=>(
            <line key={`h${i}`} x1='0' y1={`${(i/15)*100}%`} x2='100%' y2={`${(i/15)*100}%`}
              stroke='url(#gfade)' strokeWidth='1'/>
          ))}
          {Array.from({length:26},(_,i)=>(
            <line key={`v${i}`} x1={`${(i/25)*100}%`} y1='0' x2={`${(i/25)*100}%`} y2='100%'
              stroke='url(#gfade)' strokeWidth='0.7'/>
          ))}
        </svg>
      </div>

      {/* === 9. ANIMATED CHART LINE WITH GLOW === */}
      <svg width='100%' height='40%' viewBox='0 0 1400 300' preserveAspectRatio='none'
        style={{ position:'absolute', bottom:'8%', left:0, opacity:0.35 }}>
        <defs>
          <linearGradient id='cl' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor='#4CAF7D' stopOpacity='0'/>
            <stop offset='30%' stopColor='#4CAF7D' stopOpacity='0.8'/>
            <stop offset='70%' stopColor='#3B82F6' stopOpacity='1'/>
            <stop offset='100%' stopColor='#F0D080' stopOpacity='1'/>
          </linearGradient>
          <linearGradient id='cf' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#3B82F6' stopOpacity='0.25'/>
            <stop offset='100%' stopColor='#3B82F6' stopOpacity='0'/>
          </linearGradient>
          <filter id='cgl'><feGaussianBlur stdDeviation='4' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
        </defs>
        <motion.path
          d='M0,300 L0,260 L80,250 L180,230 L280,210 L380,185 L480,160 L570,135 L660,105 L760,80 L860,55 L960,35 L1060,20 L1160,10 L1280,5 L1400,0 L1400,300 Z'
          fill='url(#cf)'
          initial={{opacity:0}} animate={{opacity:1}} transition={{duration:2.5,delay:0.5}}/>
        <motion.polyline
          points='0,260 80,250 180,230 280,210 380,185 480,160 570,135 660,105 760,80 860,55 960,35 1060,20 1160,10 1280,5 1400,0'
          fill='none' stroke='url(#cl)' strokeWidth='3' strokeLinecap='round' filter='url(#cgl)'
          initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
          transition={{duration:3.5,ease:'easeOut',delay:0.2}}/>
        <motion.polyline
          points='0,260 80,250 180,230 280,210 380,185 480,160 570,135 660,105 760,80 860,55 960,35 1060,20 1160,10 1280,5 1400,0'
          fill='none' strokeWidth='2.5' strokeLinecap='round' filter='url(#cgl)'
          animate={{ stroke:['#3B82F6','#00D4FF','#3B82F6','#4CAF7D','#F472B6','#F0D080','#3B82F6'], opacity:[0.8,1,0.8] }}
          transition={{ duration:6, repeat:Infinity, ease:'easeInOut', delay:3.5 }}/>
        <motion.circle cx='1400' cy='0' r='7' fill='#F0D080' filter='url(#cgl)'
          initial={{opacity:0,scale:0}} animate={{opacity:[0,1,0.6,1],scale:[0,2.5,1,2]}}
          transition={{duration:4,delay:3.8,repeat:Infinity}}/>
      </svg>

      {/* === 10. LIGHT SHAFTS === */}
      {[
        {left:'15%',rot:'22deg', op:0.08, dur:7},
        {left:'38%',rot:'-8deg', op:0.06, dur:9},
        {left:'60%',rot:'6deg',  op:0.07, dur:11},
        {left:'78%',rot:'-18deg',op:0.05, dur:8},
        {left:'92%',rot:'14deg', op:0.04, dur:10},
      ].map((b,i)=>(
        <motion.div key={`shaft-${i}`}
          animate={{opacity:[b.op, b.op*4, b.op]}}
          transition={{duration:b.dur, repeat:Infinity, ease:'easeInOut', delay:i*1.6}}
          style={{
            position:'absolute', top:'-40%', left:b.left,
            width:'2px', height:'180%',
            background:`linear-gradient(to bottom,transparent,rgba(59,130,246,${b.op*10}),rgba(59,130,246,${b.op*5}),transparent)`,
            transform:`rotate(${b.rot})`,
          }}/>
      ))}

      {/* === 11. SCANLINE OVERLAY === */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)',
        pointerEvents:'none',
      }}/>

      {/* === 12. EDGE VIGNETTE === */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 50% 35%, transparent 25%, rgba(0,0,0,0.9) 100%)',
      }}/>
    </div>
  )
}

/* ── Live-looking dashboard mockup ───────────────────────────── */
function MockupDashboard() {
  const trades = [
    { symbol: 'ES', dir: 'Long', pnl: '+$840', result: 'Win', time: '09:32' },
    { symbol: 'NQ', dir: 'Short', pnl: '-$210', result: 'Loss', time: '10:15' },
    { symbol: 'MES', dir: 'Long', pnl: '+$1,240', result: 'Win', time: '11:04' },
    { symbol: 'ES', dir: 'Long', pnl: '+$560', result: 'Win', time: '13:22' },
  ]
  const bars = [38, 52, 44, 68, 62, 78, 72, 88, 82, 94, 86, 100]

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative', maxWidth: '920px', margin: '0 auto',
      }}
    >
      {/* Outer glow */}
      <div style={{
        position: 'absolute', inset: -2,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(76,175,125,0.2), rgba(59,130,246,0.1))',
        borderRadius: '16px', filter: 'blur(8px)', zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'linear-gradient(160deg, #242424 0%, #1E1E1E 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59,130,246,0.25)',
        overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Browser bar */}
        <div style={{
          background: '#2A2A2A', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          borderBottom: '1px solid #333',
        }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#E05252' }}/>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#3B82F6' }}/>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#4CAF7D' }}/>
          <div style={{
            flex: 1, background: '#1A1A1A', borderRadius: 6,
            padding: '4px 12px', marginLeft: 8,
            fontSize: '11px', color: '#555', fontFamily: 'JetBrains Mono, monospace',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ShieldCheck size={10} color="#4CAF7D" />
            covenant-trader.vercel.app/app
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF7D', boxShadow: '0 0 6px #4CAF7D' }} />
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Net P&L', value: '+$4,820', color: '#4CAF7D', up: true },
              { label: 'Win Rate', value: '68.4%', color: '#3B82F6', up: true },
              { label: 'Profit Factor', value: '2.31', color: '#3B82F6', up: true },
              { label: 'Avg RR', value: '1:2.8', color: '#3B82F6', up: true },
            ].map((k, i) => (
              <motion.div key={k.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                style={{
                  background: '#1A1A1A', border: '1px solid #2E2E2E',
                  borderLeft: `3px solid ${k.color}`,
                  borderRadius: 8, padding: '10px 12px',
                }}
              >
                <div style={{ color: '#555', fontSize: '10px', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</div>
                <div style={{ color: k.color, fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700 }}>{k.value}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            {/* Equity curve */}
            <div style={{ background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: 8, padding: '12px' }}>
              <div style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Equity Curve</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '70px' }}>
                {bars.map((h, i) => (
                  <motion.div key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
                    style={{
                      flex: 1,
                      background: i === bars.length - 1
                        ? '#3B82F6'
                        : `rgba(59,130,246,${0.15 + (h / 100) * 0.4})`,
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                ))}
              </div>
              {/* Trend line overlay */}
              <svg width="100%" height="30" style={{ marginTop: -30, opacity: 0.7 }}>
                <polyline
                  points="0,28 8,24 17,26 25,18 33,20 42,14 50,16 58,8 67,10 75,4 83,6 92,2 100,0"
                  fill="none" stroke="#4CAF7D" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ width: '100%' }}
                />
              </svg>
            </div>

            {/* Recent trades */}
            <div style={{ background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: 8, padding: '12px' }}>
              <div style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent Trades</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {trades.map((t, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '4px 6px', borderRadius: 4,
                      background: t.result === 'Win' ? 'rgba(76,175,125,0.06)' : 'rgba(224,82,82,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {t.result === 'Win'
                        ? <TrendingUp size={10} color="#4CAF7D" />
                        : <TrendingDown size={10} color="#E05252" />}
                      <span style={{ color: '#F5F5F5', fontSize: '11px', fontWeight: 600 }}>{t.symbol}</span>
                      <span style={{ color: '#555', fontSize: '9px' }}>{t.dir}</span>
                    </div>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700,
                      color: t.result === 'Win' ? '#4CAF7D' : '#E05252',
                    }}>{t.pnl}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Scripture bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            style={{
              background: 'linear-gradient(90deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04))',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 6, padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: '14px' }}>✝</span>
            <span style={{ color: '#3B82F6', fontSize: '11px', fontStyle: 'italic', opacity: 0.9 }}>
              "The plans of the diligent lead to profit..." — Proverbs 21:5
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Floating stat badges ─────────────────────────────────────── */
function FloatingBadge({ children, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      style={{
        position: 'absolute',
        background: 'rgba(26,26,26,0.9)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: 10, padding: '10px 16px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 10,
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

/* ── Main HeroSection ─────────────────────────────────────────── */
export default function HeroSection() {
  const navigate = useNavigate()

  return (
    <section style={{ background: '#020510', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '80px', position: 'relative', overflow: 'hidden' }}>
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-6 py-20 w-full" style={{ position: 'relative', zIndex: 1 }}>


        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          <h1 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            lineHeight: 1.05, letterSpacing: '-0.02em',
          }}>
            <span style={{ color: '#FFFFFF' }}>Trade with Discipline.</span><br />
            <span style={{
              background: 'linear-gradient(90deg, #3B82F6, #F0D080, #3B82F6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Trade with Faith.</span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            color: '#888', fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            maxWidth: '600px', margin: '0 auto 40px',
            lineHeight: 1.7, textAlign: 'center',
          }}
        >
          The only trading journal that combines elite performance analytics with daily scripture, prayer, and faith-based discipline tracking.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}
        >
          <button
            onClick={() => navigate('/signup')}
            className="btn-gold"
            style={{
              padding: '14px 32px', borderRadius: 12, fontSize: '1rem', fontWeight: 700,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 30px rgba(59,130,246,0.3)',
            }}
          >
            Start Free Today <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '14px 32px', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
              background: 'transparent', border: '1px solid #3A3A3A',
              color: '#A0A0A0', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#3B82F6' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = '#A0A0A0' }}
          >
            Sign In
          </button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 20 }}
        >
          <div style={{ display: 'flex' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2px solid #111',
                background: `hsl(${i * 60 + 20}, 45%, 35%)`,
                marginLeft: i === 1 ? 0 : -8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#F5F5F5', fontWeight: 700,
              }}>
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <div>
            <div style={{ color: '#3B82F6', fontSize: '12px', lineHeight: 1 }}>★★★★★</div>
            <div style={{ color: '#555', fontSize: '12px', marginTop: 2 }}>Trusted by 2,000+ traders</div>
          </div>
        </motion.div>

        {/* 80% stat banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 44 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 40, padding: '8px 20px',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: '1rem' }}>✝</span>
            <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontWeight: 700 }}>
              <span style={{ color: '#3B82F6' }}>80%</span> of Covenant Traders become profitable within{' '}
              <span style={{ color: '#3B82F6' }}>90 days</span>
            </span>
          </div>
        </motion.div>

        {/* Dashboard mockup with floating badges */}
        <div style={{ position: 'relative' }}>
          <FloatingBadge delay={1.1} style={{ top: -20, left: '2%' }}>
            <div style={{ color: '#4CAF7D', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '14px' }}>+$4,820</div>
            <div style={{ color: '#555', fontSize: '10px', marginTop: 2 }}>Today's P&L</div>
          </FloatingBadge>

          <FloatingBadge delay={1.2} style={{ top: 60, right: '2%' }}>
            <div style={{ color: '#3B82F6', fontSize: '11px', fontWeight: 600 }}>✝ Daily Verse</div>
            <div style={{ color: '#666', fontSize: '10px', marginTop: 2, maxWidth: 140, lineHeight: 1.4 }}>
              "Commit your work to the LORD..." — Prov 16:3
            </div>
          </FloatingBadge>

          <FloatingBadge delay={1.3} style={{ bottom: 40, left: '0%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF7D', boxShadow: '0 0 8px #4CAF7D' }} />
              <span style={{ color: '#F5F5F5', fontSize: '11px', fontWeight: 600 }}>Win Rate: 68.4%</span>
            </div>
            <div style={{ color: '#555', fontSize: '10px', marginTop: 2 }}>↑ 4.2% this month</div>
          </FloatingBadge>

          <MockupDashboard />
        </div>
      </div>
    </section>
  )
}
