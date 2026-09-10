export interface QRTokenData {
  roundId: string;
  driveId: string;
  companyName: string;
  roundName: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}

export function generateRoundQRToken(
  roundId: string,
  driveId: string,
  companyName: string,
  roundName: string,
  validityMinutes: number = 60
): { token: string; expiresAtIso: string } {
  const now = Date.now();
  const expiresAt = now + validityMinutes * 60 * 1000;
  
  const tokenData: QRTokenData = {
    roundId,
    driveId,
    companyName,
    roundName,
    timestamp: now,
    expiresAt,
    signature: `UPES-SEC-${roundId.slice(0, 4)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  };

  const tokenString = btoa(JSON.stringify(tokenData));
  return {
    token: tokenString,
    expiresAtIso: new Date(expiresAt).toISOString(),
  };
}

export function validateQRToken(tokenString: string): { valid: boolean; message: string; data?: QRTokenData } {
  try {
    const decodedJson = atob(tokenString);
    const data: QRTokenData = JSON.parse(decodedJson);
    const now = Date.now();

    if (now > data.expiresAt) {
      return { valid: false, message: 'QR Code token has expired. Please ask the SPR or Placement Cell to refresh the QR Code.' };
    }

    if (!data.roundId || !data.signature) {
      return { valid: false, message: 'Invalid or forged QR Code token.' };
    }

    return { valid: true, message: 'Token verified successfully.', data };
  } catch {
    return { valid: false, message: 'Corrupted QR Code format.' };
  }
}
