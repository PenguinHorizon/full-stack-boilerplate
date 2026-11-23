import { ForbiddenException, HttpException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PayloadDto } from '@common/dto/payload.dto';

const actor: PayloadDto = {
  userId: 1,
  userCode: 'USR000001',
  email: 'root@x.test',
  name: 'Root',
  isSuperAdmin: true,
};

function build(otherActiveSuperAdmins: number) {
  const users = {
    findOne: jest.fn(),
    save: jest.fn(async (u) => u),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(otherActiveSuperAdmins),
    })),
  };
  const tokens = { revokeAllForUser: jest.fn() };
  const service = new UsersService(users as never, {} as never, tokens as never);
  return { service, users, tokens };
}

describe('UsersService (platform rules)', () => {
  it('stops super admins removing their own platform access or deactivating themselves', async () => {
    const { service, users } = build(5);
    users.findOne.mockResolvedValue({ id: 1, isSuperAdmin: true, isActive: true });
    await expect(
      service.updatePlatform(1, { isSuperAdmin: false }, actor),
    ).rejects.toThrow(ForbiddenException);
    await expect(service.updatePlatform(1, { isActive: false }, actor)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('keeps at least one active super admin', async () => {
    const { service, users } = build(0);
    users.findOne.mockResolvedValue({ id: 2, isSuperAdmin: true, isActive: true });
    await expect(
      service.updatePlatform(2, { isSuperAdmin: false }, actor),
    ).rejects.toThrow(HttpException);
    await expect(service.remove(2, actor)).rejects.toThrow(HttpException);
  });

  it('demotes when another super admin remains', async () => {
    const { service, users } = build(1);
    users.findOne.mockResolvedValue({ id: 2, isSuperAdmin: true, isActive: true });
    const saved = await service.updatePlatform(2, { isSuperAdmin: false }, actor);
    expect(saved.isSuperAdmin).toBe(false);
  });

  it('ends every session when an account is deactivated or removed', async () => {
    const { service, users, tokens } = build(1);
    users.findOne.mockResolvedValue({ id: 3, isSuperAdmin: false, isActive: true });
    await service.updatePlatform(3, { isActive: false }, actor);
    expect(tokens.revokeAllForUser).toHaveBeenCalledWith(3);

    tokens.revokeAllForUser.mockClear();
    await service.remove(3, actor);
    expect(users.softDelete).toHaveBeenCalledWith(3);
    expect(tokens.revokeAllForUser).toHaveBeenCalledWith(3);
  });

  it('stops self-deletion', async () => {
    const { service } = build(5);
    await expect(service.remove(1, actor)).rejects.toThrow(ForbiddenException);
  });
});
