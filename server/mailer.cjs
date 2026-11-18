const http = require('http');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const CONFIG_FILE = path.join(__dirname, 'email-config.json');

// Default config template
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading email-config.json:', e);
    }
  }
  return {
    provider: 'gmail', // 'gmail', 'resend', or 'smtp'
    gmailUser: process.env.GMAIL_USER || '',
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
  };
}

function getTransporter() {
  const config = loadConfig();
  const user = config.gmailUser || config.smtp?.auth?.user;
  const pass = config.gmailAppPassword || config.smtp?.auth?.pass;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp?.host || 'smtp.gmail.com',
    port: config.smtp?.port || 465,
    secure: true,
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // Google app passwords are 16 chars with spaces
    },
  });
}

function generateEmailHtml(name, otp) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030705; color: #ffffff; padding: 24px; margin: 0; }
      .card { background-color: #09150e; border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 16px; padding: 32px; max-width: 480px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0, 255, 136, 0.15); }
      .header { text-align: center; margin-bottom: 24px; }
      .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
      .nexa { color: #ff2e4d; }
      .auth { color: #00ff88; }
      .badge { display: inline-block; padding: 4px 12px; background: rgba(0, 255, 136, 0.15); border: 1px solid #00ff88; border-radius: 20px; color: #00ff88; font-size: 11px; font-weight: 700; margin-top: 8px; text-transform: uppercase; letter-spacing: 1.5px; }
      .greeting { font-size: 16px; color: #d1d5db; margin-bottom: 16px; }
      .otp-box { background: #040c07; border: 2px dashed #00ff88; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
      .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #00ff88; text-shadow: 0 0 14px rgba(0, 255, 136, 0.5); }
      .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 24px; line-height: 1.5; }
      .warning { color: #f87171; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="logo-text"><span class="nexa">Nexa</span><span class="auth">Auth</span></div>
        <div class="badge">Google 2FA Security Alert</div>
      </div>
      <p class="greeting">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
        Use the 6-digit One-Time Password (OTP) below to verify your Google identity and access your NexaAuth Security Vault:
      </p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p style="color: #9ca3af; font-size: 13px;">
        ⏱ This code is valid for <strong>5 minutes</strong>. <span class="warning">Do not share this OTP with anyone.</span>
      </p>
      <div class="footer">
        NexaAuth 2FA Security System • E2EE AES-256 Protection<br/>
        Project ID: nexa-auth-515111
      </div>
    </div>
  </body>
  </html>
  `;
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/api/health' && req.method === 'GET') {
    const config = loadConfig();
    const hasConfig = Boolean(
      (config.gmailUser && config.gmailAppPassword) ||
      config.resendApiKey ||
      (config.smtp?.auth?.user && config.smtp?.auth?.pass)
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', configured: hasConfig }));
    return;
  }

  // Save email config endpoint
  if (req.url === '/api/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const current = loadConfig();
        const updated = { ...current, ...data };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Email config updated successfully' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Send OTP endpoint
  if (req.url === '/api/send-otp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, otp, name } = JSON.parse(body);

        if (!email || !otp) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'email and otp are required' }));
          return;
        }

        console.log(`[Mailer] Request to send OTP ${otp} to ${email} (${name || 'User'})`);
        const config = loadConfig();

        // 1. Try Resend if configured
        if (config.resendApiKey) {
          try {
            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.resendApiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'NexaAuth Security <onboarding@resend.dev>',
                to: email,
                subject: `${otp} is your NexaAuth Google 2FA verification code`,
                html: generateEmailHtml(name, otp),
              }),
            });
            const resendData = await resendRes.json();
            if (resendRes.ok) {
              console.log(`[Mailer] Resend delivered email to ${email}:`, resendData.id);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                realEmailSent: true,
                provider: 'resend',
                email,
              }));
              return;
            } else {
              console.error('[Mailer] Resend API error:', resendData);
            }
          } catch (resendErr) {
            console.error('[Mailer] Resend fetch failed:', resendErr);
          }
        }

        // 2. Try Gmail SMTP / Nodemailer
        const mailClient = getTransporter();

        if (mailClient) {
          const sender = config.gmailUser || config.smtp?.auth?.user;
          const mailOptions = {
            from: `"NexaAuth Security" <${sender}>`,
            to: email,
            subject: `${otp} is your NexaAuth Google 2FA verification code`,
            text: `Your NexaAuth verification OTP code is: ${otp}. It is valid for 5 minutes. Do not share this code with anyone.`,
            html: generateEmailHtml(name, otp),
          };

          const info = await mailClient.sendMail(mailOptions);
          console.log(`[Mailer] Gmail SMTP email sent successfully to ${email}:`, info.messageId);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            realEmailSent: true,
            provider: 'gmail_smtp',
            messageId: info.messageId,
            email,
          }));
          return;
        }

        // 3. Fallback when SMTP is not configured yet
        console.warn(`[Mailer] Sender credentials missing in email-config.json. Simulated OTP for ${email}: ${otp}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          realEmailSent: false,
          simulated: true,
          otp,
          email,
          message: 'To deliver real emails to inbox, set gmailUser & gmailAppPassword in server/email-config.json',
        }));
      } catch (err) {
        console.error('[Mailer] Error sending email:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err.message,
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[NexaAuth Mailer] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[NexaAuth Mailer] Ready to accept POST /api/send-otp`);
});
