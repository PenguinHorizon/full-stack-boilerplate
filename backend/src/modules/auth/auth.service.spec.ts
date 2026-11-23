import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MailService } from '@modules/mail/mail.service';
import { User } from '@database/entities/identity/user.entity';
import { hashPassword } from '@common/helpers/password.helper';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let mail: { send: jest.Mock };
  let tokens: { revokeAllForUser: jest.Mock };

  beforeEach(async () => {
    users = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => dto),
      update: jest.fn(),
    };
    mail = { send: jest.fn() };
    tokens = { revokeAllForUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: MailService, useValue: mail },
        { provide: TokenService, useValue: tokens },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'http://localhost:5173') },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('no longer offers staff self-registration', () => {
    // Staff accounts are created by organization or platform admins.
    expect((service as unknown as Record<string, unknown>).register).toBeUndefined();
  });

  describe('updateProfile', () => {
    it('changes only name, phone and avatar on the caller’s own account', async () => {
      const user = {
        id: 3,
        name: 'Old',
        phone: null,
        avatar: null,
        isSuperAdmin: false,
      };
      users.findOne.mockResolvedValue(user);
      users.save.mockImplementation(async (u) => u);

      const saved = await service.updateProfile(3, {
        name: 'New',
        phone: '+923001234567',
        // Not a profile field; the DTO whitelist rejects it before here, and
        // the service ignores it even if it arrives.
        isSuperAdmin: true,
      } as never);

      expect(users.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(saved).toMatchObject({
        name: 'New',
        phone: '+923001234567',
        isSuperAdmin: false,
      });
    });
  });

  describe('validateCredentials', () => {
    it('rejects a wrong password with 401 rather than a 500', async () => {
      users.findOne.mockResolvedValue({
        id: 1,
        password: await hashPassword('Password123'),
        isActive: true,
      });
      await expect(
        service.validateCredentials('a@example.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('gives the same error for an unknown address (no enumeration)', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        service.validateCredentials('nobody@example.com', 'Password123'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects a deactivated account', async () => {
      users.findOne.mockResolvedValue({
        id: 1,
        password: await hashPassword('Password123'),
        isActive: false,
      });
      await expect(
        service.validateCredentials('a@example.com', 'Password123'),
      ).rejects.toThrow('Account is disabled');
    });
  });

  describe('forgotPassword', () => {
    it('resolves silently for an unknown address and sends nothing', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(
        service.forgotPassword('nobody@example.com'),
      ).resolves.toBeUndefined();
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('persists the token hash BEFORE sending the email', async () => {
      const order: string[] = [];
      users.findOne.mockResolvedValue({ id: 1, email: 'a@example.com' });
      users.update.mockImplementation(async () => order.push('update'));
      mail.send.mockImplementation(async () => order.push('send'));

      await service.forgotPassword('a@example.com');

      expect(order).toEqual(['update', 'send']);
    });

    it('stores only the hash, never the raw token', async () => {
      users.findOne.mockResolvedValue({ id: 1, email: 'a@example.com' });
      await service.forgotPassword('a@example.com');

      const [, patch] = users.update.mock.calls[0];
      expect(patch.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);

      // The raw token only ever appears in the emailed link.
      const link = mail.send.mock.calls[0][0].text as string;
      const raw = /token=([a-f0-9]+)/.exec(link)![1];
      expect(patch.resetPasswordToken).toBe(sha256(raw));
      expect(patch.resetPasswordToken).not.toBe(raw);
    });
  });

  describe('resetPassword', () => {
    it('rejects an expired token', async () => {
      users.findOne.mockResolvedValue({
        id: 1,
        resetPasswordToken: sha256('tok'),
        resetPasswordExpires: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword('tok', 'Password123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('treats a missing expiry as expired rather than as never-expiring', async () => {
      users.findOne.mockResolvedValue({
        id: 1,
        resetPasswordToken: sha256('tok'),
        resetPasswordExpires: null,
      });
      await expect(service.resetPassword('tok', 'Password123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('clears the token and revokes every session on success', async () => {
      users.findOne.mockResolvedValue({
        id: 1,
        resetPasswordToken: sha256('tok'),
        resetPasswordExpires: new Date(Date.now() + 60_000),
      });

      await service.resetPassword('tok', 'Password123');

      const [, patch] = users.update.mock.calls[0];
      expect(patch.resetPasswordToken).toBeNull();
      expect(patch.resetPasswordExpires).toBeNull();
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith(1);
    });
  });
});
