import { AuthService } from '../../src/services/authService';
import { UserService } from '../../src/services/userService';
import { 
  getTestDb, 
  createTestUser,
  cleanupDatabase 
} from '../setup';
import bcrypt from 'bcrypt';

// Mock JWT to avoid dependency issues in tests
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret, options) => `mock.jwt.token.${payload.user_id}`),
  verify: jest.fn((token, secret) => {
    const parts = token.split('.');
    if (parts.length >= 3) {
      const userId = parts[3];
      return {
        user_id: parseInt(userId),
        email: 'test@example.com',
        role: 'owner',
        iat: Date.now(),
        exp: Date.now() + 3600000
      };
    }
    throw new Error('Invalid token');
  })
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;

  beforeAll(() => {
    authService = new AuthService();
    userService = new UserService();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        phone_number: '+1234567890',
        role: 'owner' as const
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.name).toBe('John Doe');
      expect(result.user.role).toBe('owner');
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(900); // 15 minutes
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        password: '123',
        role: 'owner' as const
      };

      await expect(authService.register(invalidData)).rejects.toThrow();
    });

    it('should enforce password strength requirements', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
        role: 'owner' as const
      };

      await expect(authService.register(userData)).rejects.toThrow(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      );
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        name: 'John Doe',
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        role: 'owner' as const
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'SecurePass123!',
        role: 'owner' as const
      };

      const result = await authService.register(userData);

      expect(result.user.email).toBe('john@example.com');
    });

    it('should hash password securely', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'owner' as const
      };

      await authService.register(userData);

      const db = getTestDb();
      const user = await db('users').where('email', 'john@example.com').first();
      
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('SecurePass123!');
      expect(await bcrypt.compare('SecurePass123!', user.password_hash)).toBe(true);
    });

    it('should restrict roles for self-registration', async () => {
      const adminData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'SecurePass123!',
        role: 'admin' as const
      };

      await expect(authService.register(adminData)).rejects.toThrow(
        'Only owner and renter roles are allowed for self-registration'
      );
    });
  });

  describe('login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
    });

    it('should be case-insensitive for email', async () => {
      const result = await authService.login({
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePass123!'
      });

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'SecurePass123!'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      await expect(authService.login({
        email: 'test@example.com',
        password: 'WrongPassword123!'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should reject login for inactive users', async () => {
      const db = getTestDb();
      await db('users')
        .where('email', 'test@example.com')
        .update({ is_active: false });

      await expect(authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!'
      })).rejects.toThrow('Account is deactivated');
    });

    it('should update last_login timestamp', async () => {
      const db = getTestDb();
      
      const userBefore = await db('users')
        .where('email', 'test@example.com')
        .first();

      await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      const userAfter = await db('users')
        .where('email', 'test@example.com')
        .first();

      expect(userAfter.last_login).toBeDefined();
      expect(new Date(userAfter.last_login).getTime())
        .toBeGreaterThan(userBefore.last_login ? new Date(userBefore.last_login).getTime() : 0);
    });
  });

  describe('refreshToken', () => {
    let loginResult: any;

    beforeEach(async () => {
      await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });

      loginResult = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await authService.refreshToken({
        refresh_token: loginResult.refresh_token
      });

      expect(result.success).toBe(true);
      expect(result.access_token).toBeDefined();
      expect(result.access_token).not.toBe(loginResult.access_token);
      expect(result.refresh_token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken({
        refresh_token: 'invalid.refresh.token'
      })).rejects.toThrow('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      const db = getTestDb();
      
      // Expire the refresh token
      await db('users')
        .where('email', 'test@example.com')
        .update({ 
          refresh_token_expires_at: new Date(Date.now() - 1000) // 1 second ago
        });

      await expect(authService.refreshToken({
        refresh_token: loginResult.refresh_token
      })).rejects.toThrow('Refresh token has expired');
    });

    it('should rotate refresh tokens', async () => {
      const result = await authService.refreshToken({
        refresh_token: loginResult.refresh_token
      });

      expect(result.refresh_token).not.toBe(loginResult.refresh_token);

      // Old refresh token should no longer work
      await expect(authService.refreshToken({
        refresh_token: loginResult.refresh_token
      })).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    let loginResult: any;

    beforeEach(async () => {
      await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });

      loginResult = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    });

    it('should logout successfully and invalidate refresh token', async () => {
      const result = await authService.logout({
        refresh_token: loginResult.refresh_token
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');

      // Refresh token should no longer work
      await expect(authService.refreshToken({
        refresh_token: loginResult.refresh_token
      })).rejects.toThrow('Invalid refresh token');
    });

    it('should handle logout with invalid refresh token gracefully', async () => {
      const result = await authService.logout({
        refresh_token: 'invalid.token'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('changePassword', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: 'owner'
      });
    });

    it('should change password successfully', async () => {
      const result = await authService.changePassword(testUser.user.id, {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');

      // Should be able to login with new password
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'NewPassword123!'
      });

      expect(loginResult.success).toBe(true);
    });

    it('should reject incorrect current password', async () => {
      await expect(authService.changePassword(testUser.user.id, {
        current_password: 'WrongPassword123!',
        new_password: 'NewPassword123!'
      })).rejects.toThrow('Current password is incorrect');
    });

    it('should validate new password strength', async () => {
      await expect(authService.changePassword(testUser.user.id, {
        current_password: 'OldPassword123!',
        new_password: 'weak'
      })).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should prevent reusing the same password', async () => {
      await expect(authService.changePassword(testUser.user.id, {
        current_password: 'OldPassword123!',
        new_password: 'OldPassword123!'
      })).rejects.toThrow('New password must be different from current password');
    });

    it('should reject change for non-existent user', async () => {
      await expect(authService.changePassword(99999, {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!'
      })).rejects.toThrow('User not found');
    });

    it('should invalidate all refresh tokens after password change', async () => {
      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'OldPassword123!'
      });

      await authService.changePassword(testUser.user.id, {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!'
      });

      // Old refresh token should no longer work
      await expect(authService.refreshToken({
        refresh_token: loginResult.refresh_token
      })).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('verifyToken', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      testUser = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });
      validToken = testUser.access_token;
    });

    it('should verify valid token', async () => {
      const result = await authService.verifyToken(validToken);

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should reject invalid token', async () => {
      const result = await authService.verifyToken('invalid.token');

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid token');
    });

    it('should reject token for inactive user', async () => {
      const db = getTestDb();
      await db('users')
        .where('email', 'test@example.com')
        .update({ is_active: false });

      const result = await authService.verifyToken(validToken);

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBe('User account is deactivated');
    });
  });

  describe('getCurrentUser', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });
    });

    it('should get current user by ID', async () => {
      const result = await authService.getCurrentUser(testUser.user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(testUser.user.id);
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      // Should not include sensitive fields
      expect((result as any).password_hash).toBeUndefined();
      expect((result as any).refresh_token_hash).toBeUndefined();
    });

    it('should return null for non-existent user', async () => {
      const result = await authService.getCurrentUser(99999);
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const db = getTestDb();
      await db('users')
        .where('id', testUser.user.id)
        .update({ is_active: false });

      const result = await authService.getCurrentUser(testUser.user.id);
      expect(result).toBeNull();
    });
  });

  describe('Security Features', () => {
    it('should hash passwords with sufficient rounds', async () => {
      const userData = {
        name: 'Security Test',
        email: 'security@example.com',
        password: 'SecurePass123!',
        role: 'owner' as const
      };

      await authService.register(userData);

      const db = getTestDb();
      const user = await db('users').where('email', 'security@example.com').first();
      
      // bcrypt hashes start with $2b$ and include rounds info
      expect(user.password_hash).toMatch(/^\$2b\$\d{2}\$/);
      
      // Should take some time to verify (indicating sufficient rounds)
      const startTime = Date.now();
      const isValid = await bcrypt.compare('SecurePass123!', user.password_hash);
      const endTime = Date.now();
      
      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(50); // Should take at least 50ms
    });

    it('should generate cryptographically secure refresh tokens', async () => {
      const user1 = await authService.register({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });

      const user2 = await authService.register({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'SecurePass123!',
        role: 'owner'
      });

      expect(user1.refresh_token).not.toBe(user2.refresh_token);
      expect(user1.refresh_token.length).toBeGreaterThan(32);
      expect(user2.refresh_token.length).toBeGreaterThan(32);
    });

    it('should handle password validation edge cases', async () => {
      const testCases = [
        { password: 'NoNumbers!', should_fail: true },
        { password: 'nonumbers123!', should_fail: true },
        { password: 'NOUPPER123!', should_fail: true },
        { password: 'NoSpecial123', should_fail: true },
        { password: 'Short1!', should_fail: true },
        { password: 'ValidPass123!', should_fail: false }
      ];

      for (const testCase of testCases) {
        const userData = {
          name: 'Test User',
          email: `test_${Date.now()}@example.com`,
          password: testCase.password,
          role: 'owner' as const
        };

        if (testCase.should_fail) {
          await expect(authService.register(userData)).rejects.toThrow();
        } else {
          await expect(authService.register(userData)).resolves.toBeDefined();
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid data
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'invalid_role' as any
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });

    it('should validate input types', async () => {
      await expect(authService.login({
        email: null as any,
        password: 'SecurePass123!'
      })).rejects.toThrow();

      await expect(authService.changePassword(null as any, {
        current_password: 'old',
        new_password: 'new'
      })).rejects.toThrow();
    });
  });
}); 