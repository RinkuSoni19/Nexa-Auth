export interface SendOtpResult {
  success: boolean;
  realEmailSent?: boolean;
  message?: string;
  error?: string;
}

const configuredMailerUrl = import.meta.env.VITE_MAILER_URL?.trim();

function getMailerEndpoints(path: 'send-otp'|'verify-otp'): string[] {
  if (configuredMailerUrl) {
    return [
      `${configuredMailerUrl.replace(/\/$/, '')}/api/${path}`,
      `http://192.168.31.201:3001/api/${path}`,
      `http://localhost:3001/api/${path}`,
    ].filter((endpoint, index, endpoints) => endpoints.indexOf(endpoint) === index);
  }
  return [
    `http://192.168.31.201:3001/api/${path}`,
    `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api/${path}`,
    `http://localhost:3001/api/${path}`,
  ].filter((endpoint, index, endpoints) => endpoints.indexOf(endpoint) === index);
}

export async function sendEmailOtp(email: string, name?: string): Promise<SendOtpResult> {
  for (const endpoint of getMailerEndpoints('send-otp')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok) {
        return {
          success: true,
          realEmailSent: Boolean(data.realEmailSent),
          message: data.realEmailSent
            ? `Security code delivered to ${email} inbox!`
            : `Code delivery requested for ${email}`,
        };
      }
      return { success: false, realEmailSent: false, error: data.error || 'Could not send OTP' };
    } catch {
      // Try next endpoint or fallback
    }
  }

  return {
    success: false,
    realEmailSent: false,
    error: 'Mailer is unreachable. Start the mailer server.',
  };
}

export async function verifyEmailOtp(email: string, otp: string): Promise<SendOtpResult> {
  for (const endpoint of getMailerEndpoints('verify-otp')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      return {
        success: response.ok,
        realEmailSent: true,
        message: response.ok ? 'Email verified successfully' : undefined,
        error: response.ok ? undefined : data.error,
      };
    } catch {
      // Try the next endpoint.
    }
  }
  return { success: false, realEmailSent: false, error: 'Verification server is unreachable' };
}
