/**
 * api/signal.js — Vercel serverless function
 * WebRTC signaling for voice channels, backed by Supabase (table: voice_signals).
 * Migrated off Firestore — same request/response contract as before.
 * Signal TTL: 30 seconds. Types: join | leave | heartbeat | offer | answer
 */
import { supabaseAdmin, supabaseConfigured } from './_lib/supabase-admin.js'

const toSignal = (r) => ({
  id:           r.id,
  roomId:       r.room_id,
  fromUserId:   r.from_user_id,
  fromUsername: r.from_username,
  toUserId:     r.to_user_id,
  type:         r.type,
  data:         r.data,
  createdAt:    Number(r.created_at_ms),
})

export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!supabaseConfigured) return res.status(503).json({ error: 'Voice is not configured' })

  try {
    /* GET /api/signal?room=X&userId=Y&since=Z
       Returns signals for userId (directed or broadcast) after `since`,
       plus current participants (heartbeat in the last 15s). */
    if (req.method === 'GET') {
      const roomId = String(req.query.room   || 'general-voice').slice(0, 50)
      const since  = parseInt(req.query.since || '0')
      const userId = String(req.query.userId || '').slice(0, 128)

      const now   = Date.now()
      const ttl   = now - 30_000   // 30s signal TTL
      const hbWin = now - 15_000   // 15s presence window

      const { data, error } = await supabaseAdmin
        .from('voice_signals')
        .select('id, room_id, from_user_id, from_username, to_user_id, type, data, created_at_ms')
        .eq('room_id', roomId)
        .gte('created_at_ms', ttl)
        .order('created_at_ms', { ascending: false })
        .limit(400)

      if (error) return res.status(500).json({ error: error.message })

      // Best-effort purge of expired signals (all rooms)
      supabaseAdmin.from('voice_signals').delete().lt('created_at_ms', ttl).then(() => {}, () => {})

      const fresh = (data || []).map(toSignal)

      const signals = fresh
        .filter(s => s.createdAt > since && (s.toUserId === userId || !s.toUserId))
        .sort((a, b) => a.createdAt - b.createdAt)

      // Participants: latest heartbeat per user in the last 15s
      const peerMap = new Map()
      fresh
        .filter(s => s.type === 'heartbeat' && s.createdAt > hbWin)
        .forEach(s => {
          const existing = peerMap.get(s.fromUserId)
          if (!existing || s.createdAt > existing.createdAt) {
            peerMap.set(s.fromUserId, {
              userId:    s.fromUserId,
              username:  s.fromUsername,
              muted:     s.data === 'muted',
              createdAt: s.createdAt,
            })
          }
        })
      const participants = [...peerMap.values()].map(({ createdAt, ...p }) => p)

      return res.status(200).json({ signals, participants })
    }

    /* POST /api/signal
       Body: { roomId, fromUserId, fromUsername, toUserId?, type, data? } */
    if (req.method === 'POST') {
      let body = req.body || {}
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'invalid JSON' }) }
      }

      const { roomId, fromUserId, fromUsername, toUserId = '', type, data: sigData = '' } = body
      if (!roomId || !fromUserId || !type)
        return res.status(400).json({ error: 'roomId, fromUserId, type are required' })

      const VALID_TYPES = new Set(['join', 'leave', 'heartbeat', 'offer', 'answer'])
      if (!VALID_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' })

      const { data, error } = await supabaseAdmin
        .from('voice_signals')
        .insert({
          room_id:       String(roomId).slice(0, 50),
          from_user_id:  String(fromUserId).slice(0, 128),
          from_username: String(fromUsername || '').slice(0, 50),
          to_user_id:    String(toUserId || '').slice(0, 128),
          type:          String(type).slice(0, 20),
          data:          String(sigData || '').slice(0, 100000),
          created_at_ms: Date.now(),
        })
        .select('id')
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ id: data.id })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[signal]', err.message)
    res.status(500).json({ error: err.message })
  }
}
