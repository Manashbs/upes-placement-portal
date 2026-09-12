export interface QRTokenData {
  roundId: string;
  driveId: string;
  companyName: string;
  roundName: string;
  sessionId: string; // Unique per QR generation — ensures each upload creates a distinct QR
  timestamp: number;
  expiresAt: number;
  signature: string;
}

/** Generate a random session ID for QR uniqueness */
function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

export function generateRoundQRToken(
  roundId: string,
  driveId: string,
  companyName: string,
  roundName: string,
  validityMinutes: number = 5256000
): { token: string; expiresAtIso: string; sessionId: string } {
  const now = Date.now();
  const expiresAt = now + validityMinutes * 60 * 1000;
  const sessionId = generateSessionId();
  
  const tokenData: QRTokenData = {
    roundId,
    driveId,
    companyName,
    roundName,
    sessionId,
    timestamp: now,
    expiresAt,
    signature: `UPES-SEC-${roundId.slice(0, 4)}-${sessionId.slice(0, 6)}`,
  };

  const tokenString = btoa(JSON.stringify(tokenData));
  return {
    token: tokenString,
    expiresAtIso: new Date(expiresAt).toISOString(),
    sessionId,
  };
}

export function validateQRToken(tokenString: string): { valid: boolean; message: string; data?: QRTokenData } {
  try {
    const decodedJson = atob(tokenString);
    const data: QRTokenData = JSON.parse(decodedJson);

    if (!data.roundId || !data.signature) {
      return { valid: false, message: 'Invalid or forged QR Code token.' };
    }

    return { valid: true, message: 'Token verified successfully.', data };
  } catch {
    return { valid: false, message: 'Corrupted QR Code format.' };
  }
}
