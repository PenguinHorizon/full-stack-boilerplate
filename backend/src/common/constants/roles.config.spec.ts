import {
  canManageRole,
  PERMISSIONS,
  permissionsFor,
  ROLE_PERMISSIONS,
  OrganizationRole,
} from './roles.config';

const { Owner, Admin, Manager, Member } = OrganizationRole;

describe('role → permission matrix', () => {
  /*
   * Changing access for a role must update this snapshot, which makes it
   * visible in review.
   */
  it('matches the documented matrix', () => {
    expect(ROLE_PERMISSIONS).toMatchSnapshot();
  });

  it('only references known permissions', () => {
    for (const permissions of Object.values(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(PERMISSIONS).toContain(permission);
      }
    }
  });

  it('gives the owner everything and the admin everything except domains', () => {
    expect(permissionsFor(Owner)).toEqual([...PERMISSIONS]);
    expect(permissionsFor(Admin)).not.toContain('organization.domains');
    expect(permissionsFor(Admin)).toHaveLength(PERMISSIONS.length - 1);
  });

  it('keeps members read-mostly', () => {
    expect(permissionsFor(Member)).not.toContain('team.manage');
    expect(permissionsFor(Member)).not.toContain('content.manage');
  });

  it('grants a super admin every permission, with or without a role', () => {
    expect(permissionsFor(null, true)).toEqual([...PERMISSIONS]);
    expect(permissionsFor(null)).toEqual([]);
  });
});

describe('canManageRole', () => {
  it.each([
    [Owner, Owner, true],
    [Owner, Member, true],
    [Admin, Owner, false],
    [Admin, Admin, false],
    [Admin, Manager, true],
    [Admin, Member, true],
    [Manager, Member, true],
    [Manager, Manager, false],
    [Manager, Admin, false],
    [Member, Member, false],
    [null, Member, false],
  ])('%s managing %s → %s', (actor, target, expected) => {
    expect(
      canManageRole(actor as OrganizationRole | null, target as OrganizationRole),
    ).toBe(expected);
  });

  it('lets a super admin manage any role', () => {
    expect(canManageRole(null, Owner, true)).toBe(true);
  });
});
