import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

function nexauthMailerPlugin(): Plugin {
  const loadConfig = () => {
    const configFile = path.resolve(process.cwd(), 'server/email-config.json');
    if (fs.existsSync(configFile)) {
      try {
        return JSON.parse(fs.readFileSync(configFile, 'utf8'));
      } catch {
        // Ignore invalid local config
      }
    }
    return {
      provider: 'gmail',
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
  };

  const attachMiddleware = (middlewares: { use: (path: string, fn: (req: any, res: any, next: () => void) => void) => void }) => {
    middlewares.use('/api/health', (_req, res) => {
      const config = loadConfig();
      const hasConfig = Boolean(
        (config.gmailUser && config.gmailAppPassword) ||
        config.resendApiKey ||
        (config.smtp?.auth?.user && config.smtp?.auth?.pass)
      );
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', configured: hasConfig }));
    });

    middlewares.use('/api/send-otp', (req, res, next) => {
      if (req.method !== 'POST') {
        next();
        return;
      }

      let body = '';
      req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { email, otp, name } = JSON.parse(body || '{}');
          if (!email || !otp) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'email and otp are required' }));
            return;
          }

          const config = loadConfig();
          const user = config.gmailUser || config.smtp?.auth?.user || process.env.GMAIL_USER || process.env.SMTP_USER;
          const pass = config.gmailAppPassword || config.smtp?.auth?.pass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

          if (user && pass) {
            const transporter = nodemailer.createTransport({
              host: config.smtp?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
              port: config.smtp?.port || 465,
              secure: true,
              auth: {
                user: String(user).trim(),
                pass: String(pass).trim().replace(/\s+/g, ''),
              },
            });

            const info = await transporter.sendMail({
              from: `"NexaAuth Security" <${user}>`,
              to: email,
              subject: `${otp} is your NexaAuth Google 2FA verification code`,
              text: `Hello ${name || 'User'}, your NexaAuth verification OTP code is: ${otp}. It is valid for 5 minutes.`,
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              realEmailSent: true,
              provider: 'gmail_smtp',
              messageId: info.messageId,
              email,
            }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            realEmailSent: false,
            simulated: true,
            email,
          }));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : 'Failed to process OTP request',
          }));
        }
      });
    });
  };

  return {
    name: 'nexaauth-mailer-middleware',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nexauthMailerPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
