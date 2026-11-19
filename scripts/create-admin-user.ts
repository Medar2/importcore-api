import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../src/database/data-source';
import { Organization } from '../src/modules/organization/entities/organization.entity';
import { Permission } from '../src/modules/security/entities/permission.entity';
import { Role } from '../src/modules/security/entities/role.entity';
import { User } from '../src/modules/security/entities/user.entity';
import { Person } from '../src/modules/people/entities/person.entity';
import { IdentityType } from '../src/modules/people/entities/people.enums';

const EMAIL = 'howeiwang@todoimportrd.com';
const USERNAME = 'howeiwang';
const PASSWORD = 'AdmImport-RD*01';
/** Permisos que quedan exclusivos del superadmin (flag isSuperAdmin). */
const SUPERADMIN_ONLY = ['SYSTEM.MIGRATION.EXECUTE'];

async function run() {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(Role);
  const permRepo = AppDataSource.getRepository(Permission);
  const userRepo = AppDataSource.getRepository(User);
  const personRepo = AppDataSource.getRepository(Person);
  const orgRepo = AppDataSource.getRepository(Organization);

  // 1. Rol administrador
  const roles = await roleRepo.find();
  const role =
    roles.find((r) => r.name.toLowerCase() === 'administrador') ??
    roles.find((r) => r.name.toLowerCase().includes('admin'));
  if (!role) throw new Error('No se encontró un rol "administrador". Créalo primero en Admin > Roles.');
  console.log(`Rol encontrado: ${role.name} (${role.id})`);

  // 2. Todos los permisos menos los exclusivos de superadmin
  const allPerms = await permRepo.find();
  const rolePerms = allPerms.filter((p) => !SUPERADMIN_ONLY.includes(p.code));
  role.permissions = rolePerms;
  await roleRepo.save(role);
  console.log(`Rol "${role.name}" ahora tiene ${rolePerms.length}/${allPerms.length} permisos.`);

  // 3. Persona
  let person = await personRepo.findOne({ where: { email: EMAIL } });
  if (!person) {
    person = await personRepo.save(
      personRepo.create({
        firstName: 'Howei',
        lastName: 'Wang',
        email: EMAIL,
        identityType: IdentityType.ID_CARD,
        identityNumber: 'V-00000000',
      }),
    );
    console.log(`Persona creada: ${person.id}`);
  } else {
    console.log(`Persona existente: ${person.id}`);
  }

  // 4. Usuario
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let user = await userRepo.findOne({ where: { username: USERNAME }, relations: ['roles'] });
  const organization = await orgRepo.findOne({ where: { slug: 'organizacion-principal' } });

  if (!user) {
    user = userRepo.create({
      username: USERNAME,
      passwordHash,
      emailVerified: true,
      isSuperAdmin: false,
      status: 'active',
      person,
      mfaEnabled: false,
      mfaSecret: null,
      mfaRecoveryCodes: null,
    });
    if (organization) user.organization = organization;
    console.log('Usuario nuevo creado.');
  } else {
    user.passwordHash = passwordHash;
    user.emailVerified = true;
    user.status = 'active';
    user.isSuperAdmin = false;
    user.person = person;
    if (organization) user.organization = organization;
    console.log(`Usuario existente actualizado: ${user.id}`);
  }

  user.roles = [role];
  await userRepo.save(user);

  console.log('========================================');
  console.log(`Usuario: ${USERNAME}`);
  console.log(`Email:   ${EMAIL}`);
  console.log(`Rol:     ${role.name}`);
  console.log(`Estado:  ${user.status} (activo)`);
  console.log('========================================');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => AppDataSource.destroy());
