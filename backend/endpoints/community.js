/**
 * api/community.js — Vercel serverless function
 * Multi-channel community chat, backed by Supabase (table: community_messages).
 * Migrated off Firestore — same request/response contract as before.
 */
import { supabaseAdmin, supabaseConfigured } from './_lib/supabase-admin.js'

/* ── Moderation ──────────────────────────────────────────────── */
const BANNED = [
  'fuck','shit','ass','asshole','bitch','cunt','dick','pussy','cock','bastard',
  'damn','hell','piss','crap','bollocks','wank','twat','slut','whore','nigger',
  'nigga','faggot','fag','retard','spastic','kike','chink','wetback','spic',
  'gook','dyke','tranny','rape','kill yourself','kys','suicide',
  'motherfucker','motherfucking','fucking','bullshit','horseshit',
  'jackass','dumbass','smartass','dipshit','shithead','asshat',
  'douchebag','douche','prick','jerk off','jerkoff',
]

const MOD_RE = new RegExp(
  '(?:^|[\\s\\W])(' + BANNED.map(w => w.replace(/[-\s]/g, '[\\s\\-_*.]+')).join('|') + ')(?:[\\s\\W]|$)',
  'i'
)

function isInappropriate (text = '') {
  const normalized = text
    .toLowerCase()
    .replace(/@/g, 'a').replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i').replace(/!/g, 'i')
    .replace(/0/g, 'o')
    .replace(/\$/g, 's').replace(/5/g, 's')
    .replace(/\+/g, 't')
  return MOD_RE.test(normalized)
}

const toMsg = (r) => ({
  id:        r.id,
  text:      r.text,
  username:  r.username,
  userId:    r.user_id,
  channel:   r.channel,
  createdAt: Number(r.created_at_ms),
})

/* ── Handler ─────────────────────────────────────────────────── */
export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!supabaseConfigured) return res.status(503).json({ error: 'Chat is not configured' })

  try {
    /* GET /api/community?channel=general&since=0
       Returns up to 100 messages for the channel newer than `since` (ms). */
    if (req.method === 'GET') {
      const channel = String(req.query.channel || 'general').slice(0, 50)
      const since   = parseInt(req.query.since  || '0')

      const { data, error } = await supabaseAdmin
        .from('community_messages')
        .select('id, text, username, user_id, channel, created_at_ms')
        .eq('channel', channel)
        .gt('created_at_ms', since)
        .order('created_at_ms', { ascending: false })
        .limit(300)

      if (error) return res.status(500).json({ error: error.message })

      const rows = data || []

      // Best-effort purge of any stored messages that contain banned words
      const dirty = rows.filter(r => isInappropriate(r.text))
      if (dirty.length) {
        supabaseAdmin.from('community_messages').delete().in('id', dirty.map(r => r.id)).then(() => {}, () => {})
      }

      const messages = rows
        .filter(r => !isInappropriate(r.text))
        .map(toMsg)
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-100)

      return res.status(200).json({ messages })
    }

    /* POST /api/community  body: { text, username, userId, channel } */
    if (req.method === 'POST') {
      const { text, username, userId, channel = 'general' } = req.body || {}
      if (!text?.trim() || !username?.trim())
        return res.status(400).json({ error: 'text and username are required' })

      if (isInappropriate(text))
        return res.status(422).json({ error: 'moderated', message: 'Your message contains inappropriate language and was not sent.' })

      const { data, error } = await supabaseAdmin
        .from('community_messages')
        .insert({
          text:          String(text).slice(0, 1000),
          username:      String(username).slice(0, 50),
          user_id:       String(userId || '').slice(0, 128),
          channel:       String(channel).slice(0, 50),
          created_at_ms: Date.now(),
        })
        .select('id')
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ id: data.id })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[community]', err.message)
    res.status(500).json({ error: err.message })
  }
}
