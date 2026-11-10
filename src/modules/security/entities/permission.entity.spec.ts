import { Permission } from './permission.entity';

describe('Permission Entity', () => {
  it('should create a permission instance with hierarchy fields', () => {
    const permission = new Permission();
    permission.id = '123e4567-e89b-12d3-a456-426614174000';
    permission.code = 'USERS.PROFILE.READ';
    permission.name = 'Read User Profile';
    permission.description = 'Allows reading user profile information';
    permission.module = 'USERS';
    permission.resource = 'PROFILE';
    permission.action = 'READ';
    permission.parentId = '123e4567-e89b-12d3-a456-426614174001';
    permission.groupId = '123e4567-e89b-12d3-a456-426614174002';

    expect(permission.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(permission.code).toBe('USERS.PROFILE.READ');
    expect(permission.name).toBe('Read User Profile');
    expect(permission.description).toBe(
      'Allows reading user profile information',
    );
    expect(permission.module).toBe('USERS');
    expect(permission.resource).toBe('PROFILE');
    expect(permission.action).toBe('READ');
    expect(permission.parentId).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(permission.groupId).toBe('123e4567-e89b-12d3-a456-426614174002');
  });

  it('should allow nullable parentId and groupId', () => {
    const permission = new Permission();
    permission.id = '123e4567-e89b-12d3-a456-426614174000';
    permission.code = 'USERS.*.*';
    permission.name = 'All User Permissions';
    permission.module = 'USERS';
    permission.resource = '*';
    permission.action = '*';
    permission.parentId = null;
    permission.groupId = null;

    expect(permission.parentId).toBeNull();
    expect(permission.groupId).toBeNull();
  });

  it('should support self-referencing hierarchy', () => {
    const parentPermission = new Permission();
    parentPermission.id = '123e4567-e89b-12d3-a456-426614174001';
    parentPermission.code = 'USERS.*.*';
    parentPermission.name = 'All User Permissions';
    parentPermission.module = 'USERS';
    parentPermission.resource = '*';
    parentPermission.action = '*';

    const childPermission = new Permission();
    childPermission.id = '123e4567-e89b-12d3-a456-426614174000';
    childPermission.code = 'USERS.PROFILE.READ';
    childPermission.name = 'Read User Profile';
    childPermission.module = 'USERS';
    childPermission.resource = 'PROFILE';
    childPermission.action = 'READ';
    childPermission.parentId = parentPermission.id;
    childPermission.parent = parentPermission;

    parentPermission.children = [childPermission];

    expect(childPermission.parent).toBe(parentPermission);
    expect(parentPermission.children).toContain(childPermission);
    expect(childPermission.parentId).toBe(parentPermission.id);
  });
});
