export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, firstName } = req.body || {}
  if (!email || !firstName) return res.status(400).json({ error: 'email and firstName are required' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email service not configured' })

  const html = buildEmail(firstName)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Covenant Trader <onboarding@resend.dev>',
        to: [email],
        subject: `Welcome to Covenant Trader, ${firstName} — Your Journey Begins ✝️`,
        html,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(500).json({ error: data.message || 'Failed to send email' })
    }

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('Welcome email error:', err)
    return res.status(500).json({ error: 'Could not send welcome email' })
  }
}

function buildEmail(firstName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Covenant Trader</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F0;font-family:'Georgia',serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F4F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- ── Header bar ── -->
          <tr>
            <td style="background-color:#1A1A1A;padding:32px 48px;text-align:center;">
              <p style="margin:0 0 6px 0;color:#C9A84C;font-size:11px;font-family:Arial,sans-serif;letter-spacing:4px;text-transform:uppercase;font-weight:700;">FAITH TRADER</p>
              <p style="margin:0;color:#3A3A3A;font-size:11px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">Trade with Purpose. Grow in Faith.</p>
              <div style="width:40px;height:2px;background-color:#C9A84C;margin:16px auto 0;border-radius:2px;"></div>
            </td>
          </tr>

          <!-- ── Hero section ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1A1A1A 0%,#2A2218 100%);padding:48px 48px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#C9A84C;font-size:13px;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;">Welcome,</p>
              <h1 style="margin:0 0 16px 0;color:#F5F5F5;font-size:36px;font-family:Georgia,serif;font-weight:400;line-height:1.2;">${firstName}</h1>
              <p style="margin:0;color:#888888;font-size:15px;font-family:Arial,sans-serif;line-height:1.7;max-width:420px;margin:0 auto;">
                Your faith-driven trading journey starts today. You've joined a community that believes discipline, wisdom, and purpose are the true foundations of lasting success.
              </p>
            </td>
          </tr>

          <!-- ── Bible verse ── -->
          <tr>
            <td style="padding:40px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#FDF8EE;border-left:4px solid #C9A84C;border-radius:0 8px 8px 0;padding:24px 28px;">
                    <p style="margin:0 0 4px 0;color:#C9A84C;font-size:10px;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;font-weight:700;">✦ Scripture</p>
                    <p style="margin:8px 0 12px 0;color:#2A2218;font-size:17px;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
                      "For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."
                    </p>
                    <p style="margin:0;color:#C9A84C;font-size:13px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:1px;">— Jeremiah 29:11</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Welcome body ── -->
          <tr>
            <td style="padding:36px 48px 0;">
              <p style="margin:0 0 16px 0;color:#1A1A1A;font-size:16px;font-family:Georgia,serif;line-height:1.8;">
                Dear ${firstName},
              </p>
              <p style="margin:0 0 16px 0;color:#444444;font-size:15px;font-family:Arial,sans-serif;line-height:1.8;">
                We are honoured to welcome you to <strong style="color:#1A1A1A;">Covenant Trader</strong> — the professional trading journal designed for traders who understand that true mastery extends beyond charts and strategies into the realm of mindset, discipline, and faith.
              </p>
              <p style="margin:0 0 16px 0;color:#444444;font-size:15px;font-family:Arial,sans-serif;line-height:1.8;">
                Whether you are just beginning your trading journey or are a seasoned professional, Covenant Trader equips you with the tools to reflect, improve, and trade with unwavering conviction. Every trade you journal brings you one step closer to the trader God has called you to be.
              </p>
              <p style="margin:0;color:#444444;font-size:15px;font-family:Arial,sans-serif;line-height:1.8;">
                We believe that success in the markets is not accidental — it is the fruit of consistent effort, honest self-reflection, and a heart anchored in faith. Covenant Trader was built to be your trusted companion on that journey.
              </p>
            </td>
          </tr>

          <!-- ── Features section ── -->
          <tr>
            <td style="padding:36px 48px 0;">
              <p style="margin:0 0 20px 0;color:#1A1A1A;font-size:13px;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;font-weight:700;border-bottom:1px solid #EBEBEB;padding-bottom:12px;">What Awaits You</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${[
                  ['📋', 'Trade Journal', 'Log every trade with context — entry, exit, emotion, and intent. Build a record that reveals patterns and drives growth.'],
                  ['📊', 'Performance Analytics', 'Deep-dive reports across win rate, profit factor, drawdown, R-multiples, and psychological performance.'],
                  ['🧠', 'Execution Quality', 'Track whether you followed your plan, respected your stop, and sized correctly — then see the P&L impact of your discipline.'],
                  ['✝️', 'Faith Journal', 'Integrate scripture, prayer, and gratitude into your trading routine. Keep your anchor firm through every market condition.'],
                  ['👥', 'Community', 'Connect with fellow faith-driven traders in our general chat. Share insights, encourage one another, and grow together.'],
                  ['📈', 'Backtesting', 'Test your strategies against historical data, journal each backtest trade, and identify behavioral patterns before they cost you real money.'],
                ].map(([icon, title, desc]) => `
                  <tr>
                    <td style="padding:0 0 20px 0;vertical-align:top;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40" style="vertical-align:top;padding-top:2px;">
                            <span style="font-size:20px;">${icon}</span>
                          </td>
                          <td style="vertical-align:top;padding-left:12px;">
                            <p style="margin:0 0 4px 0;color:#1A1A1A;font-size:14px;font-family:Arial,sans-serif;font-weight:700;">${title}</p>
                            <p style="margin:0;color:#666666;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">${desc}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          <!-- ── CTA button ── -->
          <tr>
            <td style="padding:36px 48px 0;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#C9A84C;border-radius:10px;padding:0;">
                    <a href="https://faithtrader.app/login" style="display:inline-block;padding:16px 48px;color:#1A1A1A;font-size:15px;font-family:Arial,sans-serif;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                      Start Journaling Today →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0 0;color:#AAAAAA;font-size:12px;font-family:Arial,sans-serif;">
                Or visit <a href="https://faithtrader.app" style="color:#C9A84C;text-decoration:none;">faithtrader.app</a> anytime
              </p>
            </td>
          </tr>

          <!-- ── Closing verse ── -->
          <tr>
            <td style="padding:40px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#F9F9F9;border-radius:8px;padding:24px 28px;text-align:center;">
                    <p style="margin:0 0 10px 0;color:#AAAAAA;font-size:11px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">A Word for Your Journey</p>
                    <p style="margin:0 0 10px 0;color:#444444;font-size:14px;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
                      "Commit to the LORD whatever you do, and he will establish your plans."
                    </p>
                    <p style="margin:0;color:#C9A84C;font-size:12px;font-family:Arial,sans-serif;font-weight:700;">— Proverbs 16:3</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Sign-off ── -->
          <tr>
            <td style="padding:36px 48px 0;">
              <p style="margin:0 0 6px 0;color:#444444;font-size:15px;font-family:Arial,sans-serif;line-height:1.8;">With gratitude and purpose,</p>
              <p style="margin:0 0 4px 0;color:#1A1A1A;font-size:16px;font-family:Georgia,serif;font-weight:700;">The Covenant Trader Team</p>
              <p style="margin:0;color:#C9A84C;font-size:13px;font-family:Arial,sans-serif;font-style:italic;">Trade with Purpose. Grow in Faith.</p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background-color:#1A1A1A;padding:28px 48px;margin-top:40px;">
              <!-- gold line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr><td style="height:1px;background-color:#2A2A2A;"></td></tr>
              </table>
              <p style="margin:0 0 8px 0;color:#C9A84C;font-size:11px;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;font-weight:700;text-align:center;">FAITH TRADER</p>
              <p style="margin:0 0 16px 0;color:#444444;font-size:11px;font-family:Arial,sans-serif;text-align:center;">
                Professional Trading Journal for Faith-Driven Traders
              </p>
              <p style="margin:0;color:#3A3A3A;font-size:11px;font-family:Arial,sans-serif;line-height:1.8;text-align:center;">
                You received this email because you created an account at Covenant Trader.<br/>
                &copy; ${new Date().getFullYear()} Covenant Trader. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()
}
