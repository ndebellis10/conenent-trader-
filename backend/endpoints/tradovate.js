export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, password, environment = 'live' } = req.body || {}

  if (!name || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const baseUrl = environment === 'demo'
    ? 'https://demo.tradovateapi.com/v1'
    : 'https://live.tradovateapi.com/v1'

  // Accept CID/Secret from the request body (user-provided) or fall back to env vars
  const cid = parseInt(req.body.cid || process.env.TRADOVATE_CID || '0', 10)
  const sec = req.body.sec || process.env.TRADOVATE_SEC || ''
  const appId = process.env.TRADOVATE_APP_ID || 'FaithTrader'

  const body = {
    name,
    password,
    appId,
    appVersion: '1.0',
    cid,
    sec,
    deviceId: `faithtrader-${name.replace(/[^a-z0-9]/gi, '')}`,
  }

  try {
    const resp = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await resp.json()

    if (data.errorText) {
      return res.status(401).json({ error: data.errorText })
    }
    if (!data.accessToken) {
      return res.status(401).json({ error: 'Invalid credentials — check your username and password' })
    }

    return res.status(200).json({
      accessToken: data.accessToken,
      expirationTime: data.expirationTime,
      userId: data.userId,
    })
  } catch (err) {
    console.error('Tradovate auth error:', err)
    return res.status(500).json({ error: 'Could not reach Tradovate. Try again.' })
  }
}
