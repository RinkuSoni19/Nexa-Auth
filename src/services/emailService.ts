export interface SendOtpResult {
  success: boolean;
  realEmailSent?: boolean;
  message?: string;
  error?: string;
}

// Mailer endpoint served on the same origin (port 3000)
const MAILER_ENDPOINTS = [
  '/api/send-otp',
];

export async function sendEmailOtp(email: string, otp: string, name?: string): Promise<SendOtpResult> {
  for (const endpoint of MAILER_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, name }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          realEmailSent: Boolean(data.realEmailSent),
          message: data.realEmailSent
            ? `Security code delivered to ${email} inbox!`
            : `Code generated for ${email}`,
        };
      }
    } catch {
      // Try next endpoint or fallback
    }
  }

  // Graceful fallback if mailer is unreachable
  return {
    success: true,
    realEmailSent: false,
    message: `Verification code ready for ${email}`,
  };
}
