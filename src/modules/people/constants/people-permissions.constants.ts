export const PEOPLE_PERMISSIONS = {
  READ: 'PEOPLE.READ',
  WRITE: 'PEOPLE.WRITE',
  DELETE: 'PEOPLE.DELETE',
} as const;

export type PeoplePermission =
  (typeof PEOPLE_PERMISSIONS)[keyof typeof PEOPLE_PERMISSIONS];
