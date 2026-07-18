import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Send, Hash, Users, LogOut,
  Mic, MicOff, ScreenShare, ScreenShareOff, PhoneOff, Volume2,
} from 'lucide-react'

/* ── Text channels ────────────────────────────────────────────── */
const CHANNELS = [
  { id: 'general',        label: 'general',        emoji: '💬', desc: 'General faith & trading discussion' },
  { id: 'trading-ideas',  label: 'trading-ideas',  emoji: '📈', desc: 'Share your trade setups & ideas'    },
  { id: 'wins',           label: 'wins',           emoji: '🏆', desc: 'Celebrate your victories'           },
  { id: 'accountability', label: 'accountability', emoji: '🤝', desc: 'Daily accountability check-ins'     },
  { id: 'prayer',         label: 'prayer',         emoji: '🙏', desc: 'Prayer requests & encouragement'    },
]

/* ── Voice rooms ──────────────────────────────────────────────── */
const VOICE_ROOMS = [
  { id: 'general-voice', label: 'General' },
]

/* ── WebRTC ICE servers ───────────────────────────────────────── */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
]

/* ── Helpers ──────────────────────────────────────────────────── */
const COLORS = ['#3B82F6','#4CAF7D','#9B8FE8','#E8905A','#4A9FE0','#E05252','#50C8C8','#E87ABA']

function hashColor (str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function initials (name = '') {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function formatTime (ts) {
  if (!ts) return ''
  const d    = new Date(ts)
  const diff = Date.now() - ts
  if (diff < 60_000)     return 'just now'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Wait for ICE gathering to finish or timeout */
function waitGatheringComplete (pc, ms = 5000) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') { resolve(); return }
    const timer = setTimeout(resolve, ms)
    const fn = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer)
        pc.removeEventListener('icegatheringstatechange', fn)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', fn)
  })
}

/* ── Avatar ───────────────────────────────────────────────────── */
function Avatar ({ name = '', size = 34 }) {
  const color = hashColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}1A`, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontSize: size * 0.36, fontWeight: 800, fontFamily: 'Poppins, sans-serif',
      userSelect: 'none',
    }}>
      {initials(name)}
    </div>
  )
}

/* ── Hidden audio player for a remote stream ─────────────────── */
function RemoteAudio ({ stream }) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />
}

/* ── Screen-share video tile ─────────────────────────────────── */
function ScreenVideo ({ stream, label }) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])
  return (
    <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200, maxWidth: 420 }}>
      <video
        ref={ref} autoPlay playsInline
        style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, background: '#0A0A0A' }}
      />
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        background: 'rgba(0,0,0,0.72)', borderRadius: 5,
        padding: '2px 8px', fontSize: '0.7rem', color: '#ccc',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <ScreenShare size={10} /> {label}
      </div>
    </div>
  )
}

/* ── Name setup modal ─────────────────────────────────────────── */
function NameModal ({ onSave }) {
  const [name, setName] = useState('')
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])
  const submit = () => { if (name.trim().length >= 2) onSave(name.trim()) }
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#242424', borderRadius: 16, border: '1px solid #3A3A3A',
        padding: '40px 36px', width: 420, maxWidth: '92vw',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 14 }}>✝</div>
          <h2 style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.25rem', margin: '0 0 8px' }}>
            Join the Community
          </h2>
          <p style={{ color: '#555', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
            Choose a display name to start chatting with fellow Covenant Traders.
          </p>
        </div>
        <input
          ref={ref} value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Your display name…"
          maxLength={30}
          style={{
            width: '100%', background: '#1A1A1A', border: '1px solid #3A3A3A',
            borderRadius: 10, color: '#F5F5F5', fontSize: '0.95rem',
            padding: '13px 16px', outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit', marginBottom: 8, transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#3B82F6'}
          onBlur={e  => e.target.style.borderColor = '#3A3A3A'}
        />
        {name.trim().length > 0 && name.trim().length < 2 && (
          <p style={{ color: '#E05252', fontSize: '0.75rem', margin: '0 0 12px' }}>At least 2 characters required</p>
        )}
        <button
          onClick={submit} disabled={name.trim().length < 2}
          className="btn-gold"
          style={{
            width: '100%', padding: 13, borderRadius: 10, border: 'none',
            cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: '0.95rem',
            opacity: name.trim().length >= 2 ? 1 : 0.35, marginTop: 8,
          }}
        >
          Enter Community
        </button>
      </div>
    </div>
  )
}

/* ── Channel welcome banner ───────────────────────────────────── */
function ChannelWelcome ({ channel }) {
  const ch = CHANNELS.find(c => c.id === channel) ?? CHANNELS[0]
  return (
    <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid #2A2A2A', marginBottom: 16 }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>{ch.emoji}</div>
      <h2 style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.4rem', margin: '0 0 6px' }}>
        Welcome to #{ch.label}
      </h2>
      <p style={{ color: '#555', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
        {ch.desc}. Be the first to say something!
      </p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   Main Community component
════════════════════════════════════════════════════════════════ */
export default function Community () {

  /* ── Chat state ── */
  const [displayName,   setDisplayName]   = useState(() => localStorage.getItem('ft-community-name') || '')
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [ready,         setReady]         = useState(null) // null | true | false
  const [sendError,     setSendError]     = useState('')

  const bottomRef        = useRef(null)
  const inputRef         = useRef(null)
  const messagesRef      = useRef([])
  const lastFetchedAtRef = useRef(0)
  const activeChannelRef = useRef('general')

  /* ── Voice state ── */
  const [inVoice,           setInVoice]           = useState(false)
  const [muted,             setMuted]             = useState(false)
  const [sharing,           setSharing]           = useState(false)
  const [voiceRoom,         setVoiceRoom]         = useState(null)
  const [voiceParticipants, setVoiceParticipants] = useState([])
  const [remoteStreams,     setRemoteStreams]      = useState({})   // { peerId: MediaStream }
  const [screenStreams,     setScreenStreams]      = useState({})   // { peerId: MediaStream }
  const [voiceError,        setVoiceError]        = useState('')
  const [voiceConnecting,   setVoiceConnecting]   = useState(false)

  /* ── Voice refs (stable across renders, no stale-closure risk) ── */
  const localStreamRef    = useRef(null)
  const screenStreamRef   = useRef(null)
  const screenSendersRef  = useRef({})     // peerId → RTCRtpSender
  const peerConnsRef      = useRef({})     // peerId → RTCPeerConnection
  const sigPollingRef     = useRef(null)
  const heartbeatRef      = useRef(null)
  const lastSigAtRef      = useRef(0)
  const voiceRoomRef      = useRef(null)
  const inVoiceRef        = useRef(false)
  const mutedRef          = useRef(false)
  const sharingRef        = useRef(false)
  const myVoiceIdRef      = useRef(null)
  const displayNameRef    = useRef(displayName)

  useEffect(() => { displayNameRef.current = displayName }, [displayName])

  /* ── Stable voice user ID (generated once, persisted in localStorage) ── */
  useEffect(() => {
    let id = localStorage.getItem('ft-voice-id')
    if (!id) {
      id = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
      localStorage.setItem('ft-voice-id', id)
    }
    myVoiceIdRef.current = id
  }, [])

  /* ════════════ VOICE HELPERS ════════════ */

  /** POST a signal to the signaling server */
  const postSignal = useCallback(async (type, toUserId = '', data = '') => {
    const roomId = voiceRoomRef.current
    if (!roomId || !myVoiceIdRef.current) return
    try {
      await fetch('/api/signal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          fromUserId:   myVoiceIdRef.current,
          fromUsername: displayNameRef.current,
          toUserId,
          type,
          data,
        }),
      })
    } catch (e) {
      console.warn('[voice] postSignal:', e.message)
    }
  }, [])

  /** Close one peer connection and clean up state */
  const closePeerConn = useCallback((peerId) => {
    const pc = peerConnsRef.current[peerId]
    if (pc) { try { pc.close() } catch {} delete peerConnsRef.current[peerId] }
    delete screenSendersRef.current[peerId]
    setRemoteStreams(prev => { const n = { ...prev }; delete n[peerId]; return n })
    setScreenStreams(prev => { const n = { ...prev }; delete n[peerId]; return n })
  }, [])

  /**
   * Get-or-create an RTCPeerConnection for peerId.
   * Adding local tracks triggers onnegotiationneeded automatically.
   * The lower userId always acts as the offerer (both for initial and renegotiation).
   */
  const createPeerConn = useCallback((peerId, peerUsername) => {
    if (peerConnsRef.current[peerId]) return peerConnsRef.current[peerId]

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnsRef.current[peerId] = pc   // store early to prevent double-creation

    /* Offerer = lower userId. onnegotiationneeded handles both initial + renegotiation.
       We skip the very first fire (caused by addTrack during setup) if this peer
       will be the one to send an explicit offer via initiateOffer instead. */
    let skipFirst = true
    pc.onnegotiationneeded = async () => {
      if (skipFirst) { skipFirst = false; return }
      if (myVoiceIdRef.current >= peerId) return   // higher ID never initiates
      // Guard: only proceed if stable
      if (pc.signalingState !== 'stable') return
      try {
        const offer = await pc.createOffer()
        if (pc.signalingState !== 'stable') return
        await pc.setLocalDescription(offer)
        await waitGatheringComplete(pc)
        await postSignal('offer', peerId, JSON.stringify(pc.localDescription))
      } catch (e) {
        console.warn('[voice] onnegotiationneeded error:', e.message)
      }
    }

    // Add local audio
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current))
    }

    // Add screen share video if already active
    if (screenStreamRef.current) {
      const vt = screenStreamRef.current.getVideoTracks()[0]
      if (vt) screenSendersRef.current[peerId] = pc.addTrack(vt, screenStreamRef.current)
    }

    // Incoming remote tracks
    pc.ontrack = event => {
      const stream = event.streams[0]
      if (!stream) return
      const hasVideo = stream.getVideoTracks().length > 0
      if (hasVideo) {
        setScreenStreams(prev => ({ ...prev, [peerId]: stream }))
        setRemoteStreams(prev => ({ ...prev, [peerId]: stream }))
      } else {
        setRemoteStreams(prev => ({ ...prev, [peerId]: stream }))
      }
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        closePeerConn(peerId)
      }
    }

    return pc
  }, [closePeerConn, postSignal])

  /**
   * Explicitly create and send an offer to peerId (called by the lower-ID peer).
   * skipFirst is already set to false after the first onnegotiationneeded,
   * so this bypasses it by acting directly on the PC.
   */
  const initiateOffer = useCallback(async (peerId, peerUsername) => {
    const pc = createPeerConn(peerId, peerUsername)
    if (pc.signalingState !== 'stable') return
    try {
      const offer = await pc.createOffer()
      if (pc.signalingState !== 'stable') return
      await pc.setLocalDescription(offer)
      await waitGatheringComplete(pc)
      await postSignal('offer', peerId, JSON.stringify(pc.localDescription))
    } catch (e) {
      console.warn('[voice] initiateOffer error:', e.message)
    }
  }, [createPeerConn, postSignal])

  /* ── Signaling poll ── */
  const pollSignaling = useCallback(async () => {
    if (!voiceRoomRef.current || !myVoiceIdRef.current || !inVoiceRef.current) return
    try {
      const r = await fetch(
        `/api/signal?room=${encodeURIComponent(voiceRoomRef.current)}` +
        `&userId=${encodeURIComponent(myVoiceIdRef.current)}` +
        `&since=${lastSigAtRef.current}`
      )
      if (!r.ok) return
      const { signals, participants } = await r.json()

      setVoiceParticipants(participants)

      if (signals.length > 0) {
        lastSigAtRef.current = Math.max(...signals.map(s => s.createdAt))
      }

      for (const sig of signals) {
        if (sig.fromUserId === myVoiceIdRef.current) continue  // skip own signals

        switch (sig.type) {

          /* New peer joined — lower ID initiates */
          case 'join': {
            if (myVoiceIdRef.current < sig.fromUserId) {
              await initiateOffer(sig.fromUserId, sig.fromUsername)
            }
            // else: they'll see our earlier join and send us an offer
            break
          }

          /* Incoming offer — create and send answer */
          case 'offer': {
            const pc = createPeerConn(sig.fromUserId, sig.fromUsername)
            const isPolite       = myVoiceIdRef.current < sig.fromUserId
            const offerCollision = pc.signalingState !== 'stable'
            if (!isPolite && offerCollision) break  // impolite: ignore colliding offer
            try {
              if (offerCollision) await pc.setLocalDescription({ type: 'rollback' })
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.data)))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await waitGatheringComplete(pc)
              await postSignal('answer', sig.fromUserId, JSON.stringify(pc.localDescription))
            } catch (e) {
              console.warn('[voice] handle offer error:', e.message)
            }
            break
          }

          /* Incoming answer — complete the handshake */
          case 'answer': {
            const pc = peerConnsRef.current[sig.fromUserId]
            if (pc && pc.signalingState === 'have-local-offer') {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.data)))
              } catch (e) {
                console.warn('[voice] handle answer error:', e.message)
              }
            }
            break
          }

          /* Peer left */
          case 'leave': {
            closePeerConn(sig.fromUserId)
            break
          }

          default: break
        }
      }
    } catch (e) {
      console.warn('[voice] poll error:', e.message)
    }
  }, [initiateOffer, createPeerConn, closePeerConn, postSignal])

  /* ── Join voice channel ── */
  const joinVoice = useCallback(async (roomId) => {
    if (!displayNameRef.current) return
    setVoiceError('')
    setVoiceConnecting(true)
    try {
      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      voiceRoomRef.current = roomId
      inVoiceRef.current   = true

      // Announce presence
      await postSignal('join', '', '')

      // Fetch existing participants
      const r = await fetch(
        `/api/signal?room=${encodeURIComponent(roomId)}` +
        `&userId=${encodeURIComponent(myVoiceIdRef.current)}&since=0`
      )
      const { participants } = await r.json()

      // Baseline: only process signals from this moment forward
      lastSigAtRef.current = Date.now()

      setVoiceParticipants(participants)
      setVoiceRoom(roomId)
      setInVoice(true)

      // Connect to existing peers (lower ID initiates)
      for (const peer of participants) {
        if (peer.userId !== myVoiceIdRef.current && myVoiceIdRef.current < peer.userId) {
          await initiateOffer(peer.userId, peer.username)
        }
        // else: they'll see our join and initiate back to us
      }

      // Send first heartbeat immediately
      postSignal('heartbeat', '', 'live')

      // Heartbeat every 5 s
      heartbeatRef.current = setInterval(() => {
        if (inVoiceRef.current) {
          postSignal('heartbeat', '', mutedRef.current ? 'muted' : 'live')
        }
      }, 5000)

      // Signaling poll every 1 s
      sigPollingRef.current = setInterval(pollSignaling, 1000)

    } catch (e) {
      const msg =
        e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
          ? 'Microphone permission denied — please allow mic access in your browser.'
          : `Could not join voice: ${e.message}`
      setVoiceError(msg)
      inVoiceRef.current   = false
      voiceRoomRef.current = null
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    } finally {
      setVoiceConnecting(false)
    }
  }, [postSignal, initiateOffer, pollSignaling])

  /** Tear down all voice resources (no state updates) */
  const teardownVoice = useCallback(() => {
    clearInterval(heartbeatRef.current)
    clearInterval(sigPollingRef.current)
    Object.values(peerConnsRef.current).forEach(pc => { try { pc.close() } catch {} })
    peerConnsRef.current   = {}
    screenSendersRef.current = {}
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    inVoiceRef.current   = false
    mutedRef.current     = false
    sharingRef.current   = false
    voiceRoomRef.current = null
    lastSigAtRef.current = 0
  }, [])

  /** Leave voice channel (sends leave signal + cleans up) */
  const leaveVoice = useCallback(async () => {
    postSignal('leave', '', '').catch(() => {})
    teardownVoice()
    setInVoice(false)
    setMuted(false)
    setSharing(false)
    setVoiceRoom(null)
    setVoiceParticipants([])
    setRemoteStreams({})
    setScreenStreams({})
    setVoiceError('')
  }, [postSignal, teardownVoice])

  /** Toggle mic mute */
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    mutedRef.current = !track.enabled
    setMuted(!track.enabled)
  }, [])

  /** Stop screen sharing (extracted for reuse in 'ended' event handler) */
  const stopSharing = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    Object.entries(peerConnsRef.current).forEach(([peerId, pc]) => {
      const sender = screenSendersRef.current[peerId]
      if (sender) { try { pc.removeTrack(sender) } catch {} }
      delete screenSendersRef.current[peerId]
    })
    sharingRef.current = false
    setSharing(false)
  }, [])

  /** Toggle screen share */
  const toggleScreenShare = useCallback(async () => {
    if (sharingRef.current) {
      stopSharing()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenStreamRef.current = stream
      sharingRef.current = true

      const videoTrack = stream.getVideoTracks()[0]

      // Add video track to every active peer connection
      for (const [peerId, pc] of Object.entries(peerConnsRef.current)) {
        const sender = pc.addTrack(videoTrack, stream)
        screenSendersRef.current[peerId] = sender
        // If I'm the lower-ID offerer, onnegotiationneeded fires and re-negotiates automatically
        // For the higher-ID (non-offerer) side, we need to trigger renegotiation manually:
        if (myVoiceIdRef.current >= peerId) {
          // Wait for the lower-ID peer to send a new offer (nothing to do here)
          // They will receive onnegotiationneeded on their side
        }
      }

      setSharing(true)

      // If user stops sharing via browser UI (native "Stop sharing" button)
      videoTrack.addEventListener('ended', () => stopSharing())
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        setVoiceError('Could not start screen share: ' + e.message)
      }
    }
  }, [stopSharing])

  /* ── beforeunload: reliable leave via sendBeacon ── */
  useEffect(() => {
    const onUnload = () => {
      if (!inVoiceRef.current || !voiceRoomRef.current) return
      navigator.sendBeacon(
        '/api/signal',
        new Blob([JSON.stringify({
          roomId:       voiceRoomRef.current,
          fromUserId:   myVoiceIdRef.current,
          fromUsername: displayNameRef.current,
          toUserId:     '',
          type:         'leave',
          data:         '',
        })], { type: 'application/json' })
      )
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (inVoiceRef.current) teardownVoice()
    }
  }, [teardownVoice])

  /* ════════════ CHAT LOGIC ════════════ */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = useCallback(async (channel, since) => {
    try {
      const r = await fetch(`/api/community?channel=${encodeURIComponent(channel)}&since=${since}`)
      if (!r.ok) throw new Error(r.status)
      const { messages: newMsgs } = await r.json()

      setReady(true)

      if (since === 0) {
        messagesRef.current = newMsgs
        setMessages(newMsgs)
      } else if (newMsgs.length > 0) {
        const ids   = new Set(messagesRef.current.map(m => m.id))
        const toAdd = newMsgs.filter(m => !ids.has(m.id))
        if (toAdd.length) {
          messagesRef.current = [...messagesRef.current, ...toAdd]
          setMessages([...messagesRef.current])
        }
      }

      if (newMsgs.length > 0) {
        lastFetchedAtRef.current = Math.max(...newMsgs.map(m => m.createdAt))
      }
    } catch {
      if (since === 0) setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!displayName) return
    activeChannelRef.current = activeChannel
    messagesRef.current      = []
    lastFetchedAtRef.current = 0
    setMessages([])
    setReady(null)
    fetchMessages(activeChannel, 0)
    const id = setInterval(
      () => fetchMessages(activeChannelRef.current, lastFetchedAtRef.current),
      2000
    )
    return () => clearInterval(id)
  }, [displayName, activeChannel, fetchMessages])

  useEffect(() => {
    fetch('/api/community?channel=general&since=0')
      .then(r => r.ok ? setReady(true) : setReady(false))
      .catch(() => setReady(false))
  }, [])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !displayName || sending || !ready) return
    setSendError('')
    setSending(true)
    const userId = displayName.toLowerCase().replace(/\s+/g, '_') + '_' + hashColor(displayName).slice(1)
    try {
      const r = await fetch('/api/community', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, username: displayName, userId, channel: activeChannel }),
      })
      if (r.status === 422) {
        setSendError('⚠️ Your message was not sent — it contains inappropriate language.')
        return
      }
      if (!r.ok) throw new Error(r.status)
      setInput('')
      await fetchMessages(activeChannel, lastFetchedAtRef.current)
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const onlineUsers = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000
    const seen   = new Set()
    if (displayName) seen.add(displayName)
    messages.filter(m => m.createdAt > cutoff).forEach(m => seen.add(m.username))
    return [...seen]
  }, [messages, displayName])

  const grouped = useMemo(() => messages.reduce((acc, msg, i) => {
    const prev   = messages[i - 1]
    const isSame = prev && prev.username === msg.username && (msg.createdAt - prev.createdAt) < 180_000
    acc.push({ ...msg, isFirst: !isSame })
    return acc
  }, []), [messages])

  const activeCh    = CHANNELS.find(c => c.id === activeChannel) ?? CHANNELS[0]
  const activeVRoom = VOICE_ROOMS.find(r => r.id === voiceRoom)

  // Screen-share streams from remote peers
  const remoteScreens = Object.entries(screenStreams).filter(([, s]) => s?.getVideoTracks().length > 0)

  /* ── Sidebar section label style ── */
  const secLabel = {
    padding: '16px 8px 4px 12px',
    fontSize: '0.68rem', fontWeight: 700, color: '#444',
    textTransform: 'uppercase', letterSpacing: '0.09em',
  }

  /* ════════════ RENDER ════════════ */
  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 140px)',
      margin: '-24px', overflow: 'hidden', position: 'relative',
      background: '#161616',
    }}>

      {/* Hidden audio for each remote peer */}
      {Object.entries(remoteStreams).map(([uid, stream]) => (
        <RemoteAudio key={uid} stream={stream} />
      ))}

      {/* Name modal */}
      {!displayName && (
        <NameModal onSave={name => { localStorage.setItem('ft-community-name', name); setDisplayName(name) }} />
      )}

      {/* ════════ SIDEBAR ════════ */}
      <div style={{
        width: 240, flexShrink: 0,
        background: '#1A1A1A', borderRight: '1px solid #232323',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Server header */}
        <div style={{
          height: 52, padding: '0 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #232323', background: '#1E1E1E',
        }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>✝</span>
          <span style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>
            Covenant Trader
          </span>
        </div>

        {/* Scrollable channel + user list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>

          {/* ── Text channels ── */}
          <div style={secLabel}>Channels</div>

          {CHANNELS.map(ch => {
            const isActive = ch.id === activeChannel
            return (
              <button
                key={ch.id} onClick={() => setActiveChannel(ch.id)}
                style={{
                  width: 'calc(100% - 8px)', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px 7px 12px', border: 'none', cursor: 'pointer',
                  borderRadius: 6, margin: '1px 4px',
                  background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                  transition: 'background 0.1s', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <Hash size={15} color={isActive ? '#3B82F6' : '#444'} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ color: isActive ? '#3B82F6' : '#666', fontSize: '0.88rem', fontWeight: isActive ? 600 : 400, transition: 'color 0.1s' }}>
                  {ch.label}
                </span>
              </button>
            )
          })}

          {/* ── Voice channels ── */}
          <div style={{ ...secLabel, marginTop: 14 }}>Voice Channels</div>

          {VOICE_ROOMS.map(room => {
            const active      = voiceRoom === room.id
            const roomPeers   = active ? voiceParticipants : []
            const peerCount   = roomPeers.length

            return (
              <div key={room.id}>
                {/* Room button */}
                <button
                  onClick={() => {
                    if (!displayName || voiceConnecting) return
                    if (active) return  // already in room
                    if (inVoice) leaveVoice().then(() => joinVoice(room.id))
                    else joinVoice(room.id)
                  }}
                  style={{
                    width: 'calc(100% - 8px)', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px 7px 12px', border: 'none',
                    cursor: displayName && !voiceConnecting ? 'pointer' : 'default',
                    borderRadius: 6, margin: '1px 4px',
                    background: active ? 'rgba(76,175,125,0.12)' : 'transparent',
                    transition: 'background 0.1s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <Volume2 size={15} color={active ? '#4CAF7D' : '#444'} style={{ flexShrink: 0 }} />
                  <span style={{ color: active ? '#4CAF7D' : '#666', fontSize: '0.88rem', fontWeight: active ? 600 : 400, flex: 1, transition: 'color 0.1s' }}>
                    {room.label}
                  </span>
                  {voiceConnecting && !active && (
                    <span style={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>connecting…</span>
                  )}
                  {peerCount > 0 && (
                    <span style={{
                      color: '#4CAF7D', fontSize: '0.68rem', fontWeight: 700,
                      background: 'rgba(76,175,125,0.15)', borderRadius: 4, padding: '1px 5px',
                    }}>
                      {peerCount}
                    </span>
                  )}
                </button>

                {/* Participant list */}
                {active && roomPeers.map(p => (
                  <div key={p.userId} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 8px 4px 28px', margin: '0 4px',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar name={p.username} size={22} />
                      <div style={{
                        position: 'absolute', bottom: -1, right: -1,
                        width: 9, height: 9, borderRadius: '50%',
                        background: p.muted ? '#555' : '#4CAF7D',
                        border: '1.5px solid #1A1A1A',
                      }} />
                    </div>
                    <span style={{
                      color: p.userId === myVoiceIdRef.current ? '#3B82F6' : '#666',
                      fontSize: '0.78rem', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.username}
                      {p.userId === myVoiceIdRef.current && (
                        <span style={{ color: '#444', fontWeight: 400 }}> (you)</span>
                      )}
                    </span>
                    {p.muted
                      ? <MicOff size={11} color="#444" />
                      : <Mic    size={11} color="#4CAF7D" />
                    }
                  </div>
                ))}
              </div>
            )
          })}

          {/* ── Online users ── */}
          <div style={{ ...secLabel, marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={11} color="#444" />
            Online — {onlineUsers.length}
          </div>

          {onlineUsers.map(user => (
            <div key={user} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px 5px 12px', borderRadius: 6, margin: '1px 4px',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4CAF7D', boxShadow: '0 0 5px rgba(76,175,125,0.5)', flexShrink: 0,
              }} />
              <span style={{
                color: user === displayName ? '#3B82F6' : '#555',
                fontSize: '0.82rem', fontWeight: user === displayName ? 600 : 400,
              }}>
                {user}{user === displayName ? ' (you)' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* User footer */}
        {displayName && (
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #232323',
            background: '#161616', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Avatar name={displayName} size={30} />
            <span style={{
              color: '#A0A0A0', fontSize: '0.82rem', fontWeight: 600,
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
            <button
              onClick={() => {
                if (inVoice) leaveVoice()
                localStorage.removeItem('ft-community-name')
                setDisplayName('')
              }}
              title="Change name"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#333', flexShrink: 0, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E05252'}
              onMouseLeave={e => e.currentTarget.style.color = '#333'}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ════════ MAIN AREA ════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Channel header */}
        <div style={{
          height: 52, padding: '0 20px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#1A1A1A', borderBottom: '1px solid #232323',
        }}>
          <Hash size={16} color="#3B82F6" strokeWidth={2.5} />
          <span style={{ color: '#F5F5F5', fontWeight: 700, fontFamily: 'Poppins, sans-serif', fontSize: '0.92rem' }}>
            {activeCh.label}
          </span>
          <div style={{ width: 1, height: 16, background: '#2A2A2A', margin: '0 2px' }} />
          <span style={{ color: '#444', fontSize: '0.78rem' }}>{activeCh.desc}</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: ready === true ? '#4CAF7D' : ready === false ? '#E05252' : '#555',
              boxShadow: ready === true ? '0 0 5px rgba(76,175,125,0.5)' : 'none',
            }} />
            <span style={{ color: '#333', fontSize: '0.72rem' }}>
              {ready === true ? 'live' : ready === false ? 'offline' : 'connecting…'}
            </span>
          </div>
        </div>

        {/* Remote screen-share panel */}
        {remoteScreens.length > 0 && (
          <div style={{
            background: '#0D0D0D', borderBottom: '1px solid #232323',
            padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0,
          }}>
            {remoteScreens.map(([uid, stream]) => {
              const peer = voiceParticipants.find(p => p.userId === uid)
              return (
                <ScreenVideo
                  key={uid}
                  stream={stream}
                  label={peer?.username ?? 'Sharing'}
                />
              )
            })}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }}>

          {ready === null && (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#333', fontSize: '0.85rem' }}>
              Connecting to community…
            </div>
          )}

          {ready === false && (
            <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: '2.5rem' }}>🔥</div>
              <p style={{ color: '#555', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                Community is offline. Check back in a moment.
              </p>
              <button
                onClick={() => fetchMessages(activeChannel, 0)}
                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          )}

          {ready === true && (
            <>
              <ChannelWelcome channel={activeChannel} />

              {grouped.length === 0 && displayName && (
                <div style={{ padding: '20px 24px', color: '#333', fontSize: '0.85rem', textAlign: 'center' }}>
                  No messages yet — be the first!
                </div>
              )}

              {grouped.map(msg => {
                const isMe  = msg.username === displayName
                const color = hashColor(msg.username)
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex', gap: 14,
                      padding: msg.isFirst ? '12px 20px 2px' : '2px 20px 2px',
                      background: 'transparent', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 34, flexShrink: 0 }}>
                      {msg.isFirst
                        ? <Avatar name={msg.username} size={34} />
                        : <span style={{ display: 'block', width: 34, height: 1 }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {msg.isFirst && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                          <span style={{ color: isMe ? '#3B82F6' : color, fontWeight: 700, fontSize: '0.88rem' }}>
                            {msg.username}
                            {isMe && <span style={{ color: '#3A3A3A', fontWeight: 400, fontSize: '0.72rem' }}> (you)</span>}
                          </span>
                          <span style={{ color: '#2E2E2E', fontSize: '0.7rem' }}>{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <p style={{
                        color: '#C8C8C8', fontSize: '0.88rem', lineHeight: 1.55,
                        margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      }}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          <div ref={bottomRef} style={{ height: 8 }} />
        </div>

        {/* ── Voice controls bar (shown when in voice channel) ── */}
        {inVoice && (
          <div style={{
            padding: '10px 16px', background: '#181818',
            borderTop: '1px solid #2A2A2A',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4CAF7D', boxShadow: '0 0 6px rgba(76,175,125,0.7)', flexShrink: 0,
              }} />
              <span style={{ color: '#4CAF7D', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {activeVRoom?.label ?? voiceRoom}
              </span>
              <span style={{ color: '#3A3A3A', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                · {voiceParticipants.length} {voiceParticipants.length === 1 ? 'person' : 'people'}
              </span>
              {sharing && (
                <span style={{
                  background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)',
                  color: '#4CAF7D', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em',
                  padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                }}>
                  SHARING SCREEN
                </span>
              )}
            </div>

            {/* Mute / Unmute */}
            <button
              onClick={toggleMute}
              title={muted ? 'Unmute microphone' : 'Mute microphone'}
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: muted ? 'rgba(224,82,82,0.15)' : 'rgba(76,175,125,0.1)',
                border: `1px solid ${muted ? 'rgba(224,82,82,0.35)' : 'rgba(76,175,125,0.3)'}`,
                color: muted ? '#E05252' : '#4CAF7D',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {muted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            {/* Screen share */}
            <button
              onClick={toggleScreenShare}
              title={sharing ? 'Stop sharing screen' : 'Share your screen'}
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: sharing ? 'rgba(76,175,125,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sharing ? 'rgba(76,175,125,0.45)' : '#252525'}`,
                color: sharing ? '#4CAF7D' : '#555',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = sharing ? '#4CAF7D' : '#888' }}
              onMouseLeave={e => { e.currentTarget.style.color = sharing ? '#4CAF7D' : '#555' }}
            >
              {sharing ? <ScreenShareOff size={15} /> : <ScreenShare size={15} />}
            </button>

            {/* Leave */}
            <button
              onClick={leaveVoice}
              title="Leave voice channel"
              style={{
                height: 36, padding: '0 14px', borderRadius: 8, flexShrink: 0,
                background: 'rgba(224,82,82,0.1)',
                border: '1px solid rgba(224,82,82,0.25)',
                color: '#E05252', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '0.78rem', fontWeight: 700,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.1)'}
            >
              <PhoneOff size={13} />
              Leave
            </button>
          </div>
        )}

        {/* Voice error banner */}
        {voiceError && (
          <div style={{
            padding: '8px 16px', flexShrink: 0,
            background: 'rgba(224,82,82,0.06)', borderTop: '1px solid rgba(224,82,82,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span style={{ color: '#E05252', fontSize: '0.78rem', lineHeight: 1.4 }}>⚠️ {voiceError}</span>
            <button
              onClick={() => setVoiceError('')}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Text input ── */}
        <div style={{
          padding: '12px 16px 14px', background: '#1A1A1A',
          borderTop: '1px solid #232323', flexShrink: 0,
        }}>
          <div
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              background: '#242424', border: '1px solid #2E2E2E',
              borderRadius: 10, padding: '10px 14px', transition: 'border-color 0.15s',
            }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'}
            onBlurCapture={e  => e.currentTarget.style.borderColor = '#2E2E2E'}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); if (sendError) setSendError('') }}
              onKeyDown={handleKey}
              placeholder={displayName ? `Message #${activeCh.label}…` : 'Set a display name to chat'}
              disabled={!displayName || sending || !ready}
              rows={1}
              maxLength={1000}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#E0E0E0', fontSize: '0.88rem', resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflow: 'auto',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !displayName || sending || !ready}
              style={{
                background:  (input.trim() && displayName && ready) ? '#3B82F6' : 'transparent',
                border:      `1px solid ${(input.trim() && displayName && ready) ? '#3B82F6' : '#2A2A2A'}`,
                borderRadius: 8, padding: '7px 10px',
                cursor:  (input.trim() && displayName && ready) ? 'pointer' : 'default',
                color:   (input.trim() && displayName && ready) ? '#1A1A1A' : '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <Send size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, paddingLeft: 2 }}>
            <span style={{ color: '#232323', fontSize: '0.67rem' }}>Enter to send · Shift+Enter for new line</span>
            <span style={{ color: input.length > 900 ? '#E05252' : '#232323', fontSize: '0.67rem' }}>
              {input.length}/1000
            </span>
          </div>

          {sendError && (
            <div style={{
              marginTop: 6, padding: '7px 12px', borderRadius: 7,
              background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)',
              color: '#E05252', fontSize: '0.78rem', lineHeight: 1.4,
            }}>
              {sendError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
