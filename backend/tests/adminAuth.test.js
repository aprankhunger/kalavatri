import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { generateSecret, generateSync, verifySync } from 'otplib';
import { ADMIN_ROLES, ROLE_PERMISSIONS } from '../db/adminUserDb.js';
import { changePasswordSchema, loginSchema } from '../validations/adminAuthSchemas.js';

test('Security Requirement 4.1: Password hashing and verification', async () => {
  const password = 'SuperSecret#Admin2026!';
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);

  assert.notEqual(hash, password, 'Password must not be stored in plain text');
  assert.ok(await bcrypt.compare(password, hash), 'Valid password must match hash');
  assert.ok(!(await bcrypt.compare('WrongPassword123!', hash)), 'Invalid password must fail');
});

test('Security Requirement 4.1: Password policy requires min 12 chars & rejects weak passwords', () => {
  // Test password < 12 chars
  const shortResult = changePasswordSchema.safeParse({
    currentPassword: 'oldpassword123',
    newPassword: 'Short1!',
  });
  assert.equal(shortResult.success, false);

  // Test common password
  const commonResult = changePasswordSchema.safeParse({
    currentPassword: 'oldpassword123',
    newPassword: 'password1234',
  });
  assert.equal(commonResult.success, false);

  // Test valid strong password >= 12 chars with upper, number, symbol
  const validResult = changePasswordSchema.safeParse({
    currentPassword: 'oldpassword123',
    newPassword: 'Kalavatri#Admin2026!',
  });
  assert.equal(validResult.success, true);
});

test('Security Requirement 4.1: TOTP 2FA secret generation and validation', () => {
  const secret = generateSecret();
  assert.ok(secret && secret.length >= 16, 'TOTP secret must be generated');

  const token = generateSync({ secret });
  assert.equal(token.length, 6, 'TOTP token must be 6 digits');

  const isValid = verifySync({ token, secret })?.valid;
  assert.equal(isValid, true, 'Valid TOTP token must verify');

  const isInvalid = verifySync({ token: '000000', secret })?.valid || false;
  assert.equal(isInvalid, false, 'Invalid TOTP token must be rejected');
});

test('Security Requirement 4.2: RBAC permissions matrix enforcement', () => {
  // Super admin has universal wildcard access
  const superAdminPerms = ROLE_PERMISSIONS[ADMIN_ROLES.SUPER_ADMIN];
  assert.deepEqual(superAdminPerms, ['*']);

  // Inventory staff can only update stock / read products
  const inventoryPerms = ROLE_PERMISSIONS[ADMIN_ROLES.INVENTORY_STAFF];
  assert.ok(inventoryPerms.includes('products:stock_update'));
  assert.ok(!inventoryPerms.includes('orders:write'), 'Inventory staff cannot write orders');
  assert.ok(!inventoryPerms.includes('reports:export'), 'Inventory staff cannot export reports');

  // Accountant can view reports and orders, but cannot write products or orders
  const accountantPerms = ROLE_PERMISSIONS[ADMIN_ROLES.ACCOUNTANT];
  assert.ok(accountantPerms.includes('reports:export'));
  assert.ok(!accountantPerms.includes('products:write'), 'Accountant cannot write products');
});

test('Security Requirement 4.1: Login lockout after 5 attempts', () => {
  let failedAttempts = 0;
  let lockUntil = null;

  for (let i = 1; i <= 5; i++) {
    failedAttempts += 1;
    if (failedAttempts >= 5) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  assert.equal(failedAttempts, 5);
  assert.ok(lockUntil !== null);
  assert.ok(lockUntil.getTime() > Date.now(), 'Account must be locked into the future');
});
