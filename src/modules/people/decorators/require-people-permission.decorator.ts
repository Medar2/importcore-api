import { SetMetadata } from '@nestjs/common';
import { PeoplePermission } from '../constants/people-permissions.constants';

export const REQUIRE_PEOPLE_PERMISSION_KEY = 'require_people_permission';
export const RequirePeoplePermission = (permission: PeoplePermission) =>
  SetMetadata(REQUIRE_PEOPLE_PERMISSION_KEY, permission);
