import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from './models.js';
import { config } from './config.js';

const COOKIE = 'maskchat_session';
export const CSRF_COOKIE = 'maskchat_csrf';
export function createCsrfToken() { return crypto.randomBytes(32).toString('hex'); }
export function csrfCookieOptions() { return { httpOnly: false, secure: config.COOKIE_SECURE, sameSite: 'lax', path: '/', maxAge: 1000 * 60 * 60 * 12 }; }
export const cookieOptions = () => ({
  httpOnly: true, secure: config.COOKIE_SECURE, sameSite: 'lax',
  path: '/', maxAge: 1000 * 60 * 60 * 12
});
export function signSession(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.COOKIE_SECRET, { expiresIn: '12h', issuer: 'maskchat' });
}
export async function hashPassword(password) { return bcrypt.hash(password, 12); }
export async function checkPassword(password, hash) { return bcrypt.compare(password, hash); }
export function setSessionCookie(res, user) { res.cookie(COOKIE, signSession(user), cookieOptions()); }
export function clearSessionCookie(res) { res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined }); }
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, config.COOKIE_SECRET, { issuer: 'maskchat' });
    const user = await User.findById(payload.sub).select('+institutionVerifiedAt +email');
    if (!user || user.isBanned) return res.status(401).json({ error: 'Session is no longer valid' });
    if (config.NODE_ENV === 'production' && !user.institutionVerifiedAt) return res.status(403).json({ error: 'Institutional identity has not been verified' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }
}
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
export function publicUser(user) {
  return { id: String(user._id), alias: user.alias, role: user.role, institution: user.institution, interests: user.interests || [] };
}
