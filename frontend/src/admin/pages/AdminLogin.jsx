import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiKey, FiEye, FiEyeOff, FiShield, FiCheck, FiCopy, FiAlertCircle } from 'react-icons/fi';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ADMIN_PATH } from '../config/adminConfig';
import './AdminLogin.css';

const AdminLogin = () => {
  const { login, verify2FA, confirm2FASetup, twoFactorPrompt, setTwoFactorPrompt } = useAdminAuth();
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Backup codes display after 2FA activation
  const [backupCodes, setBackupCodes] = useState(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Handle Step 1: Credentials
  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.step === 'authenticated') {
        navigate(`${ADMIN_PATH}/dashboard`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: 2FA Verification
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verify2FA(totpCode);
      navigate(`${ADMIN_PATH}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3: 2FA Setup Confirmation
  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await confirm2FASetup(totpCode);
      setBackupCodes(res.backupCodes || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed. Please check code.');
    } finally {
      setLoading(false);
    }
  };

  const copySecretKey = () => {
    if (twoFactorPrompt?.secret) {
      navigator.clipboard.writeText(twoFactorPrompt.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyAllBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="admin-scope admin-login-page">
      <div className="admin-login-card">
        {/* Brand header */}
        <div className="admin-login-header">
          <div className="admin-login-logo">KV</div>
          <h1>KALAVATRI</h1>
          <p className="admin-login-subtitle">Administrative Management Portal</p>
        </div>

        {error && (
          <div className="admin-alert admin-alert-danger">
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 3B: BACKUP CODES SHOWN AFTER INITIAL 2FA ENROLLMENT */}
        {backupCodes ? (
          <div className="admin-2fa-backup-box">
            <div className="admin-backup-badge">
              <FiShield size={20} color="#10B981" />
              <h3>Save Your Recovery Codes</h3>
            </div>
            <p className="admin-backup-desc">
              Two-Factor Authentication is now active on your account! Save these 8 single-use recovery codes in a secure
              password manager. If you ever lose access to your authenticator app, these will restore your access.
            </p>

            <div className="admin-backup-grid">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="admin-backup-code-item">
                  <span>{idx + 1}.</span> {code}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-full"
              onClick={copyAllBackupCodes}
            >
              {copiedCodes ? <FiCheck size={16} /> : <FiCopy size={16} />}
              <span>{copiedCodes ? 'Codes Copied!' : 'Copy All Backup Codes'}</span>
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-full"
              style={{ marginTop: '12px' }}
              onClick={() => navigate(`${ADMIN_PATH}/dashboard`, { replace: true })}
            >
              Continue to Dashboard →
            </button>
          </div>
        ) : twoFactorPrompt?.mode === 'setup' ? (
          /* STEP 3A: 2FA SETUP (QR CODE) */
          <form onSubmit={handleConfirmSetup} className="admin-2fa-setup-form">
            <div className="admin-setup-instruction">
              <span className="admin-badge admin-badge-gold">Step 2 of 2: 2FA Pairing</span>
              <h3>Scan Authenticator QR Code</h3>
              <p>
                Open Google Authenticator, Authy, or 1Password on your phone and scan the QR code below.
              </p>
            </div>

            {twoFactorPrompt.qrCodeDataUrl && (
              <div className="admin-qr-container">
                <img src={twoFactorPrompt.qrCodeDataUrl} alt="2FA QR Code" className="admin-qr-image" />
              </div>
            )}

            <div className="admin-secret-row">
              <span className="admin-secret-label">Manual Secret Key:</span>
              <code className="admin-secret-code">{twoFactorPrompt.secret}</code>
              <button
                type="button"
                className="admin-copy-btn"
                onClick={copySecretKey}
                title="Copy Secret"
              >
                {copiedSecret ? <FiCheck size={14} /> : <FiCopy size={14} />}
              </button>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Enter 6-Digit Authenticator Code</label>
              <div className="admin-input-wrapper">
                <FiKey className="admin-input-icon" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  className="admin-input admin-input-with-icon"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-full"
              disabled={loading || totpCode.length !== 6}
            >
              {loading ? 'Activating 2FA...' : 'Verify Code & Activate 2FA'}
            </button>
          </form>
        ) : twoFactorPrompt?.mode === 'verify' ? (
          /* STEP 2: 2FA VERIFICATION CODE PROMPT */
          <form onSubmit={handleVerify2FA} className="admin-2fa-verify-form">
            <div className="admin-setup-instruction">
              <span className="admin-badge admin-badge-gold">Two-Factor Authentication</span>
              <h3>Enter Security Code</h3>
              <p>
                {useBackupCode
                  ? 'Enter one of your 8-character emergency backup recovery codes.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">
                {useBackupCode ? '8-Character Recovery Code' : '6-Digit TOTP Code'}
              </label>
              <div className="admin-input-wrapper">
                <FiKey className="admin-input-icon" />
                <input
                  type="text"
                  maxLength={useBackupCode ? 10 : 6}
                  placeholder={useBackupCode ? 'e.g. A1B2C3D4' : '000000'}
                  className="admin-input admin-input-with-icon"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(
                      useBackupCode
                        ? e.target.value.toUpperCase()
                        : e.target.value.replace(/\D/g, '')
                    )
                  }
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-full"
              disabled={loading || totpCode.length < 6}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div className="admin-2fa-toggle-row">
              <button
                type="button"
                className="admin-text-link"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setTotpCode('');
                }}
              >
                {useBackupCode ? 'Use 6-digit Authenticator code instead' : 'Use emergency recovery code'}
              </button>

              <button
                type="button"
                className="admin-text-link"
                onClick={() => setTwoFactorPrompt(null)}
              >
                ← Back to Login
              </button>
            </div>
          </form>
        ) : (
          /* STEP 1: INITIAL CREDENTIALS */
          <form onSubmit={handleSubmitCredentials} className="admin-credentials-form">
            <div className="admin-form-group">
              <label className="admin-label">Admin Email Address</label>
              <div className="admin-input-wrapper">
                <FiMail className="admin-input-icon" />
                <input
                  type="email"
                  placeholder="admin@kalavatri.in"
                  className="admin-input admin-input-with-icon"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Password</label>
              <div className="admin-input-wrapper">
                <FiLock className="admin-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="admin-input admin-input-with-icon admin-input-with-action"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="admin-input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div className="admin-login-notice">
              <span>🔒 Protected by rate limiting, lockout safeguards, and mandatory 2FA.</span>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-full"
              disabled={loading || !email || !password}
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>
        )}

        <div className="admin-login-footer">
          <p>KALAVATRI Internal Portal &bull; Unauthorized access prohibited</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
