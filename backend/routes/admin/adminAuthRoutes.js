import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateSecret, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import AdminUser, { ADMIN_ROLES, ROLE_PERMISSIONS } from '../../models/AdminUser.js';
import { requireAdminAuth, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, getCookieOptions } from '../../middleware/adminAuth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, verify2FASchema, setup2FAConfirmSchema, changePasswordSchema } from '../../validations/adminAuthSchemas.js';
import { logAuditEvent } from '../../utils/auditLogger.js';

const router = express.Router();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const TEMP_TOKEN_EXPIRY = '5m';

// Helper to generate access & refresh tokens and set HttpOnly cookies
const generateAuthCookiesAndResponse = (res, user) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  const cookieOptions = getCookieOptions();

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return {
    user: user.toSafeObject(),
    permissions: ROLE_PERMISSIONS[user.role] || [],
  };
};

// POST /api/admin/auth/login — Step 1 Login
router.post('/login', authRateLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

    const user = await AdminUser.findOne({ email: email.toLowerCase(), isDeleted: false });

    if (!user) {
      await logAuditEvent({
        req,
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        details: { reason: 'User not found', attemptedEmail: email },
        actorEmail: email,
      });
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      await logAuditEvent({
        req,
        action: 'LOGIN_BLOCKED_LOCKED',
        resource: 'AUTH',
        adminUser: user,
        details: { remainingMinutes },
      });
      return res.status(423).json({
        error: 'Account Locked',
        message: `Account is temporarily locked due to repeated failed attempts. Please try again in ${remainingMinutes} minute(s).`,
        code: 'ACCOUNT_LOCKED',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.recordFailedLogin();
      await logAuditEvent({
        req,
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        adminUser: user,
        details: { failedAttempts: user.failedLoginAttempts },
      });

      if (user.isLocked()) {
        return res.status(423).json({
          error: 'Account Locked',
          message: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account Deactivated',
        message: 'This account has been deactivated. Please contact the administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Two-factor authentication handling:
    // Mandatory for super_admin or any user with 2FA enabled
    const isSuperAdmin = user.role === ADMIN_ROLES.SUPER_ADMIN;
    const mustUse2FA = isSuperAdmin || user.twoFactorEnabled;

    if (mustUse2FA) {
      // If 2FA not configured yet for superadmin, prompt to setup 2FA
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        const setupToken = jwt.sign(
          { id: user._id.toString(), email: user.email, action: '2fa_setup' },
          process.env.JWT_ACCESS_SECRET,
          { expiresIn: TEMP_TOKEN_EXPIRY }
        );

        return res.json({
          requires2FASetup: true,
          tempToken: setupToken,
          message: 'Two-factor authentication setup is required for this account.',
        });
      }

      // 2FA is already configured, issue temporary 2FA verification token
      const verifyToken = jwt.sign(
        { id: user._id.toString(), email: user.email, action: '2fa_verify' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: TEMP_TOKEN_EXPIRY }
      );

      return res.json({
        requires2FA: true,
        tempToken: verifyToken,
        message: 'Please enter the 6-digit TOTP code from your authenticator app.',
      });
    }

    // Direct login for roles without 2FA required (non-superadmins before 2FA is enabled)
    await user.recordSuccessfulLogin(clientIp);
    const authData = generateAuthCookiesAndResponse(res, user);

    await logAuditEvent({
      req,
      action: 'LOGIN_SUCCESS',
      resource: 'AUTH',
      adminUser: user,
    });

    return res.json({
      message: 'Login successful',
      ...authData,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/auth/verify-2fa — Step 2 TOTP verification
router.post('/verify-2fa', authRateLimiter, validate(verify2FASchema), async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET);
      if (decoded.action !== '2fa_verify') throw new Error('Invalid token action');
    } catch {
      return res.status(401).json({
        error: 'Invalid or Expired Session',
        message: 'Your 2FA verification window has expired. Please log in again.',
        code: 'TEMP_TOKEN_EXPIRED',
      });
    }

    const user = await AdminUser.findById(decoded.id);
    if (!user || user.isDeleted || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }

    // Check TOTP code against secret
    const isValidTotp = verifySync({ token: code.trim(), secret: user.twoFactorSecret })?.valid;
    let usedBackupCode = false;

    if (!isValidTotp) {
      // Check backup codes
      const candidateCodeClean = code.trim().toUpperCase();
      const backupCodeIdx = user.twoFactorBackupCodes.findIndex(
        (bc) => !bc.used && bcrypt.compareSync(candidateCodeClean, bc.codeHash)
      );

      if (backupCodeIdx !== -1) {
        user.twoFactorBackupCodes[backupCodeIdx].used = true;
        user.twoFactorBackupCodes[backupCodeIdx].usedAt = new Date();
        await user.save();
        usedBackupCode = true;
      } else {
        await logAuditEvent({
          req,
          action: '2FA_VERIFICATION_FAILED',
          resource: 'AUTH',
          adminUser: user,
          details: { codeLength: code.length },
        });
        return res.status(400).json({
          error: 'Verification Failed',
          message: 'Invalid 2FA code. Please try again.',
          code: 'INVALID_2FA_CODE',
        });
      }
    }

    await user.recordSuccessfulLogin(clientIp);
    const authData = generateAuthCookiesAndResponse(res, user);

    await logAuditEvent({
      req,
      action: 'LOGIN_SUCCESS_2FA',
      resource: 'AUTH',
      adminUser: user,
      details: { usedBackupCode },
    });

    return res.json({
      message: 'Two-factor authentication verified successfully',
      ...authData,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/auth/setup-2fa — Generate TOTP QR Code & Secret
router.post('/setup-2fa', async (req, res) => {
  try {
    let userId = null;

    // Can be called either with tempToken (first-time login) or via authenticated session
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      userId = decoded.id;
    } else if (req.cookies?.[ACCESS_COOKIE_NAME]) {
      const decoded = jwt.verify(req.cookies[ACCESS_COOKIE_NAME], process.env.JWT_ACCESS_SECRET);
      userId = decoded.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required to setup 2FA' });
    }

    const user = await AdminUser.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate fresh secret
    const secret = generateSecret();
    const serviceName = 'KALAVATRI Admin';
    const otpAuthUrl = generateURI({ secret, label: user.email, issuer: serviceName });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Save temporary secret to user record
    user.twoFactorSecret = secret;
    await user.save();

    await logAuditEvent({
      req,
      action: '2FA_SETUP_INITIATED',
      resource: 'AUTH',
      adminUser: user,
    });

    return res.json({
      secret,
      qrCodeDataUrl,
      otpAuthUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/auth/confirm-2fa — Confirm and activate 2FA
router.post('/confirm-2fa', validate(setup2FAConfirmSchema), async (req, res) => {
  try {
    const { code } = req.body;
    let userId = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      userId = decoded.id;
    } else if (req.cookies?.[ACCESS_COOKIE_NAME]) {
      const decoded = jwt.verify(req.cookies[ACCESS_COOKIE_NAME], process.env.JWT_ACCESS_SECRET);
      userId = decoded.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
    }

    const user = await AdminUser.findById(userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA setup was not initiated. Please call /setup-2fa first.' });
    }

    const isValid = verifySync({ token: code.trim(), secret: user.twoFactorSecret })?.valid;
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid Code',
        message: 'The 6-digit code entered is incorrect. Please check your authenticator app and try again.',
      });
    }

    // Generate 8 random recovery backup codes
    const plainBackupCodes = [];
    const hashedBackupCodes = [];

    for (let i = 0; i < 8; i++) {
      const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex
      plainBackupCodes.push(rawCode);
      const hash = bcrypt.hashSync(rawCode, 10);
      hashedBackupCodes.push({ codeHash: hash, used: false });
    }

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedBackupCodes;
    await user.save();

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    await user.recordSuccessfulLogin(clientIp);
    const authData = generateAuthCookiesAndResponse(res, user);

    await logAuditEvent({
      req,
      action: '2FA_ACTIVATED',
      resource: 'AUTH',
      adminUser: user,
    });

    return res.json({
      message: 'Two-factor authentication successfully enabled!',
      backupCodes: plainBackupCodes,
      ...authData,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/auth/refresh — Refresh access token via HttpOnly refresh cookie
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token missing. Please log in.',
        code: 'REFRESH_REQUIRED',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Refresh token invalid or expired. Please log in.',
        code: 'REFRESH_EXPIRED',
      });
    }

    const user = await AdminUser.findById(decoded.id);
    if (!user || user.isDeleted || !user.isActive) {
      return res.status(401).json({ error: 'Account inactive or deleted' });
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const newAccessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const cookieOptions = getCookieOptions();
    res.cookie(ACCESS_COOKIE_NAME, newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    return res.json({
      message: 'Token refreshed successfully',
      user: user.toSafeObject(),
      permissions: ROLE_PERMISSIONS[user.role] || [],
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/admin/auth/logout — Invalidate cookies & audit log
router.post('/logout', requireAdminAuth, async (req, res) => {
  try {
    const cookieOptions = getCookieOptions();
    res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions);
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);

    await logAuditEvent({
      req,
      action: 'LOGOUT',
      resource: 'AUTH',
      adminUser: req.adminUser,
    });

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/admin/auth/me — Return current authenticated admin profile
router.get('/me', requireAdminAuth, async (req, res) => {
  return res.json({
    user: req.adminUser.toSafeObject(),
    permissions: ROLE_PERMISSIONS[req.adminUser.role] || [],
  });
});

// POST /api/admin/auth/change-password — Password change with 12-char validation
router.post('/change-password', requireAdminAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.adminUser;

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid Password',
        message: 'Current password does not match.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAuditEvent({
      req,
      action: 'PASSWORD_CHANGED',
      resource: 'AUTH',
      adminUser: user,
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
