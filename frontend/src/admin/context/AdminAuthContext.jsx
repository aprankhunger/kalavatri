import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import adminApi from '../services/adminApi';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 2FA flow state
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(null); // { mode: 'verify'|'setup', tempToken, qrCodeDataUrl, secret }

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
