const express = require('express');
const bcrypt = require('bcryptjs');
const { db, generateId } = require('../db');
const { signToken, requireAuth } = require('../auth');
const { sendOtpEmail, sendPasswordResetEmail } = require('../email');
require('dotenv').config();

const router = express.Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 12);
    const otp_code = generateOtp();
    const otp_expires = Date.now() + 10 * 60 * 1000; // 10 min

    await db.run(`
      INSERT INTO users (id, email, password_hash, full_name, otp_code, otp_expires, is_verified, role)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'customer')
    `, generateId(), email.toLowerCase(), password_hash, full_name || null, otp_code, otp_expires);

    await sendOtpEmail(email.toLowerCase(), otp_code);
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Verify OTP ──────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email?.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otp_code !== otpCode) return res.status(400).json({ error: 'Invalid verification code' });
    if (Date.now() > Number(user.otp_expires)) return res.status(400).json({ error: 'Verification code expired' });

    await db.run('UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE id = ?', user.id);

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ access_token: token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── Resend OTP ──────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email?.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp_code = generateOtp();
    const otp_expires = Date.now() + 10 * 60 * 1000;
    await db.run('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', otp_code, otp_expires, user.id);

    await sendOtpEmail(email.toLowerCase(), otp_code);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email?.toLowerCase());
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_verified) return res.status(401).json({ error: 'Please verify your email first' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ access_token: token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Me ──────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, full_name, role, created_date FROM users WHERE id = ?', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user info' });
  }
});

// ─── Password Reset Request ───────────────────────────────────────────────────
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email?.toLowerCase());
    // Always respond success to avoid user enumeration
    if (user) {
      const reset_token = generateId();
      const reset_expires = Date.now() + 60 * 60 * 1000; // 1 hour
      await db.run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', reset_token, reset_expires, user.id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${reset_token}`;
      await sendPasswordResetEmail(email.toLowerCase(), resetLink);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ─── Password Reset ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const user = await db.get('SELECT * FROM users WHERE reset_token = ?', resetToken);
    if (!user) return res.status(400).json({ error: 'Invalid reset link' });
    if (Date.now() > Number(user.reset_expires)) return res.status(400).json({ error: 'Reset link expired' });

    const password_hash = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', password_hash, user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

let googleOAuthEnabled = false;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value.toLowerCase();
      let user = await db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', profile.id, email);
      if (!user) {
        const id = generateId();
        await db.run(`INSERT INTO users (id, email, full_name, google_id, is_verified, role) VALUES (?, ?, ?, ?, 1, 'customer')`, id, email, profile.displayName, profile.id);
        user = await db.get('SELECT * FROM users WHERE id = ?', id);
      } else if (!user.google_id) {
        await db.run('UPDATE users SET google_id = ?, is_verified = 1 WHERE id = ?', profile.id, user.id);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
  googleOAuthEnabled = true;
}

router.get('/google', (req, res, next) => {
  if (!googleOAuthEnabled) {
    return res.status(400).send(`
      <div style="font-family:sans-serif;max-width:500px;margin:50px auto;padding:30px;border:1px solid #e1e1e1;border-radius:8px;">
        <h2 style="color:#EA4335;">Google OAuth Not Configured</h2>
        <p>To enable Google Login, you must add Google OAuth credentials in your server's <code>.env</code> file:</p>
        <pre style="background:#f5f5f5;padding:15px;border-radius:4px;">
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret</pre>
        <p><a href="http://localhost:5173/login" style="color:#C5A059;font-weight:bold;text-decoration:none;">Go back to Login</a></p>
      </div>
    `);
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleOAuthEnabled) {
    return res.redirect('http://localhost:5173/login');
  }
  passport.authenticate('google', { session: false, failureRedirect: '/login' })(req, res, async () => {
    const token = signToken({ id: req.user.id, email: req.user.email, role: req.user.role });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?access_token=${token}`);
  });
});

module.exports = router;
