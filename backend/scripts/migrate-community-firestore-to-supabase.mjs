/**
 * One-time backfill: copy community chat history from the old Firestore
 * `community` collection into Supabase `public.community_messages`.
 *
 * Voice signals are ephemeral (30s TTL) and intentionally NOT migrated.
 *
 * Requires (env or a .env.local you source first):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   service-account-key.json in the repo root (old Firebase service account)
 *
 * Run once, then you can revoke the Firebase service account:
 *   node scripts/migrate-community-firestore-to-supabase.mjs
 */
import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const PROJECT_ID = 'faithtrader-fe3e7'
const DATABASE = 'default'
const COLLECTION = 'community'
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents`

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const sa = JSON.parse(readFileSync('service-account-key.json', 'utf8'))

async function getAccessToken () {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  })).toString('base64url')
  const toSign = `${header}.${payload}`
  const signer = createSign('RSA-SHA256'); signer.update(toSign)
  const jwt = `${toSign}.${signer.sign(sa.private_key, 'base64url')}`
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await r.json()
  if (!data.access_token) throw new Error('JWT exchange failed: ' + JSON.stringify(data))
  return data.access_token
}

const token = await getAccessToken()

// Read all documents from the Firestore collection (paginated)
let rows = []
let pageToken = ''
do {
  const url = `${FS_BASE}/${COLLECTION}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await r.json()
  for (const doc of data.documents || []) {
    const f = doc.fields || {}
    rows.push({
      text:          f.text?.stringValue ?? '',
      username:      f.username?.stringValue ?? 'Unknown',
      user_id:       f.userId?.stringValue ?? '',
      channel:       f.channel?.stringValue ?? 'general',
      created_at_ms: parseInt(f.createdAt?.integerValue ?? '0') || Date.now(),
    })
  }
  pageToken = data.nextPageToken || ''
} while (pageToken)

console.log(`Read ${rows.length} messages from Firestore.`)

// Insert in batches
let inserted = 0
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500)
  const { error } = await supabase.from('community_messages').insert(batch)
  if (error) { console.error('Insert error:', error.message); process.exit(1) }
  inserted += batch.length
  console.log(`  inserted ${inserted}/${rows.length}`)
}

console.log(`✅ Done — ${inserted} messages migrated to Supabase.`)
