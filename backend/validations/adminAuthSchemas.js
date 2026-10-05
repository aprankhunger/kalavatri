import { z } from 'zod';

const COMMON_PASSWORDS = [
  'password', 'password123', 'admin123456', '123456789012',
  'kalavatri1234', 'qwertyuiop12', 'administrator',
];

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Temporary session token is required'),
  code: z
    .string()
    .trim()
    .min(6, 'TOTP code must be 6 digits or an 8-character recovery code')
    .max(10),
});

export const setup2FAConfirmSchema = z.object({
  code: z.string().trim().length(6, 'TOTP code must be exactly 6 digits'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'New password must be at least 12 characters long')
    .refine((val) => !COMMON_PASSWORDS.includes(val.toLowerCase()), {
      message: 'This password is too common or easily guessable. Please choose a stronger password.',
    })
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Password must contain at least one uppercase letter',
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'Password must contain at least one number',
    })
    .refine((val) => /[^A-Za-z0-9]/.test(val), {
      message: 'Password must contain at least one special character',
    }),
});
