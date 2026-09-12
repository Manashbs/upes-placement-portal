// Vercel Serverless Function: Verify Google reCAPTCHA v2 Token
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeGO7gtAAAAAA03wWjroBSB3NRXHe22oQdcPSaB';

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Verification failed' });
  }
}
