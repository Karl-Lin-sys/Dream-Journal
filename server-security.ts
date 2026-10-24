import type { RequestHandler } from 'express';

export function dreamSecurity(verify: (token: string) => Promise<{uid: string}>, allowed: Set<string>): RequestHandler {
  const users = new Map<string, {count: number; until: number; active: number}>();
  let active = 0;
  return async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
    if (!match || match[1].length > 8192) { res.status(401).json({error: 'Authentication required'}); return; }
    let uid: string;
    try { uid = (await verify(match[1])).uid; }
    catch { res.status(401).json({error: 'Invalid authentication'}); return; }
    // An explicit owner allowlist prevents public signup from spending the owner's API quota.
    if (!allowed.has(uid)) { res.status(403).json({error: 'Account not enabled'}); return; }
    const now = Date.now();
    for (const [key, value] of users) if (value.until <= now && value.active === 0) users.delete(key);
    if (!users.has(uid) && users.size >= 1000) { res.status(429).json({error: 'Try again later'}); return; }
    const entry = users.get(uid) || {count: 0, until: now + 600000, active: 0};
    if (entry.until <= now) { entry.count = 0; entry.until = now + 600000; }
    users.set(uid, entry);
    if (entry.count >= 10 || entry.active >= 2 || active >= 32) { res.status(429).json({error: 'Try again later'}); return; }
    entry.count++; entry.active++; active++;
    // Keep the slot until processing ends, even if the client disconnects early.
    let released = false;
    const release = () => { if (!released) { released = true; entry.active--; active--; } };
    req.once('aborted', release);
    res.once('finish', release);
    res.locals.releaseDreamSlot = release;
    next();
  };
}

export function validProcess(body: any): boolean {
  return body && typeof body.audioData === 'string' && body.audioData.length > 0 &&
    body.audioData.length <= 10000000 && /^[A-Za-z0-9+/]+={0,2}$/.test(body.audioData) &&
    ['audio/webm','audio/wav','audio/mp3','audio/mpeg','audio/ogg','audio/mp4'].includes(body.mimeType);
}
export function validChat(body: any): boolean {
  return body && typeof body.transcript === 'string' && body.transcript.length <= 10000 &&
    typeof body.userMessage === 'string' && body.userMessage.length > 0 && body.userMessage.length <= 5000 &&
    Array.isArray(body.messages) && body.messages.length <= 20 && body.messages.every((m: any) =>
      m && ['user','model'].includes(m.role) && Array.isArray(m.parts) && m.parts.length === 1 &&
      typeof m.parts[0]?.text === 'string' && m.parts[0].text.length <= 5000);
}
