import { useState, useMemo, useRef, useEffect } from 'react'
import { CheckCircle, Loader2, Star, ImagePlus, X, Plus, Upload } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { compressImage } from '../../lib/imageUtils'
import { getCustomQuestions } from '../../lib/customQuestions'
import { toTimeInput, extractCsvData, buildAutoMapping, tradesFromMapping, parseTradeCSV } from '../../lib/csvImport'
import TradeChartAnnotator from '../../components/app/TradeChartAnnotator'
import TradeProjectionView from '../../components/app/TradeProjectionView'
import { useAuth } from '../../contexts/AuthContext'
import { mapFillsToTrades } from '../../lib/tradovateApi'

/* ── CSV parser ───────────────────────────────────────────── */
const emotions = ['Confident', 'Greedy', 'Fearful', 'Excited', 'FOMO']
const postEmotions = ['Happy', 'Sad', 'Mad', 'Disappointed', 'Neutral']

const EMOTION_VERSES = {
  Greedy: [
    { text: 'No one can serve two masters… You cannot serve both God and money.', ref: 'Matthew 6:24' },
    { text: 'Watch out! Be on your guard against all kinds of greed; life does not consist in an abundance of possessions.', ref: 'Luke 12:15' },
    { text: 'A greedy man stirs up strife, but the one who trusts in the Lord will be enriched.', ref: 'Proverbs 28:25' },
    { text: 'Whoever loves money never has enough; whoever loves wealth is never satisfied with their income.', ref: 'Ecclesiastes 5:10' },
    { text: 'Dishonest money dwindles away, but whoever gathers money little by little makes it grow.', ref: 'Proverbs 13:11' },
    { text: 'Better a patient person than a warrior, one with self-control than one who takes a city.', ref: 'Proverbs 16:32' },
    { text: 'Do not wear yourself out to get rich; do not trust your own cleverness.', ref: 'Proverbs 23:4' },
    { text: 'The greedy bring ruin to their households, but the one who hates bribes will live.', ref: 'Proverbs 15:27' },
    { text: 'What good is it for someone to gain the whole world, yet forfeit their soul?', ref: 'Mark 8:36' },
    { text: 'People who want to get rich fall into temptation and a trap…', ref: '1 Timothy 6:9' },
    { text: 'A faithful person will be richly blessed, but one eager to get rich will not go unpunished.', ref: 'Proverbs 28:20' },
    { text: 'Lazy hands make for poverty, but diligent hands bring wealth.', ref: 'Proverbs 10:4' },
    { text: 'Better a little with the fear of the Lord than great wealth with turmoil.', ref: 'Proverbs 15:16' },
    { text: 'The blessing of the Lord brings wealth, without painful toil for it.', ref: 'Proverbs 10:22' },
    { text: 'Commit to the Lord whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
    { text: 'There is a way that appears to be right, but in the end it leads to death.', ref: 'Proverbs 14:12' },
    { text: 'Be still before the Lord and wait patiently for him…', ref: 'Psalm 37:7' },
    { text: 'Cast all your anxiety on him because he cares for you.', ref: '1 Peter 5:7' },
    { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
    { text: 'For where your treasure is, there your heart will be also.', ref: 'Matthew 6:21' },
  ],
  Fearful: [
    { text: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.', ref: '2 Timothy 1:7' },
    { text: 'Fear not, for I am with you; be not dismayed, for I am your God.', ref: 'Isaiah 41:10' },
    { text: 'When I am afraid, I put my trust in you.', ref: 'Psalm 56:3' },
    { text: 'Cast all your anxiety on him because he cares for you.', ref: '1 Peter 5:7' },
    { text: 'Be strong and courageous. Do not be afraid; do not be discouraged…', ref: 'Joshua 1:9' },
    { text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me…', ref: 'Psalm 23:4' },
    { text: 'Peace I leave with you; my peace I give you… Do not let your hearts be troubled and do not be afraid.', ref: 'John 14:27' },
    { text: 'The Lord is my light and my salvation—whom shall I fear?', ref: 'Psalm 27:1' },
    { text: 'Do not fear, only believe.', ref: 'Mark 5:36' },
    { text: 'The righteous are as bold as a lion.', ref: 'Proverbs 28:1' },
    { text: "So we say with confidence, 'The Lord is my helper; I will not be afraid.'", ref: 'Hebrews 13:6' },
    { text: 'You will keep in perfect peace those whose minds are steadfast, because they trust in you.', ref: 'Isaiah 26:3' },
    { text: 'Be anxious for nothing, but in everything by prayer and supplication… let your requests be made known to God.', ref: 'Philippians 4:6' },
    { text: 'The Lord is with me; I will not be afraid. What can mere mortals do to me?', ref: 'Psalm 118:6' },
    { text: 'I sought the Lord, and he answered me; he delivered me from all my fears.', ref: 'Psalm 34:4' },
  ],
  Excited: [
    { text: 'This is the day the Lord has made; let us rejoice and be glad in it.', ref: 'Psalm 118:24' },
    { text: 'Rejoice in the Lord always. I will say it again: Rejoice!', ref: 'Philippians 4:4' },
    { text: 'May the God of hope fill you with all joy and peace as you trust in him…', ref: 'Romans 15:13' },
    { text: 'Shout for joy to the Lord, all the earth.', ref: 'Psalm 100:1' },
    { text: 'The joy of the Lord is your strength.', ref: 'Nehemiah 8:10' },
    { text: 'Delight yourself in the Lord, and he will give you the desires of your heart.', ref: 'Psalm 37:4' },
    { text: 'Serve the Lord with gladness; come before his presence with singing.', ref: 'Psalm 100:2' },
    { text: 'You make known to me the path of life; in your presence there is fullness of joy.', ref: 'Psalm 16:11' },
    { text: 'Let all that I am praise the Lord; with my whole heart, I will praise his holy name.', ref: 'Psalm 103:1' },
    { text: 'Be glad in the Lord and rejoice, you righteous…', ref: 'Psalm 32:11' },
    { text: 'A joyful heart is good medicine…', ref: 'Proverbs 17:22' },
    { text: 'Those who look to him are radiant…', ref: 'Psalm 34:5' },
    { text: 'Sing to the Lord a new song; sing to the Lord, all the earth.', ref: 'Psalm 96:1' },
    { text: 'Now to him who is able to do immeasurably more than all we ask or imagine…', ref: 'Ephesians 3:20' },
  ],
  Confident: [
    { text: 'The righteous are as bold as a lion.', ref: 'Proverbs 28:1' },
    { text: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.', ref: '2 Timothy 1:7' },
    { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
    { text: 'Be strong and courageous. Do not be afraid…', ref: 'Joshua 1:9' },
    { text: 'The Lord is my light and my salvation—whom shall I fear?', ref: 'Psalm 27:1' },
    { text: "So we say with confidence, 'The Lord is my helper; I will not be afraid.'", ref: 'Hebrews 13:6' },
    { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
    { text: 'Commit your work to the Lord, and your plans will be established.', ref: 'Proverbs 16:3' },
    { text: 'Being confident of this, that he who began a good work in you will carry it on to completion…', ref: 'Philippians 1:6' },
    { text: 'In their hearts humans plan their course, but the Lord establishes their steps.', ref: 'Proverbs 16:9' },
    { text: "Let us then approach God's throne of grace with confidence…", ref: 'Hebrews 4:16' },
    { text: 'The fear of man lays a snare, but whoever trusts in the Lord is safe.', ref: 'Proverbs 29:25' },
    { text: 'Those who trust in the Lord are like Mount Zion, which cannot be shaken…', ref: 'Psalm 125:1' },
    { text: 'And we know that in all things God works for the good of those who love him…', ref: 'Romans 8:28' },
    { text: 'You will succeed in whatever you choose to do…', ref: 'Job 22:28' },
  ],
  FOMO: [
    { text: 'For what will it profit a man if he gains the whole world and forfeits his soul?', ref: 'Mark 8:36' },
    { text: 'Be still before the Lord and wait patiently for him; do not fret when people succeed in their ways.', ref: 'Psalm 37:7' },
    { text: 'A faithful man will abound with blessings, but whoever hastens to be rich will not go unpunished.', ref: 'Proverbs 28:20' },
    { text: 'The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty.', ref: 'Proverbs 21:5' },
    { text: 'Better a little with righteousness than much gain with injustice.', ref: 'Proverbs 16:8' },
    { text: 'Whoever is patient has great understanding, but one who is quick-tempered displays folly.', ref: 'Proverbs 14:29' },
    { text: 'Be anxious for nothing, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.', ref: 'Philippians 4:6' },
    { text: 'Keep your life free from love of money, and be content with what you have.', ref: 'Hebrews 13:5' },
    { text: 'The greedy stir up conflict, but those who trust in the Lord will prosper.', ref: 'Proverbs 28:25' },
    { text: 'There is a time for everything, and a season for every activity under the heavens.', ref: 'Ecclesiastes 3:1' },
    { text: 'Whoever trusts in his riches will fall, but the righteous will thrive like a green leaf.', ref: 'Proverbs 11:28' },
    { text: 'Do not wear yourself out to get rich; do not trust your own cleverness.', ref: 'Proverbs 23:4' },
    { text: 'The Lord will fight for you; you need only to be still.', ref: 'Exodus 14:14' },
    { text: 'Commit to the Lord whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
    { text: 'Better one handful with tranquility than two handfuls with toil and chasing after the wind.', ref: 'Ecclesiastes 4:6' },
  ],
}

function getEmotionVerse(emotion) {
  const list = EMOTION_VERSES[emotion]
  if (!list) return null
  return list[Math.floor(Math.random() * list.length)]
}

const EMPTY_ARR = []

export default function LogTrade() {
  const { addTrade, getVerse, updateSettings, settings } = useTradeStore()
  const customConfluences = useTradeStore(s => s.settings?.customConfluences ?? EMPTY_ARR)
  const customSetupTypes  = useTradeStore(s => s.settings?.customSetupTypes  ?? EMPTY_ARR)
  const playbook          = useTradeStore(s => s.playbook ?? EMPTY_ARR)
  const allTrades         = useTradeStore(s => s.trades   ?? EMPTY_ARR)
  const navigate = useNavigate()
  const location = useLocation()
  const isBacktest = !!location.state?.backtest
  const { isAdmin } = useAuth()

  // ALL hooks must come before any conditional return (React Rules of Hooks)
  const [loading, setLoading] = useState(false)
  const [faithRating, setFaithRating] = useState(0)
  const [entryQuality, setEntryQuality] = useState(5)
  const [exitQuality, setExitQuality] = useState(5)
  const [preTrade, setPreTrade] = useState('')
  const [postTrade, setPostTrade] = useState('')

  // Execution Quality — new fields
  const [waitedConfirmation, setWaitedConfirmation] = useState('')
  const [enteredAtLevel,     setEnteredAtLevel]     = useState('')
  const [exitDecision,       setExitDecision]       = useState('')
  const [rushedEntry,        setRushedEntry]        = useState('')
  const [protectedStop,      setProtectedStop]      = useState('')
  const [targetedLiquidity, setTargetedLiquidity] = useState('')

  // Psychology — new fields
  const [sleepQuality,    setSleepQuality]    = useState('')
  const [focusLevel,      setFocusLevel]      = useState('')
  const [revengeTrade,    setRevengeTrade]    = useState('')
  const [stressLevel,     setStressLevel]     = useState('')
  const [energyLevel,     setEnergyLevel]     = useState('')
  const [movedStopFear,   setMovedStopFear]   = useState('')

  const [sessionTab, setSessionTab] = useState('session')

  // Market Context
  const [tradingSession,   setTradingSession]   = useState('')
  const [htfBias,          setHtfBias]          = useState('')
  const [marketStructure,  setMarketStructure]  = useState('')
  const [setupType,        setSetupType]        = useState('')
  const [newsEvent,        setNewsEvent]        = useState('')
  const [confluences,      setConfluences]      = useState([])
  const [newConfluence,    setNewConfluence]    = useState('')
  const [newSetupType,     setNewSetupType]     = useState('')

  // Post-Trade Review
  const [wentWell,      setWentWell]      = useState('')
  const [toImprove,     setToImprove]     = useState('')
  const [takeAgain,     setTakeAgain]     = useState('')
  const [verseOverlay, setVerseOverlay] = useState(null)
  // Answers to the trader's own questions, keyed by question id
  const [customAnswers, setCustomAnswers] = useState({})
  const psychQuestions = getCustomQuestions(settings, 'psychology')
  const execQuestions  = getCustomQuestions(settings, 'execution')
  const setCustomAnswer = (id, v) => setCustomAnswers(prev => ({ ...prev, [id]: v }))

  const [chartImage, setChartImage] = useState(null)
  const [chartMarkers, setChartMarkers] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [manualNetPnl, setManualNetPnl] = useState('')
  const [manualResult, setManualResult] = useState(null) // null = not overridden
  const [detectedRR,    setDetectedRR]   = useState(null)
  const [analyzing,     setAnalyzing]    = useState(false)
  const fileInputRef = useRef(null)

  // CSV import state
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvStep,       setCsvStep]       = useState('upload') // 'upload' | 'map' | 'preview'
  // Imported rows waiting to be journaled one at a time
  const [csvQueue,      setCsvQueue]      = useState([])   // trades still to journal after the current one
  const [csvQueueTotal, setCsvQueueTotal] = useState(0)
  const [csvRawData,    setCsvRawData]    = useState(null)     // { rawHeaders, normHeaders, rawRows }
  const [csvMapping,    setCsvMapping]    = useState({})
  const [csvParsed,     setCsvParsed]     = useState([])
  const [csvError,      setCsvError]      = useState(null)
  const [csvImporting,  setCsvImporting]  = useState(false)
  const [csvDragOver,   setCsvDragOver]   = useState(false)
  const csvFileRef = useRef(null)

  // Backtest mode (arrived from the Backtesting page) — auto-open the CSV importer
  useEffect(() => { if (isBacktest) setShowCsvImport(true) }, [isBacktest])

  // Form fields — plain state, no react-hook-form
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0])
  const [entryTime,     setEntryTime]     = useState('')
  const [exitTime,      setExitTime]      = useState('')
  const [symbol,        setSymbol]        = useState('MNQ')
  const [direction,     setDirection]     = useState('Long')
  const [timeframe,     setTimeframe]     = useState('Day Trade')
  const [assetClass,    setAssetClass]    = useState('Futures')
  const [entryPrice,    setEntryPrice]    = useState('')
  const [exitPrice,     setExitPrice]     = useState('')
  const [stopLoss,      setStopLoss]      = useState('')
  const [takeProfit,    setTakeProfit]    = useState('')
  const [commission,    setCommission]    = useState('')
  const [positionSize,  setPositionSize]  = useState('')
  const [accountsTraded,setAccountsTraded]= useState('')
  const [followedPlan,  setFollowedPlan]  = useState('')
  const [movedStop,     setMovedStop]     = useState('')
  const [overRisked,    setOverRisked]    = useState('')
  const [mindsetNotes,  setMindsetNotes]  = useState('')
  const [strategyName,  setStrategyName]  = useState('')
  const [tradeNotes,    setTradeNotes]    = useState('')
  const [scripture,     setScripture]     = useState('')
  const [prayer,        setPrayer]        = useState('')
  const [gratitude,     setGratitude]     = useState('')

  const getFieldValue = (name) => {
    const map = { followedPlan, movedStop, overRisked, direction, timeframe, takeProfit, stopLoss, entryPrice, exitPrice, positionSize }
    return map[name] ?? ''
  }
  const setFieldValue = (name, val) => {
    const map = { followedPlan: setFollowedPlan, movedStop: setMovedStop, overRisked: setOverRisked, direction: setDirection, timeframe: setTimeframe, takeProfit: setTakeProfit, stopLoss: setStopLoss, entryPrice: setEntryPrice, exitPrice: setExitPrice, positionSize: setPositionSize }
    map[name]?.(val)
  }

  // Micro futures: $2 per point per contract
  const DOLLARS_PER_POINT = 2
  const calcs = useMemo(() => {
    const e = parseFloat(entryPrice) || 0
    const x = parseFloat(exitPrice) || 0
    const s = parseFloat(positionSize) || 0
    const c = parseFloat(commission) || 0
    const a = Math.max(1, parseFloat(accountsTraded) || 1)
    const points = direction === 'Long' ? (x - e) : (e - x)
    const gross = points * s * DOLLARS_PER_POINT * a
    const net = gross - (c * a)
    const riskCapital = s * DOLLARS_PER_POINT * e * a
    const pct = riskCapital > 0 ? ((net / riskCapital) * 100).toFixed(2) : '0.00'
    return { gross: gross.toFixed(2), net: net.toFixed(2), pct, points: points.toFixed(2), result: net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Breakeven' }
  }, [entryPrice, exitPrice, positionSize, direction, commission, accountsTraded])

  async function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast.error('Please upload an image file.'); return }
    try {
      const compressed = await compressImage(file)
      setChartImage(compressed)
      setChartMarkers([])
      // Auto-analyze is admin-only — it calls the vision API and bills per image
      if (isAdmin) analyzeChart(compressed)
    } catch { toast.error('Failed to upload image. Try a smaller file.') }
  }

  async function analyzeChart(image) {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })
      if (res.ok) {
        const { prices } = await res.json()
        if (!prices) return
        let filled = []
        if (prices.entry       != null) { setEntryPrice(String(prices.entry));        filled.push(`Entry $${prices.entry}`) }
        if (prices.stopLoss    != null) { setStopLoss(String(prices.stopLoss));        filled.push(`Stop $${prices.stopLoss}`) }
        if (prices.takeProfit1 != null) { setTakeProfit(String(prices.takeProfit1)); setExitPrice(String(prices.takeProfit1)); filled.push(`TP1 $${prices.takeProfit1}`) }
        if (prices.takeProfit2 != null) filled.push(`TP2 $${prices.takeProfit2}`)
        if (filled.length > 0) {
          toast.success(`✅ Auto-filled: ${filled.join(' · ')}`)
        } else {
          toast.error('Could not detect price levels, please enter manually.')
        }
      } else {
        const { error } = await res.json().catch(() => ({}))
        if (res.status !== 503) toast.error(error || 'Could not detect price levels, please enter manually.')
      }
      // 503 = no API key — stay silent, user fills manually
    } catch { /* network error — silent */ }
    finally { setAnalyzing(false) }
  }

  const onSubmit = async () => {
    const data = {
      date, entryTime, exitTime, symbol, direction, timeframe, assetClass,
      entryPrice, exitPrice, stopLoss, takeProfit,
      commission, positionSize, accountsTraded,
      followedPlan, movedStop, overRisked,
      mindsetNotes, strategyName, tradeNotes,
      scripture, prayer, gratitude,
    }
    if (!validateBeforeSubmit(data)) return
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 600))
      const hasPrices   = data.entryPrice && data.exitPrice && data.positionSize
      // When using manual P&L (no prices), multiply by accounts so 2 accounts × $80 = $160
      const accts = Math.max(1, parseFloat(data.accountsTraded) || 1)
      const manualTotal = ((parseFloat(manualNetPnl) || 0) * accts).toFixed(2)
      const finalNetPnl = hasPrices ? calcs.net   : manualTotal
      const finalGross  = hasPrices ? calcs.gross : manualTotal
      const finalResult = hasPrices ? calcs.result : (manualResult || 'Win')
      const finalPct    = hasPrices ? calcs.pct   : '0.00'
      addTrade({
        ...data,
        grossPnl: finalGross,
        netPnl:   finalNetPnl,
        pctPnl:   finalPct,
        result:   finalResult,
        preTrade,
        postTrade,
        entryQuality,
        exitQuality,
        faithRating,
        // Execution quality extras
        waitedConfirmation,
        enteredAtLevel,
        exitDecision,
        rushedEntry,
        protectedStop,
        targetedLiquidity,
        // Psychology extras
        sleepQuality,
        focusLevel,
        revengeTrade,
        stressLevel,
        energyLevel,
        movedStopFear,
        // Market Context
        tradingSession,
        htfBias,
        marketStructure,
        setupType,
        newsEvent,
        confluences,
        // Post-Trade Review
        wentWell,
        toImprove,
        takeAgain,
        chartImage:    chartImage   || null,
        chartMarkers:  chartMarkers || [],
        riskReward:    detectedRR   || null,
        customAnswers,
      })
      // More imported trades waiting? Load the next one and stay on the form.
      if (csvQueue.length) {
        const [next, ...rest] = csvQueue
        resetFormForNext()
        loadTradeIntoForm(next, rest, csvQueueTotal)
        const done = csvQueueTotal - rest.length
        toast.success(`Saved. Now journaling ${done} of ${csvQueueTotal}.`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const emotionVerse = getEmotionVerse(preTrade)
      const v = emotionVerse || getVerse()
      setVerseOverlay({ verse: v, emotion: preTrade, result: finalResult, netPnl: finalNetPnl })
    } catch (err) {
      console.error('Log trade error:', err)
      toast.error('Failed to log trade. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function resetCsvState() {
    setCsvStep('upload'); setCsvRawData(null); setCsvMapping({})
    setCsvParsed([]); setCsvError(null)
  }

  function handleCsvFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setCsvError('Please upload a .csv file'); return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const data = extractCsvData(e.target.result)
      if (!data || !data.rawHeaders.length) {
        setCsvError('Could not read CSV — is the file empty?'); return
      }
      const mapping = buildAutoMapping(data.normHeaders)
      setCsvRawData(data)
      setCsvMapping(mapping)
      setCsvStep('map')
      setCsvError(null)
    }
    reader.readAsText(file)
  }

  function applyMapping() {
    if (!csvRawData) return
    const { trades, error } = tradesFromMapping(csvRawData.rawRows, csvMapping)
    if (error || !trades.length) {
      setCsvError(error || 'No trades found. Try adjusting the column mapping.')
      return
    }
    setCsvParsed(trades)
    setCsvError(null)
    setCsvStep('preview')
  }

  function handleCsvImport() {
    if (!csvParsed.length) return
    setCsvImporting(true)
    csvParsed.forEach(t => addTrade(isBacktest ? { ...t, tags: [...(t.tags || []), 'Backtest'] } : t))
    toast.success(`✅ ${csvParsed.length} ${isBacktest ? 'backtest ' : ''}trade${csvParsed.length !== 1 ? 's' : ''} imported!`)
    setCsvParsed([]); setShowCsvImport(false); setCsvImporting(false)
    navigate('/app/history')
  }

  // Load a single imported trade into the form so the user can finish journaling + save it
  /* Clear everything subjective before loading the next queued CSV trade —
     the trade's own fields get overwritten by loadTradeIntoForm, but notes,
     ratings and review answers must not carry over from the previous one. */
  function resetFormForNext() {
    setManualNetPnl(''); setManualResult(null); setDetectedRR(null)
    setChartImage(null); setChartMarkers([])
    setStopLoss(''); setTakeProfit(''); setAccountsTraded('')
    setFollowedPlan(''); setMovedStop(''); setOverRisked('')
    setMindsetNotes(''); setStrategyName(''); setTradeNotes('')
    setScripture(''); setPrayer(''); setGratitude('')
    setPreTrade(''); setPostTrade('')
    setEntryQuality(5); setExitQuality(5); setFaithRating(0)
    setWaitedConfirmation(''); setEnteredAtLevel(''); setExitDecision('')
    setRushedEntry(''); setProtectedStop('')
    setSleepQuality(''); setFocusLevel(''); setRevengeTrade('')
    setStressLevel(''); setEnergyLevel(''); setMovedStopFear('')
    setTradingSession(''); setHtfBias(''); setMarketStructure('')
    setSetupType(''); setNewsEvent(''); setConfluences([])
    setWentWell(''); setToImprove(''); setTakeAgain('')
    setCustomAnswers({})
  }

  function loadTradeIntoForm(t, rest = null, total = null) {
    if (!t) return
    if (rest !== null) { setCsvQueue(rest); setCsvQueueTotal(total ?? rest.length + 1) }
    setDate(t.date || new Date().toISOString().split('T')[0])
    // Times may be ISO (imported) or already "HH:MM" (manually logged) — the input needs HH:MM
    setEntryTime(toTimeInput(t.entryTime))
    setExitTime(toTimeInput(t.exitTime))
    setSymbol(t.symbol || '')
    setDirection(t.direction || 'Long')
    setTimeframe(t.timeframe || 'Day Trade')
    setEntryPrice(t.entryPrice || '')
    setExitPrice(t.exitPrice || '')
    setPositionSize(t.positionSize || '')
    setCommission(t.commission || '')
    setTradeNotes(t.tradeNotes && t.tradeNotes !== 'Imported from CSV' && t.tradeNotes !== 'Imported from Tradovate' ? t.tradeNotes : '')
    // If the CSV already carries a P&L but no entry/exit prices, lock it in manually
    if (t.netPnl != null && (!t.entryPrice || !t.exitPrice)) {
      setManualNetPnl(String(t.netPnl))
      setManualResult(t.result || (parseFloat(t.netPnl) > 0 ? 'Win' : parseFloat(t.netPnl) < 0 ? 'Loss' : 'Breakeven'))
    }
    setShowCsvImport(false)
    resetCsvState()
    toast.success('Trade loaded — add your journaling below, then hit Save.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateBeforeSubmit(data) {
    if (!data.date) { toast.error('Date required'); return false }
    if (!data.symbol?.trim()) { toast.error('Symbol required'); return false }
    const hasPrices = data.entryPrice && data.exitPrice && data.positionSize
    if (!hasPrices && !manualResult) {
      toast.error('Please enter your prices or select Win / Loss / Breakeven.')
      return false
    }
    return true
  }

  const inputStyle = { width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '8px', padding: '10px 14px', color: '#F5F5F5', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none' }
  const sectionTitle = (label, icon) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #3A3A3A' }}>
      <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )

  const PillSelect = ({ name, options, value, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${value === opt ? '#3B82F6' : '#3A3A3A'}`, background: value === opt ? 'rgba(59,130,246,0.15)' : 'transparent', color: value === opt ? '#3B82F6' : '#A0A0A0', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>
          {opt}
        </button>
      ))}
    </div>
  )

  if (verseOverlay) {
    const pnl = parseFloat(verseOverlay.netPnl)
    const isWin = verseOverlay.result === 'Win'
    const isLoss = verseOverlay.result === 'Loss'
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#1A1A1A',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
        animation: 'fadeIn 0.5s ease',
      }}>
        {/* Subtle animated grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="vgrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(59,130,246,0.06)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#vgrid)"/>
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', width: '100%' }}>
          {/* Cross icon */}
          <div style={{ fontSize: '3.5rem', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.5))' }}>✝</div>

          {/* Trade logged badge */}
          <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', borderRadius: '999px', padding: '6px 20px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '32px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ✓ Trade Logged{verseOverlay.emotion ? ` · ${verseOverlay.emotion}` : ''}
          </div>

          {/* P&L result */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              fontWeight: 800,
              color: isWin ? '#4CAF7D' : isLoss ? '#E05252' : '#A0A0A0',
              lineHeight: 1,
              marginBottom: '8px',
              textShadow: isWin ? '0 0 40px rgba(76,175,125,0.3)' : isLoss ? '0 0 40px rgba(224,82,82,0.3)' : 'none',
            }}>
              {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </div>
            <div style={{ color: isWin ? '#4CAF7D' : isLoss ? '#E05252' : '#A0A0A0', fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {verseOverlay.result}
            </div>
          </div>

          {/* Bible verse */}
          <div style={{ background: '#242424', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', borderRadius: '16px', padding: '32px 40px', marginBottom: '40px', boxShadow: '0 0 40px rgba(59,130,246,0.08)' }}>
            <blockquote style={{
              fontFamily: 'Poppins, sans-serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
              color: '#F5F5F5',
              lineHeight: 1.7,
              margin: '0 0 20px',
            }}>
              "{verseOverlay.verse?.text}"
            </blockquote>
            <cite style={{ color: '#3B82F6', fontSize: '1rem', fontWeight: 700, fontStyle: 'normal', fontFamily: 'Poppins, sans-serif' }}>
              — {verseOverlay.verse?.ref}
            </cite>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/app/dashboard')}
              className="btn-gold"
              style={{ padding: '14px 36px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => { setVerseOverlay(null) }}
              style={{ padding: '14px 36px', borderRadius: '12px', border: '1px solid #3A3A3A', background: 'transparent', color: '#A0A0A0', cursor: 'pointer', fontSize: '1rem' }}
            >
              Log Another Trade
            </button>
          </div>
        </div>

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    )
  }


  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', marginBottom: '24px' }}>Log a Trade</h1>

      {/* Journaling through an imported CSV */}
      {csvQueue.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: '13px 18px', marginBottom: 14, flexWrap: 'wrap' }}>
          <Upload size={16} color="#3B82F6" />
          <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 700 }}>
            Journaling imported trade {csvQueueTotal - csvQueue.length} of {csvQueueTotal}
          </span>
          <span style={{ color: '#777', fontSize: '0.8rem' }}>
            {csvQueue.length} still to go — saving loads the next one.
          </span>
          <button
            type="button"
            onClick={() => {
              const rest = csvQueue
              setCsvQueue([]); setCsvQueueTotal(0)
              rest.forEach(t => addTrade(isBacktest ? { ...t, tags: [...(t.tags || []), 'Backtest'] } : t))
              toast.success(`Saved the remaining ${rest.length} trade${rest.length !== 1 ? 's' : ''} to history without journaling.`)
            }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Skip journaling the rest →
          </button>
        </div>
      )}

      {/* CSV Import */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '20px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={15} color="#3B82F6" />
            <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Import from CSV</span>
            <span style={{ color: '#555', fontSize: '0.75rem' }}>— skip manual entry</span>
          </div>
          <button type="button" onClick={() => { setShowCsvImport(v => !v); resetCsvState() }}
            style={{ background: showCsvImport ? 'rgba(59,130,246,0.15)' : '#2E2E2E', border: `1px solid ${showCsvImport ? 'rgba(59,130,246,0.4)' : '#3A3A3A'}`, color: showCsvImport ? '#3B82F6' : '#A0A0A0', borderRadius: '8px', padding: '6px 16px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
            {showCsvImport ? 'Cancel' : 'Open'}
          </button>
        </div>

        {showCsvImport && (
          <div style={{ marginTop: '16px' }}>

            {/* ── Step 1: Upload ── */}
            {csvStep === 'upload' && (
              <>
                <div
                  onDragOver={e => { e.preventDefault(); setCsvDragOver(true) }}
                  onDragLeave={() => setCsvDragOver(false)}
                  onDrop={e => { e.preventDefault(); setCsvDragOver(false); handleCsvFile(e.dataTransfer.files[0]) }}
                  onClick={() => csvFileRef.current?.click()}
                  style={{ border: `2px dashed ${csvDragOver ? '#3B82F6' : '#3A3A3A'}`, borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: csvDragOver ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                  <Upload size={24} color={csvDragOver ? '#3B82F6' : '#444'} style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ color: '#A0A0A0', fontSize: '0.88rem', margin: '0 0 4px' }}>
                    Drop your Tradovate CSV here or <span style={{ color: '#3B82F6', fontWeight: 600 }}>click to browse</span>
                  </p>
                  <p style={{ color: '#555', fontSize: '0.76rem', margin: 0 }}>Tradovate → Fills tab → Export CSV</p>
                  <input ref={csvFileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                    onChange={e => handleCsvFile(e.target.files[0])} />
                </div>
                {csvError && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 8 }}>
                    <p style={{ color: '#E05252', fontSize: '0.82rem', margin: 0, fontWeight: 600 }}>{csvError}</p>
                  </div>
                )}
              </>
            )}

            {/* ── Step 2: Map Columns ── */}
            {csvStep === 'map' && csvRawData && (
              <div>
                <p style={{ color: '#F5F5F5', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px' }}>
                  Your file has {csvRawData.rawHeaders.length} columns. Just tell us two things:
                </p>

                {/* Mini data preview */}
                <div style={{ overflowX: 'auto', marginBottom: 18 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr>
                        {csvRawData.rawHeaders.map((h, i) => (
                          <th key={i} style={{ padding: '6px 10px', background: '#2A2A2A', color: '#A0A0A0', textAlign: 'left', borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRawData.rawRows.slice(0, 3).map((row, ri) => (
                        <tr key={ri}>
                          {csvRawData.rawHeaders.map((_, ci) => (
                            <td key={ci} style={{ padding: '5px 10px', color: '#888', borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap' }}>
                              {String(row[ci] ?? '').slice(0, 16)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Question 1 */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#3B82F6', fontSize: '0.88rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    1. Which column shows your profit/loss? (the dollar number)
                  </label>
                  <select
                    value={csvMapping.pnlIdx ?? -1}
                    onChange={e => setCsvMapping(m => ({ ...m, pnlIdx: parseInt(e.target.value) }))}
                    style={{ width: '100%', background: '#2E2E2E', border: `1px solid ${(csvMapping.pnlIdx ?? -1) < 0 ? 'rgba(224,82,82,0.5)' : '#4CAF7D'}`, borderRadius: 8, padding: '10px 12px', color: (csvMapping.pnlIdx ?? -1) < 0 ? '#555' : '#F5F5F5', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value={-1}>— pick the P&L column —</option>
                    {csvRawData.rawHeaders.map((h, i) => {
                      const sample = csvRawData.rawRows[0] ? String(csvRawData.rawRows[0][i] || '').slice(0, 20) : ''
                      return <option key={i} value={i}>{h}{sample ? ` (e.g. ${sample})` : ''}</option>
                    })}
                  </select>
                </div>

                {/* Question 2 */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#A0A0A0', fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    2. Which column shows the symbol/contract? (like NQ, ES, MNQ)
                  </label>
                  <select
                    value={csvMapping.symIdx ?? -1}
                    onChange={e => setCsvMapping(m => ({ ...m, symIdx: parseInt(e.target.value) }))}
                    style={{ width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: 8, padding: '10px 12px', color: (csvMapping.symIdx ?? -1) < 0 ? '#555' : '#F5F5F5', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value={-1}>— pick the symbol column —</option>
                    {csvRawData.rawHeaders.map((h, i) => {
                      const sample = csvRawData.rawRows[0] ? String(csvRawData.rawRows[0][i] || '').slice(0, 20) : ''
                      return <option key={i} value={i}>{h}{sample ? ` (e.g. ${sample})` : ''}</option>
                    })}
                  </select>
                </div>

                {csvError && (
                  <div style={{ margin: '10px 0', padding: '10px 12px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 8 }}>
                    <p style={{ color: '#E05252', fontSize: '0.82rem', margin: 0 }}>{csvError}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="button" onClick={() => { setCsvStep('upload'); setCsvError(null) }}
                    style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #3A3A3A', background: 'transparent', color: '#A0A0A0', cursor: 'pointer', fontSize: '0.82rem' }}>
                    ← Back
                  </button>
                  <button type="button" onClick={applyMapping} className="btn-gold"
                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                    Show me my trades →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Preview & Import ── */}
            {csvStep === 'preview' && csvParsed.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#A0A0A0', fontSize: '0.82rem' }}>{csvParsed.length} trade{csvParsed.length !== 1 ? 's' : ''} ready to import</span>
                  <button type="button" onClick={() => { setCsvParsed([]); setCsvStep('map'); setCsvError(null) }}
                    style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '0.8rem' }}>← Edit Mapping</button>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #2E2E2E', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#1A1A1A' }}>
                        {['Date','Symbol','Direction','Net P&L','Contracts'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', color: '#777', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #2E2E2E', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvParsed.slice(0, 10).map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '7px 12px', color: '#A0A0A0', whiteSpace: 'nowrap' }}>{t.date}</td>
                          <td style={{ padding: '7px 12px', color: '#F5F5F5', fontWeight: 600 }}>{t.symbol}</td>
                          <td style={{ padding: '7px 12px', color: t.direction === 'Long' ? '#4CAF7D' : '#E05252' }}>{t.direction}</td>
                          <td style={{ padding: '7px 12px', color: parseFloat(t.netPnl) > 0 ? '#4CAF7D' : parseFloat(t.netPnl) < 0 ? '#E05252' : '#A0A0A0', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                            {parseFloat(t.netPnl) >= 0 ? '+' : ''}${Math.abs(parseFloat(t.netPnl) || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '7px 12px', color: '#A0A0A0' }}>{t.positionSize}</td>
                        </tr>
                      ))}
                      {csvParsed.length > 10 && (
                        <tr><td colSpan={5} style={{ padding: '8px 12px', color: '#555', textAlign: 'center', fontStyle: 'italic' }}>+ {csvParsed.length - 10} more trades…</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Load first trade into the form so the user can journal it, then save */}
                  <button type="button" onClick={() => loadTradeIntoForm(csvParsed[0], csvParsed.slice(1), csvParsed.length)} disabled={csvImporting} className="btn-gold"
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Plus size={16} /> Journal {csvParsed.length > 1 ? `all ${csvParsed.length} trades, one at a time` : 'this trade'}
                  </button>
                  {/* Bulk import all rows straight to history (no journaling) */}
                  <button type="button" onClick={handleCsvImport} disabled={csvImporting}
                    style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #3A3A3A', background: 'transparent', color: '#A0A0A0', cursor: csvImporting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: csvImporting ? 0.7 : 1 }}>
                    {csvImporting ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Importing…</> : <><Upload size={16} /> Save all {csvParsed.length} to history (skip journaling)</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); onSubmit() }} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Section 1: Trade Details */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          {sectionTitle('Trade Details')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Date</label>
              <input value={date} onChange={e => setDate(e.target.value)} type="date" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                Entry Time <span style={{ color: '#555' }}>(optional)</span>
              </label>
              <input value={entryTime} onChange={e => setEntryTime(e.target.value)} type="time" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                Exit Time <span style={{ color: '#555' }}>(optional)</span>
              </label>
              <input value={exitTime} onChange={e => setExitTime(e.target.value)} type="time" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Symbol</label>
              <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="AAPL, EUR/USD..." style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Timeframe</label>
            <PillSelect name="timeframe" options={['Scalp','Day Trade','Swing','Position']} value={timeframe} onChange={v => setTimeframe(v)} />
          </div>
        </div>

        {/* Section 2: Entry & Exit — always visible */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #3A3A3A' }}>
            <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entry & Exit</span>
          </div>

          {/* Win / Loss */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: 8 }}>
              Result
              {entryPrice && exitPrice && positionSize && (
                <span style={{ color: '#555', fontSize: '0.72rem', marginLeft: 8 }}>(auto-calculated from prices)</span>
              )}
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Win',       color: '#4CAF7D', bg: 'rgba(76,175,125,0.15)',  emoji: '✅' },
                { label: 'Loss',      color: '#E05252', bg: 'rgba(224,82,82,0.15)',   emoji: '❌' },
                { label: 'Breakeven', color: '#A0A0A0', bg: 'rgba(160,160,160,0.1)',  emoji: '➖' },
              ].map(({ label, color, bg, emoji }) => {
                const hasPricesNow = entryPrice && exitPrice && positionSize
                const isActive = hasPricesNow ? calcs.result === label : manualResult === label
                return (
                  <button key={label} type="button"
                    onClick={() => {
                      setManualResult(label)
                      if (label === 'Win'       && takeProfit)  setExitPrice(takeProfit)
                      if (label === 'Loss'      && stopLoss)    setExitPrice(stopLoss)
                      if (label === 'Breakeven' && entryPrice)  setExitPrice(entryPrice)
                    }}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 10,
                      fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${isActive ? color : '#333'}`,
                      background: isActive ? bg : 'transparent',
                      color: isActive ? color : '#444',
                    }}>
                    {emoji} {label}
                  </button>
                )
              })}
            </div>

            {/* Manual Net P&L — shown when no prices entered */}
            {!entryPrice && !exitPrice && (
              <div style={{ marginTop: 12 }}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>
                  Net P&L per account ($)
                  {parseFloat(accountsTraded) > 1 && manualNetPnl && (
                    <span style={{ color: '#3B82F6', fontWeight: 700, marginLeft: 8 }}>
                      × {accountsTraded} accounts = ${(parseFloat(manualNetPnl) * parseFloat(accountsTraded)).toFixed(2)} total
                    </span>
                  )}
                </label>
                <input
                  value={manualNetPnl}
                  onChange={e => setManualNetPnl(e.target.value)}
                  placeholder="e.g. 76.00 or -120.00"
                  type="number" step="any"
                  style={{ ...inputStyle, borderColor: manualNetPnl ? 'rgba(59,130,246,0.4)' : undefined }}
                />
                <p style={{ color: '#555', fontSize: '0.72rem', marginTop: 4 }}>
                  Enter your dollar P&L per account — it will be multiplied by Accounts Traded below.
                </p>
              </div>
            )}
          </div>

          {/* Price fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {[
              ['entryPrice',  'Entry Price',   '0.00', entryPrice,  setEntryPrice],
              ['exitPrice',   'Exit Price',    '0.00', exitPrice,   setExitPrice],
              ['stopLoss',    'Stop Loss',     '0.00', stopLoss,    setStopLoss],
              ['takeProfit',  'Take Profit',   '0.00', takeProfit,  setTakeProfit],
              ['commission',  'Commission ($)', '0',   commission,  setCommission],
            ].map(([name, label, ph, val, setter]) => (
              <div key={name}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>{label}</label>
                <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} type="number" step="any" style={inputStyle} />
              </div>
            ))}
            {/* MNQ Contracts */}
            <div>
              <label style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '6px' }}>
                <span style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 4, padding: '1px 6px', fontSize: '0.72rem', fontWeight: 800 }}>NQ</span>
                Contracts
              </label>
              <input value={positionSize} onChange={e => setPositionSize(e.target.value)} placeholder="e.g. 2" type="number" step="1" min="1"
                style={{ ...inputStyle, border: '1px solid rgba(59,130,246,0.4)', fontWeight: 700 }} />
              <p style={{ color: '#555', fontSize: '0.73rem', marginTop: 4 }}>1 MNQ = $2 per point</p>
            </div>
            {/* Accounts Traded */}
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                Accounts Traded
              </label>
              <input value={accountsTraded} onChange={e => setAccountsTraded(e.target.value)} placeholder="e.g. 3" type="number" step="1" min="1"
                style={inputStyle} />
              <p style={{ color: '#555', fontSize: '0.73rem', marginTop: 4 }}>How many accounts used</p>
            </div>
          </div>

          {/* Auto-calc */}
          <div style={{ background: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
            {parseFloat(accountsTraded) > 1 && (
              <div style={{ textAlign: 'center', marginBottom: 10, color: '#3B82F6', fontSize: '0.75rem', fontWeight: 600 }}>
                ✕ {accountsTraded} accounts — showing combined totals
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {[
                ['Points',    (parseFloat(calcs.points) >= 0 ? '+' : '') + calcs.points + ' pts', parseFloat(calcs.points) >= 0 ? '#3B82F6' : '#E05252'],
                ['Gross P&L', '$' + calcs.gross, parseFloat(calcs.gross) >= 0 ? '#4CAF7D' : '#E05252'],
                ['Net P&L',   '$' + calcs.net,   parseFloat(calcs.net)   >= 0 ? '#4CAF7D' : '#E05252'],
                ['R:R',       detectedRR ? `1:${detectedRR}` : '—', '#3B82F6'],
                ['Result',    calcs.result, calcs.result === 'Win' ? '#4CAF7D' : calcs.result === 'Loss' ? '#E05252' : '#A0A0A0'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.72rem', marginBottom: '4px' }}>{l}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', color: c, fontWeight: 700, fontSize: '0.95rem' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live projection tool — appears as prices are entered */}
          <TradeProjectionView
            entry={entryPrice}
            tp={takeProfit}
            stop={stopLoss}
            contracts={parseFloat(positionSize) || 1}
            accounts={Math.max(1, parseFloat(accountsTraded) || 1)}
            result={manualResult}
          />
        </div>

        {/* Section 3: Chart Screenshot — open to all users. The AI price parser
            that runs on upload stays admin-only (it bills per image). */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)', padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #3A3A3A' }}>
            <ImagePlus size={16} color="#3B82F6" />
            <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chart Screenshot</span>
            <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 4 }}>(optional)</span>
          </div>

          {!chartImage ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files[0]) }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#3B82F6' : '#3A3A3A'}`,
                borderRadius: 10, padding: '36px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                background: dragOver ? 'rgba(59,130,246,0.05)' : 'transparent',
              }}
            >
              <ImagePlus size={28} color={dragOver ? '#3B82F6' : '#444'} style={{ margin: '0 auto 10px' }} />
              <p style={{ color: '#A0A0A0', fontSize: '0.88rem', marginBottom: 4 }}>
                Drop your chart here or <span style={{ color: '#3B82F6', fontWeight: 600 }}>click to browse</span>
              </p>
              <p style={{ color: '#555', fontSize: '0.76rem' }}>PNG, JPG, WebP</p>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleImageFile(e.target.files[0])} />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button type="button" onClick={() => { setChartImage(null); setChartMarkers([]) }}
                  style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: '#E05252', borderRadius: 6, padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X size={12} /> Remove
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <img src={chartImage} alt="Trade chart"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #3A3A3A', maxHeight: 480, objectFit: 'contain', background: '#111' }} />
                {analyzing && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <Loader2 size={28} color="#3B82F6" className="animate-spin" />
                    <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '0.9rem' }}>
                      Reading prices from chart…
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Execution Quality */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          {sectionTitle('Execution Quality')}

            {/* The trader's own questions, added from Reports */}
            {execQuestions.map(q => (
              <div key={q.id} style={{ marginBottom: '20px' }}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>{q.label}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {q.options.map(opt => {
                    const on = customAnswers[q.id] === opt
                    return (
                      <button key={opt} type="button" onClick={() => setCustomAnswer(q.id, on ? '' : opt)}
                        style={{ padding: '6px 12px', borderRadius: '999px', border: `1px solid ${on ? '#4CAF7D' : '#3A3A3A'}`, background: on ? '#4CAF7D26' : 'transparent', color: on ? '#4CAF7D' : '#A0A0A0', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

          {/* Direction */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Direction</label>
            <PillSelect name="direction" options={['Long','Short']} value={direction} onChange={v => setDirection(v)} />
          </div>

          {/* Checklist — label on left, pills on right */}
          <div style={{ marginBottom: '24px' }}>
            {/* Form-registered fields */}
            {[
              ['Followed the plan?',  'followedPlan',    ['Yes','Partially','No']],
              ['Moved stop loss to breakeven?', 'movedStop', ['Yes','No']],
              ['Did you over-risk?',  'overRisked',      ['Yes','No']],
            ].map(([label, name, opts], i) => {
              const current = getFieldValue(name)
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #2A2A2A' }}>
                  <span style={{ color: '#B0B0B0', fontSize: '0.88rem', fontWeight: 500 }}>{label}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {opts.map(opt => {
                      const active = current === opt
                      const accent = opt === 'Yes' ? '#4CAF7D' : opt === 'No' ? '#E05252' : '#3B82F6'
                      return (
                        <button key={opt} type="button" onClick={() => setFieldValue(name, opt)}
                          style={{ padding: '5px 14px', borderRadius: '6px', border: `1px solid ${active ? accent : '#333'}`, background: active ? `${accent}18` : 'transparent', color: active ? accent : '#505050', fontSize: '0.8rem', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Extra execution quality questions */}
            {[
              ['Waited for confirmation?',  waitedConfirmation, setWaitedConfirmation, ['Yes','No'],                              { Yes: '#4CAF7D', No: '#E05252' }],
              ['Entered at key level?',     enteredAtLevel,     setEnteredAtLevel,     ['Yes','Partially','No'],                  { Yes: '#4CAF7D', Partially: '#3B82F6', No: '#E05252' }],
              ['Rushed the entry?',         rushedEntry,        setRushedEntry,        ['Yes','No'],                              { Yes: '#E05252', No: '#4CAF7D' }],
              ['Exit timing?',              exitDecision,       setExitDecision,       ['Too Early','On Plan','Too Late'],        { 'Too Early': '#E05252', 'On Plan': '#4CAF7D', 'Too Late': '#3B82F6' }],
              ['Protected stop loss?',      protectedStop,      setProtectedStop,      ['Yes','No'],                               { Yes: '#4CAF7D', No: '#E05252' }],
              ['Targeted heat map liquidity?', targetedLiquidity, setTargetedLiquidity, ['Yes','No'],                               { Yes: '#4CAF7D', No: '#E05252' }],
            ].map(([label, val, setter, opts, colors], i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < arr.length - 1 ? '1px solid #2A2A2A' : 'none' }}>
                <span style={{ color: '#B0B0B0', fontSize: '0.88rem', fontWeight: 500 }}>{label}</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {opts.map(opt => {
                    const active = val === opt
                    const accent = colors[opt] || '#3B82F6'
                    return (
                      <button key={opt} type="button" onClick={() => setter(opt)}
                        style={{ padding: '5px 14px', borderRadius: '6px', border: `1px solid ${active ? accent : '#333'}`, background: active ? `${accent}18` : 'transparent', color: active ? accent : '#505050', fontSize: '0.8rem', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quality bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              ['Entry Quality', entryQuality, setEntryQuality],
              ['Exit Quality',  exitQuality,  setExitQuality],
            ].map(([label, val, setter]) => {
              const barColor =
                val >= 8 ? '#4CAF7D' :
                val >= 5 ? '#3B82F6' : '#E05252'
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                    <span style={{ color: '#A0A0A0', fontSize: '0.8rem' }}>{label}</span>
                    <span style={{
                      color: barColor,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.88rem', fontWeight: 700,
                    }}>
                      {val}<span style={{ color: '#444', fontWeight: 400 }}>/10</span>
                    </span>
                  </div>

                  {/* Segmented bar — click any segment to set score */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <button
                        key={n} type="button"
                        onClick={() => setter(n)}
                        title={`${n}/10`}
                        style={{
                          flex: 1, height: '7px',
                          borderRadius: n === 1 ? '4px 2px 2px 4px' : n === 10 ? '2px 4px 4px 2px' : '2px',
                          border: 'none', padding: 0,
                          background: n <= val ? barColor : '#2A2A2A',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                          opacity: n <= val ? 1 : 0.6,
                        }}
                        onMouseEnter={e => { if (n > val) e.currentTarget.style.background = `${barColor}50` }}
                        onMouseLeave={e => { if (n > val) e.currentTarget.style.background = '#2A2A2A' }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 4: Psychology */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          {sectionTitle('Psychology')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* The trader's own questions, added from Reports */}
            {psychQuestions.map(q => (
              <div key={q.id} style={{ marginBottom: '20px' }}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>{q.label}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {q.options.map(opt => {
                    const on = customAnswers[q.id] === opt
                    return (
                      <button key={opt} type="button" onClick={() => setCustomAnswer(q.id, on ? '' : opt)}
                        style={{ padding: '6px 12px', borderRadius: '999px', border: `1px solid ${on ? '#3B82F6' : '#3A3A3A'}`, background: on ? '#3B82F626' : 'transparent', color: on ? '#3B82F6' : '#A0A0A0', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Emotions */}
            {[['Pre-trade emotion', preTrade, setPreTrade, emotions], ['Post-trade emotion', postTrade, setPostTrade, postEmotions]].map(([label, val, setter, opts]) => (
              <div key={label}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>{label}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {opts.map(e => (
                    <button key={e} type="button" onClick={() => setter(e)}
                      style={{ padding: '6px 12px', borderRadius: '999px', border: `1px solid ${val === e ? '#3B82F6' : '#3A3A3A'}`, background: val === e ? 'rgba(59,130,246,0.15)' : 'transparent', color: val === e ? '#3B82F6' : '#A0A0A0', fontSize: '0.8rem', cursor: 'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Extra psychology questions */}
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['Sleep quality last night?', sleepQuality,  setSleepQuality,  ['Poor','Fair','Good','Excellent'],         { Poor: '#E05252', Fair: '#3B82F6', Good: '#4CAF7D', Excellent: '#4CAF7D' }],
                ['Focus / mental clarity?',   focusLevel,    setFocusLevel,    ['Scattered','Distracted','Focused','Locked In'], { Scattered: '#E05252', Distracted: '#3B82F6', Focused: '#4CAF7D', 'Locked In': '#4CAF7D' }],
                ['Stress level going in?',    stressLevel,   setStressLevel,   ['High','Medium','Low'],                    { High: '#E05252', Medium: '#3B82F6', Low: '#4CAF7D' }],
                ['Physical energy level?',    energyLevel,   setEnergyLevel,   ['Low','Medium','High'],                    { Low: '#E05252', Medium: '#3B82F6', High: '#4CAF7D' }],
                ['Revenge trading?',              revengeTrade,  setRevengeTrade,  ['Yes','No'], { Yes: '#E05252', No: '#4CAF7D' }],
                ['Moved stop loss due to fear?', movedStopFear, setMovedStopFear, ['Yes','No'], { Yes: '#E05252', No: '#4CAF7D' }],
              ].map(([label, val, setter, opts, colors]) => (
                <div key={label}>
                  <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>{label}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {opts.map(opt => {
                      const active = val === opt
                      const accent = colors[opt] || '#3B82F6'
                      return (
                        <button key={opt} type="button" onClick={() => setter(opt)}
                          style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${active ? accent : '#3A3A3A'}`, background: active ? `${accent}18` : 'transparent', color: active ? accent : '#A0A0A0', fontSize: '0.8rem', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Mindset Notes</label>
              <textarea value={mindsetNotes} onChange={e => setMindsetNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What was your mental state like? Anything affecting your trading today?" />
            </div>
          </div>
        </div>

        {/* Session & Confluences */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[['session', '🕐 Session'], ['confluences', '✓ Confluences']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSessionTab(id)}
                style={{ padding: '7px 18px', borderRadius: '8px', border: `1px solid ${sessionTab === id ? '#5B9BD5' : '#3A3A3A'}`, background: sessionTab === id ? 'rgba(91,155,213,0.15)' : 'transparent', color: sessionTab === id ? '#5B9BD5' : '#666', fontSize: '0.85rem', fontWeight: sessionTab === id ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {sessionTab === 'session' && (
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>Which session did you trade?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['New York','London','London/NY Overlap','Asian','Pre-Market','After Hours'].map(s => (
                  <button key={s} type="button" onClick={() => setTradingSession(tradingSession === s ? '' : s)}
                    style={{ padding: '8px 18px', borderRadius: '999px', border: `1px solid ${tradingSession === s ? '#5B9BD5' : '#3A3A3A'}`, background: tradingSession === s ? 'rgba(91,155,213,0.15)' : 'transparent', color: tradingSession === s ? '#5B9BD5' : '#A0A0A0', fontSize: '0.85rem', fontWeight: tradingSession === s ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {tradingSession === s ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sessionTab === 'confluences' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem' }}>
                  What lined up for this trade?
                  {confluences.length > 0 && <span style={{ color: '#4CAF7D', fontSize: '0.72rem', marginLeft: 6 }}>{confluences.length} selected</span>}
                </label>
              </div>
              {customConfluences.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 12 }}>
                  {customConfluences.map(c => {
                    const on = confluences.includes(c)
                    return (
                      <button key={c} type="button"
                        onClick={() => setConfluences(prev => on ? prev.filter(x => x !== c) : [...prev, c])}
                        style={{ padding: '7px 16px', borderRadius: '999px', border: `1px solid ${on ? '#4CAF7D' : '#3A3A3A'}`, background: on ? 'rgba(76,175,125,0.15)' : 'transparent', color: on ? '#4CAF7D' : '#A0A0A0', fontSize: '0.83rem', cursor: 'pointer', transition: 'all 0.15s', fontWeight: on ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {on ? '✓ ' : ''}{c}
                        <span onClick={e => { e.stopPropagation(); setConfluences(prev => prev.filter(x => x !== c)); updateSettings({ customConfluences: customConfluences.filter(x => x !== c) }) }}
                          style={{ color: '#444', fontSize: '0.7rem', marginLeft: 4, lineHeight: 1 }}>✕</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newConfluence} onChange={e => setNewConfluence(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = newConfluence.trim()
                      if (v) {
                        updateSettings({ customConfluences: [...(useTradeStore.getState().settings?.customConfluences || []), v] })
                        setConfluences(prev => prev.includes(v) ? prev : [...prev, v])
                        setNewConfluence('')
                      }
                    }
                  }}
                  placeholder="Type a confluence and press Enter to save…" style={{ ...inputStyle, fontSize: '0.82rem', padding: '7px 12px', flex: 1 }} />
                <button type="button"
                  onClick={() => {
                    const v = newConfluence.trim()
                    if (v) {
                      updateSettings({ customConfluences: [...(useTradeStore.getState().settings?.customConfluences || []), v] })
                      setConfluences(prev => prev.includes(v) ? prev : [...prev, v])
                      setNewConfluence('')
                    }
                  }}
                  style={{ background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: 8, padding: '7px 14px', color: '#4CAF7D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <Plus size={13} /> Save & Select
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Post-Trade Review */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          {sectionTitle('Post-Trade Review')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>What went well?</label>
              <textarea value={wentWell} onChange={e => setWentWell(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What did you execute correctly on this trade?" />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>What to improve?</label>
              <textarea value={toImprove} onChange={e => setToImprove(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What would you do differently next time?" />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Would you take this trade again?</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[['Yes','#4CAF7D'],['Maybe','#3B82F6'],['No','#E05252']].map(([v, c]) => (
                  <button key={v} type="button" onClick={() => setTakeAgain(v)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${takeAgain === v ? c : '#3A3A3A'}`, background: takeAgain === v ? `${c}18` : 'transparent', color: takeAgain === v ? c : '#666', fontWeight: takeAgain === v ? 700 : 400, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Strategy */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          {sectionTitle('Strategy & Setup')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Strategy Name</label>
              {playbook.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    {playbook.map(s => {
                      const related = allTrades.filter(t => t.strategyName === s.name)
                      const wins = related.filter(t => t.result === 'Win').length
                      const wr = related.length ? Math.round((wins / related.length) * 100) : null
                      const selected = strategyName === s.name
                      return (
                        <button key={s.id} type="button"
                          onClick={() => setStrategyName(selected ? '' : s.name)}
                          style={{ padding: '10px 16px', borderRadius: '10px', border: `1px solid ${selected ? '#3B82F6' : '#3A3A3A'}`, background: selected ? 'rgba(59,130,246,0.12)' : '#1E1E1E', cursor: 'pointer', textAlign: 'left', minWidth: '130px' }}>
                          <div style={{ color: selected ? '#3B82F6' : '#F5F5F5', fontSize: '0.88rem', fontWeight: 600 }}>{s.name}</div>
                          {wr !== null
                            ? <div style={{ color: wr >= 50 ? '#4CAF7D' : '#E05252', fontSize: '0.7rem', marginTop: 3 }}>{wr}% win rate · {related.length} trade{related.length !== 1 ? 's' : ''}</div>
                            : <div style={{ color: '#555', fontSize: '0.7rem', marginTop: 3 }}>No trades yet</div>
                          }
                        </button>
                      )
                    })}
                  </div>
                  <input value={strategyName} onChange={e => setStrategyName(e.target.value)} placeholder="Or type a custom strategy name…" style={{ ...inputStyle, fontSize: '0.82rem' }} />
                </>
              ) : (
                <>
                  <div style={{ color: '#555', fontSize: '0.8rem', padding: '12px 14px', background: '#1A1A1A', borderRadius: '8px', border: '1px solid #2A2A2A', marginBottom: '10px' }}>
                    No strategies yet — add them in the <span style={{ color: '#3B82F6' }}>Strategy</span> tab.
                  </div>
                  <input value={strategyName} onChange={e => setStrategyName(e.target.value)} placeholder="e.g. Bull Flag Breakout" style={inputStyle} />
                </>
              )}
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Trade Notes / Narrative</label>
              <textarea value={tradeNotes} onChange={e => setTradeNotes(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe your trade thesis..." />
            </div>
          </div>
        </div>

        {/* Section 6: Faith */}
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #3A3A3A' }}>
            <span style={{ color: '#3B82F6', fontSize: '1.1rem' }}>✝</span>
            <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faith Section</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Scripture before this trade</label>
              <input value={scripture} onChange={e => setScripture(e.target.value)} placeholder="e.g. Philippians 4:13" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Prayer / Intention</label>
              <textarea value={prayer} onChange={e => setPrayer(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What did you pray or intend before entering this trade?" />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Gratitude Note</label>
              <textarea value={gratitude} onChange={e => setGratitude(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What are you grateful for regardless of outcome?" />
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>Faith Alignment Rating</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setFaithRating(n)}>
                    <Star size={24} fill={n <= faithRating ? '#3B82F6' : 'none'} color={n <= faithRating ? '#3B82F6' : '#3A3A3A'} style={{ cursor: 'pointer' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {loading
            ? <><Loader2 size={20} className="animate-spin" /> Logging Trade...</>
            : csvQueue.length
              ? <><CheckCircle size={20} /> Save &amp; continue to next trade ({csvQueueTotal - csvQueue.length} of {csvQueueTotal})</>
              : <><CheckCircle size={20} /> Log Trade</>}
        </button>
      </form>
    </div>
  )
}
