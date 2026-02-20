import crypto from 'crypto';

function base64urlDecode(str: string) {
  // Replace URL-safe characters and pad
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function verifyJwt(token: string, secret: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const signed = `${headerB64}.${payloadB64}`;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signed)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (expectedSig !== signatureB64) return null;

    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    // Optional expiry check
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch (err) {
    console.warn('JWT verify error', err);
    return null;
  }
}
