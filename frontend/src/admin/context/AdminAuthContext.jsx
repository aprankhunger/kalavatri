import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi';

const AdminAuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 2FA flow state
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(null); // { mode: 'verify'|'setup', tempToken, qrCodeDataUrl, secret }

  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (isAuthenticated) {
      inactivityTimerRef.current = setTimeout(() => {
        handleLogout('Session expired due to 30 minutes of inactivity.');
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isAuthenticated]);

  // Check existing session on load
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.get('/auth/me');
      setAdminUser(res.data.user);
      setPermissions(res.data.permissions || []);
      setIsAuthenticated(true);
    } catch {
      setAdminUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    const handleSessionExpired = () => {
      setAdminUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    };

    window.addEventListener('admin:session-expired', handleSessionExpired);
    return () => window.removeEventListener('admin:session-expired', handleSessionExpired);
  }, [checkSession]);

  // Listen for user activity to reset inactivity timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach((ev) => window.addEventListener(ev, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isAuthenticated, resetInactivityTimer]);

  const handleLogin = async (email, password) => {
    const res = await adminApi.post('/auth/login', { email, password });

    if (res.data.requires2FASetup) {
      // Need 2FA Setup
      const setupRes = await adminApi.post(
        '/auth/setup-2fa',
        {},
        { headers: { Authorization: `Bearer ${res.data.tempToken}` } }
      );
      setTwoFactorPrompt({
        mode: 'setup',
        tempToken: res.data.tempToken,
        qrCodeDataUrl: setupRes.data.qrCodeDataUrl,
        secret: setupRes.data.secret,
      });
      return { step: 'setup_2fa', message: res.data.message };
    }

    if (res.data.requires2FA) {
      // Need 2FA Verification
      setTwoFactorPrompt({
        mode: 'verify',
        tempToken: res.data.tempToken,
      });
      return { step: 'verify_2fa', message: res.data.message };
    }

    // Direct Login (if 2FA was already completed or not required)
    setAdminUser(res.data.user);
    setPermissions(res.data.permissions || []);
    setIsAuthenticated(true);
    setTwoFactorPrompt(null);
    return { step: 'authenticated', user: res.data.user };
  };

  const handleVerify2FA = async (code) => {
    if (!twoFactorPrompt?.tempToken) {
      throw new Error('No pending 2FA verification session. Please log in again.');
    }

    const res = await adminApi.post('/auth/verify-2fa', {
      tempToken: twoFactorPrompt.tempToken,
      code,
    });

    setAdminUser(res.data.user);
    setPermissions(res.data.permissions || []);
    setIsAuthenticated(true);
    setTwoFactorPrompt(null);
    return res.data;
  };

  const handleConfirm2FASetup = async (code) => {
    if (!twoFactorPrompt?.tempToken) {
      throw new Error('No active 2FA setup session.');
    }

    const res = await adminApi.post(
      '/auth/confirm-2fa',
      { code },
      { headers: { Authorization: `Bearer ${twoFactorPrompt.tempToken}` } }
    );

    setAdminUser(res.data.user);
    setPermissions(res.data.permissions || []);
    setIsAuthenticated(true);
    setTwoFactorPrompt(null);
    return res.data; // contains backupCodes
  };

  const handleLogout = async (reason = null) => {
    try {
      await adminApi.post('/auth/logout');
    } catch {
      // Continue cleanup even if server call fails
    }
    setAdminUser(null);
    setPermissions([]);
    setIsAuthenticated(false);
    setTwoFactorPrompt(null);
    if (reason) {
      sessionStorage.setItem('admin_logout_reason', reason);
    }
  };

  const hasPermission = (permission) => {
    if (!adminUser) return false;
    if (adminUser.role === 'super_admin') return true;
    return permissions.includes('*') || permissions.includes(permission);
  };

  const hasRole = (roles = []) => {
    if (!adminUser) return false;
    if (adminUser.role === 'super_admin') return true;
    return roles.includes(adminUser.role);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        permissions,
        isAuthenticated,
        isLoading,
        twoFactorPrompt,
        setTwoFactorPrompt,
        login: handleLogin,
        verify2FA: handleVerify2FA,
        confirm2FASetup: handleConfirm2FASetup,
        logout: handleLogout,
        hasPermission,
        hasRole,
        checkSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
