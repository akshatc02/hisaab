import type { SessionOptions } from 'iron-session';

export interface SessionData {
  user?: { username: string };
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'hisaab-fallback-secret-key-32chars!!',
  cookieName: 'hisaab_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  },
};
