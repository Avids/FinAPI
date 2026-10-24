import { Resend } from "resend";

export interface SendApiKeyEmailParams {
  name: string;
  email: string;
  apiKey: string;
  dailyLimit: number;
  isExistingUser?: boolean;
}

export async function sendApiKeyEmail({
  name,
  email,
  apiKey,
  dailyLimit,
  isExistingUser = false,
}: SendApiKeyEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKeyEnv = process.env.RESEND_API_KEY;
  if (!apiKeyEnv) {
    console.warn("[Email] RESEND_API_KEY is not configured; skipping email dispatch.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(apiKeyEnv);
  const from = process.env.EMAIL_FROM || "FinAPI <onboarding@resend.dev>";
  const subject = isExistingUser
    ? "Your FinAPI Key (Recovered)"
    : "Welcome to FinAPI – Your API Key & Quick Start Guide";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="background-color: #0d1117; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px;">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #30363d; padding-bottom: 20px; margin-bottom: 24px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700;">FinAPI</h1>
      <p style="color: #8b949e; font-size: 14px; margin: 6px 0 0;">High-Performance SEC EDGAR Financial Data</p>
    </div>

    <!-- Greeting -->
    <p style="font-size: 15px; line-height: 1.6; color: #c9d1d9;">
      Hi <strong>${name}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #c9d1d9;">
      ${
        isExistingUser
          ? "Here is your requested FinAPI key."
          : `Welcome! Your free FinAPI account is active. You have <strong>${dailyLimit} requests per day</strong> (quota resets daily at 00:00 UTC).`
      }
    </p>

    <!-- API Key Box -->
    <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 18px; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; color: #8b949e; font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.5px; margin-bottom: 8px;">
        Your API Key
      </div>
      <div style="font-family: ui-monospace, Menlo, monospace; font-size: 15px; color: #58a6ff; word-break: break-all; font-weight: 600;">
        ${apiKey}
      </div>
    </div>

    <!-- Quick Start -->
    <h3 style="color: #ffffff; font-size: 15px; margin: 24px 0 10px;">Quick Start (curl)</h3>
    <pre style="background-color: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 12px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #7ee787; overflow-x: auto; margin: 0;">curl -H "x-api-key: ${apiKey}" \\
  "https://finapi2026.vercel.app/api/financials/AAPL?period=annual&concepts=Revenues,NetIncomeLoss"</pre>

    <!-- Quota info -->
    <div style="margin-top: 24px; padding: 14px; background-color: #1f242c; border-radius: 6px; border-left: 3px solid #238636;">
      <p style="margin: 0; font-size: 13px; color: #c9d1d9;">
        <strong>Daily Quota:</strong> ${dailyLimit} calls / day (Free tier)<br>
        <strong>Documentation:</strong> Explore 91 standardized concepts and ratios at <a href="https://finapi2026.vercel.app" style="color: #58a6ff;">finapi2026.vercel.app</a>.
      </p>
    </div>

    <!-- Playground Link -->
    <div style="margin-top: 28px; text-align: center;">
      <a href="https://finapi2026.vercel.app" style="background-color: #238636; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
        Open Interactive Playground →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #30363d; margin-top: 32px; padding-top: 16px; font-size: 12px; color: #8b949e; text-align: center;">
      FinAPI • Direct SEC EDGAR Data Service • <a href="https://github.com/Avids/FinAPI" style="color: #58a6ff; text-decoration: none;">GitHub</a>
    </div>

  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${name},

Welcome to FinAPI!

Your API Key:
${apiKey}

Daily Limit: ${dailyLimit} requests/day (resets daily at 00:00 UTC)

Quick start with curl:
curl -H "x-api-key: ${apiKey}" "https://finapi2026.vercel.app/api/financials/AAPL?period=annual&concepts=Revenues,NetIncomeLoss"

Test queries interactively at: https://finapi2026.vercel.app

Happy querying!
FinAPI Team
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send API key email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Error dispatching email:", err);
    return { success: false, error: err.message || String(err) };
  }
}
