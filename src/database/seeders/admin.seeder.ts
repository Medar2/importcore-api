import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../../modules/organization/entities/organization.entity';
import { Permission } from '../../modules/security/entities/permission.entity';
import { Role } from '../../modules/security/entities/role.entity';
import { User } from '../../modules/security/entities/user.entity';
import { Person } from '../../modules/people/entities/person.entity';
import { IdentityType } from '../../modules/people/entities/people.enums';

export class AdminSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const organizationRepository = dataSource.getRepository(Organization);
    const permissionRepository = dataSource.getRepository(Permission);
    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);
    const personRepository = dataSource.getRepository(Person);

    // 1. Crear organización por defecto
    let organization = await organizationRepository.findOne({
      where: { slug: 'organizacion-principal' },
    });

    if (!organization) {
      organization = organizationRepository.create({
        name: 'Organización Principal',
        slug: 'organizacion-principal',
        description: 'Organización principal del sistema',
        isActive: true,
        settings: {
          mfaRequired: false,
          sessionTimeout: 60,
          maxSessionPerUser: 5,
          allowConcurrentSessions: true,
        },
      });
      await organizationRepository.save(organization);
    }

    // 2. Crear permisos del sistema
    const permissions = [
      // Administración
      {
        code: 'ADMINISTRACION.USUARIOS.VER',
        name: 'Ver Usuarios',
        module: 'ADMINISTRACION',
        resource: 'USUARIOS',
        action: 'VER',
      },
      {
        code: 'ADMINISTRACION.USUARIOS.CREAR',
        name: 'Crear Usuarios',
        module: 'ADMINISTRACION',
        resource: 'USUARIOS',
        action: 'CREAR',
      },
      {
        code: 'ADMINISTRACION.USUARIOS.EDITAR',
        name: 'Editar Usuarios',
        module: 'ADMINISTRACION',
        resource: 'USUARIOS',
        action: 'EDITAR',
      },
      {
        code: 'ADMINISTRACION.USUARIOS.ELIMINAR',
        name: 'Eliminar Usuarios',
        module: 'ADMINISTRACION',
        resource: 'USUARIOS',
        action: 'ELIMINAR',
      },
      {
        code: 'ADMINISTRACION.USUARIOS.ACTIVAR',
        name: 'Activar Usuarios',
        module: 'ADMINISTRACION',
        resource: 'USUARIOS',
        action: 'ACTIVAR',
      },
      {
        code: 'ADMINISTRACION.USUARIOS.DESACTIVAR',
        name: 'Desactivar Usuarios',
        module: 'ADMINISTRACION',
        resource: 'USUARIOS',
        action: 'DESACTIVAR',
      },

      {
        code: 'ADMINISTRACION.ROLES.VER',
        name: 'Ver Roles',
        module: 'ADMINISTRACION',
        resource: 'ROLES',
        action: 'VER',
      },
      {
        code: 'ADMINISTRACION.ROLES.CREAR',
        name: 'Crear Roles',
        module: 'ADMINISTRACION',
        resource: 'ROLES',
        action: 'CREAR',
      },
      {
        code: 'ADMINISTRACION.ROLES.EDITAR',
        name: 'Editar Roles',
        module: 'ADMINISTRACION',
        resource: 'ROLES',
        action: 'EDITAR',
      },
      {
        code: 'ADMINISTRACION.ROLES.ELIMINAR',
        name: 'Eliminar Roles',
        module: 'ADMINISTRACION',
        resource: 'ROLES',
        action: 'ELIMINAR',
      },

      {
        code: 'ADMINISTRACION.PERMISOS.VER',
        name: 'Ver Permisos',
        module: 'ADMINISTRACION',
        resource: 'PERMISOS',
        action: 'VER',
      },
      {
        code: 'ADMINISTRACION.PERMISOS.ASIGNAR',
        name: 'Asignar Permisos',
        module: 'ADMINISTRACION',
        resource: 'PERMISOS',
        action: 'ASIGNAR',
      },
      {
        code: 'ADMINISTRACION.PERMISOS.REVOCAR',
        name: 'Revocar Permisos',
        module: 'ADMINISTRACION',
        resource: 'PERMISOS',
        action: 'REVOCAR',
      },

      {
        code: 'ADMINISTRACION.AUDITORIA.VER',
        name: 'Ver Auditoría',
        module: 'ADMINISTRACION',
        resource: 'AUDITORIA',
        action: 'VER',
      },

      // Configuración
      {
        code: 'CONFIGURACION.SISTEMA.VER',
        name: 'Ver Configuración Sistema',
        module: 'CONFIGURACION',
        resource: 'SISTEMA',
        action: 'VER',
      },
      {
        code: 'CONFIGURACION.SISTEMA.EDITAR',
        name: 'Editar Configuración Sistema',
        module: 'CONFIGURACION',
        resource: 'SISTEMA',
        action: 'EDITAR',
      },

      {
        code: 'CONFIGURACION.SEGURIDAD.VER',
        name: 'Ver Configuración Seguridad',
        module: 'CONFIGURACION',
        resource: 'SEGURIDAD',
        action: 'VER',
      },
      {
        code: 'CONFIGURACION.SEGURIDAD.EDITAR',
        name: 'Editar Configuración Seguridad',
        module: 'CONFIGURACION',
        resource: 'SEGURIDAD',
        action: 'EDITAR',
      },

      // Reportes
      {
        code: 'REPORTES.USUARIOS.VER',
        name: 'Ver Reportes Usuarios',
        module: 'REPORTES',
        resource: 'USUARIOS',
        action: 'VER',
      },
      {
        code: 'REPORTES.USUARIOS.EXPORTAR',
        name: 'Exportar Reportes Usuarios',
        module: 'REPORTES',
        resource: 'USUARIOS',
        action: 'EXPORTAR',
      },

      {
        code: 'REPORTES.ACTIVIDAD.VER',
        name: 'Ver Reportes Actividad',
        module: 'REPORTES',
        resource: 'ACTIVIDAD',
        action: 'VER',
      },
      {
        code: 'REPORTES.ACTIVIDAD.EXPORTAR',
        name: 'Exportar Reportes Actividad',
        module: 'REPORTES',
        resource: 'ACTIVIDAD',
        action: 'EXPORTAR',
      },

      // RBAC
      {
        code: 'RBAC.PERMISOS.VER',
        name: 'Ver Permisos RBAC',
        module: 'RBAC',
        resource: 'PERMISOS',
        action: 'VER',
      },
      {
        code: 'RBAC.PERMISOS.CHECK',
        name: 'Verificar Permisos',
        module: 'RBAC',
        resource: 'PERMISOS',
        action: 'CHECK',
      },
      {
        code: 'RBAC.PERMISOS.DELEGAR',
        name: 'Delegar Permisos',
        module: 'RBAC',
        resource: 'PERMISOS',
        action: 'DELEGAR',
      },

      // Organización
      {
        code: 'ORGANIZACION.VER',
        name: 'Ver Organizaciones',
        module: 'ORGANIZACION',
        resource: 'ORGANIZACION',
        action: 'VER',
      },
      {
        code: 'ORGANIZACION.CREAR',
        name: 'Crear Organizaciones',
        module: 'ORGANIZACION',
        resource: 'ORGANIZACION',
        action: 'CREAR',
      },
      {
        code: 'ORGANIZACION.EDITAR',
        name: 'Editar Organizaciones',
        module: 'ORGANIZACION',
        resource: 'ORGANIZACION',
        action: 'EDITAR',
      },
      {
        code: 'ORGANIZACION.ELIMINAR',
        name: 'Eliminar Organizaciones',
        module: 'ORGANIZACION',
        resource: 'ORGANIZACION',
        action: 'ELIMINAR',
      },

      // Políticas
      {
        code: 'POLITICAS.VER',
        name: 'Ver Políticas',
        module: 'POLITICAS',
        resource: 'POLITICAS',
        action: 'VER',
      },
      {
        code: 'POLITICAS.CREAR',
        name: 'Crear Políticas',
        module: 'POLITICAS',
        resource: 'POLITICAS',
        action: 'CREAR',
      },
      {
        code: 'POLITICAS.EDITAR',
        name: 'Editar Políticas',
        module: 'POLITICAS',
        resource: 'POLITICAS',
        action: 'EDITAR',
      },
      {
        code: 'POLITICAS.ELIMINAR',
        name: 'Eliminar Políticas',
        module: 'POLITICAS',
        resource: 'POLITICAS',
        action: 'ELIMINAR',
      },

      // Migración
      {
        code: 'SYSTEM.MIGRATION.EXECUTE',
        name: 'Ejecutar Migración',
        module: 'SYSTEM',
        resource: 'MIGRATION',
        action: 'EXECUTE',
      },

      // Personas
      {
        code: 'PEOPLE.READ',
        name: 'Ver Personas',
        module: 'PERSONAS',
        resource: 'PERSONAS',
        action: 'READ',
      },
      {
        code: 'PEOPLE.WRITE',
        name: 'Crear/Editar Personas',
        module: 'PERSONAS',
        resource: 'PERSONAS',
        action: 'WRITE',
      },
      {
        code: 'PEOPLE.DELETE',
        name: 'Eliminar Personas',
        module: 'PERSONAS',
        resource: 'PERSONAS',
        action: 'DELETE',
      },

      // ImportCore RD - Cotizaciones y Landed Cost (M2/M3)
      {
        code: 'IMPORTCORE.QUOTES.CREATE',
        name: 'Crear Cotizaciones',
        module: 'IMPORTCORE',
        resource: 'QUOTES',
        action: 'CREATE',
      },
      {
        code: 'IMPORTCORE.QUOTES.READ',
        name: 'Ver Cotizaciones',
        module: 'IMPORTCORE',
        resource: 'QUOTES',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.QUOTES.UPDATE',
        name: 'Editar Cotizaciones',
        module: 'IMPORTCORE',
        resource: 'QUOTES',
        action: 'UPDATE',
      },
      {
        code: 'IMPORTCORE.QUOTES.DELETE',
        name: 'Eliminar Cotizaciones',
        module: 'IMPORTCORE',
        resource: 'QUOTES',
        action: 'DELETE',
      },
      {
        code: 'IMPORTCORE.QUOTES.CONVERT',
        name: 'Convertir Cotizacion a Pedido',
        module: 'IMPORTCORE',
        resource: 'QUOTES',
        action: 'CONVERT',
      },
      {
        code: 'IMPORTCORE.QUOTES.PDF',
        name: 'Generar PDF de Cotizacion',
        module: 'IMPORTCORE',
        resource: 'QUOTES',
        action: 'PDF',
      },

      // ImportCore RD - Pedidos y Despacho (M5/M7, BR-003)
      {
        code: 'IMPORTCORE.ORDERS.READ',
        name: 'Ver Pedidos',
        module: 'IMPORTCORE',
        resource: 'ORDERS',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.ORDERS.WRITE',
        name: 'Gestionar Pedidos',
        module: 'IMPORTCORE',
        resource: 'ORDERS',
        action: 'WRITE',
      },
      {
        code: 'IMPORTCORE.ORDERS.REGISTER_PAYMENT',
        name: 'Registrar Pagos de Clientes',
        module: 'IMPORTCORE',
        resource: 'ORDERS',
        action: 'REGISTER_PAYMENT',
      },
      {
        code: 'IMPORTCORE.ORDERS.AUTHORIZE_DISPATCH',
        name: 'Autorizar Despacho de Pedido',
        module: 'IMPORTCORE',
        resource: 'ORDERS',
        action: 'AUTHORIZE_DISPATCH',
      },
      {
        code: 'IMPORTCORE.ORDERS.OVERRIDE_DISPATCH',
        name: 'Override de Candado de Despacho (supervisor)',
        module: 'IMPORTCORE',
        resource: 'ORDERS',
        action: 'OVERRIDE_DISPATCH',
      },

      // ImportCore RD - Contenedores y Logistica (M4)
      {
        code: 'IMPORTCORE.CONTAINERS.READ',
        name: 'Ver Contenedores',
        module: 'IMPORTCORE',
        resource: 'CONTAINERS',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.CONTAINERS.WRITE',
        name: 'Gestionar Contenedores',
        module: 'IMPORTCORE',
        resource: 'CONTAINERS',
        action: 'WRITE',
      },

      // ImportCore RD - Maestros (M2)
      {
        code: 'IMPORTCORE.CUSTOMERS.READ',
        name: 'Ver Clientes',
        module: 'IMPORTCORE',
        resource: 'CUSTOMERS',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.CUSTOMERS.WRITE',
        name: 'Gestionar Clientes',
        module: 'IMPORTCORE',
        resource: 'CUSTOMERS',
        action: 'WRITE',
      },
      {
        code: 'IMPORTCORE.PRODUCTS.READ',
        name: 'Ver Productos',
        module: 'IMPORTCORE',
        resource: 'PRODUCTS',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.PRODUCTS.WRITE',
        name: 'Gestionar Productos',
        module: 'IMPORTCORE',
        resource: 'PRODUCTS',
        action: 'WRITE',
      },
      {
        code: 'IMPORTCORE.VENDORS.READ',
        name: 'Ver Proveedores',
        module: 'IMPORTCORE',
        resource: 'VENDORS',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.VENDORS.WRITE',
        name: 'Gestionar Proveedores',
        module: 'IMPORTCORE',
        resource: 'VENDORS',
        action: 'WRITE',
      },

      // ImportCore RD - Compras y CxP (Fase 2)
      {
        code: 'IMPORTCORE.PURCHASES.READ',
        name: 'Ver Ordenes de Compra',
        module: 'IMPORTCORE',
        resource: 'PURCHASES',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.PURCHASES.WRITE',
        name: 'Gestionar Ordenes de Compra',
        module: 'IMPORTCORE',
        resource: 'PURCHASES',
        action: 'WRITE',
      },
      {
        code: 'IMPORTCORE.PURCHASES.REGISTER_PAYMENT',
        name: 'Registrar Pagos a Proveedores',
        module: 'IMPORTCORE',
        resource: 'PURCHASES',
        action: 'REGISTER_PAYMENT',
      },

      // ImportCore RD - Fiscal y Reportes DGII (M8)
      {
        code: 'IMPORTCORE.FISCAL.READ',
        name: 'Ver Reportes Fiscales DGII',
        module: 'IMPORTCORE',
        resource: 'FISCAL',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.FISCAL.EMIT_ECF',
        name: 'Emitir Comprobantes Fiscales Electronicos',
        module: 'IMPORTCORE',
        resource: 'FISCAL',
        action: 'EMIT_ECF',
      },
      {
        code: 'IMPORTCORE.FISCAL.MANAGE',
        name: 'Gestionar Secuencias e-NCF y Compras Fiscales (606)',
        module: 'IMPORTCORE',
        resource: 'FISCAL',
        action: 'MANAGE',
      },
      {
        code: 'IMPORTCORE.EXCHANGE_RATES.READ',
        name: 'Ver Tasas de Cambio',
        module: 'IMPORTCORE',
        resource: 'EXCHANGE_RATES',
        action: 'READ',
      },
      {
        code: 'IMPORTCORE.EXCHANGE_RATES.MANAGE',
        name: 'Gestionar Tasas de Cambio',
        module: 'IMPORTCORE',
        resource: 'EXCHANGE_RATES',
        action: 'MANAGE',
      },
    ];

    for (const permData of permissions) {
      let permission = await permissionRepository.findOne({
        where: { code: permData.code },
      });

      if (!permission) {
        permission = permissionRepository.create({
          code: permData.code,
          name: permData.name,
          description: permData.name,
          module: permData.module,
          resource: permData.resource,
          action: permData.action,
        });
        await permissionRepository.save(permission);
      }
    }

    // 3. Crear rol de SuperAdmin
    let superAdminRole = await roleRepository.findOne({
      where: { name: 'SuperAdmin' },
    });

    if (!superAdminRole) {
      superAdminRole = roleRepository.create({
        name: 'SuperAdmin',
        description: 'Administrador del sistema con todos los permisos',
        isSystem: true,
        isSystemRole: true,
        isGlobal: true,
      });
      await roleRepository.save(superAdminRole);
    }

    // Asignar todos los permisos al rol SuperAdmin
    const allPermissions = await permissionRepository.find();
    superAdminRole.permissions = allPermissions;
    await roleRepository.save(superAdminRole);

    // Crear roles especializados de ImportCore RD (spec M1)
    const importCoreRolesData: {
      name: string;
      description: string;
      permissionPrefixes?: string[];
      permissionCodes?: string[];
      /** Solo acciones de consulta (READ/VER/PDF) dentro de los prefijos. */
      readOnly?: boolean;
    }[] = [
      {
        name: 'Operador',
        description:
          'Operación diaria: cotizaciones, pedidos, contenedores y registro de pagos',
        permissionPrefixes: [
          'IMPORTCORE.',
          'PEOPLE.',
          'ORGANIZACION.',
        ],
      },
      {
        name: 'Contador',
        description:
          'Tesorería, cuentas por cobrar/pagar, reportes DGII 606/607/608 y contabilidad',
        permissionPrefixes: [
          'IMPORTCORE.',
          'REPORTES.',
          'ADMINISTRACION.AUDITORIA.',
        ],
      },
      {
        name: 'Visualizador',
        description:
          'Solo consulta de tableros, pedidos y reportes ejecutivos',
        permissionPrefixes: [
          'IMPORTCORE.',
          'REPORTES.ACTIVIDAD.',
        ],
        readOnly: true,
      },
    ];

    for (const roleData of importCoreRolesData) {
      let role = await roleRepository.findOne({
        where: { name: roleData.name },
      });
      if (!role) {
        role = roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          isSystem: false,
          isSystemRole: false,
          isGlobal: true,
        });
        role = await roleRepository.save(role);
      }

      let rolePerms: Permission[] = [];
      const codes = roleData.permissionCodes ?? [];
      const prefixes = roleData.permissionPrefixes ?? [];
      if (codes.length > 0) {
        rolePerms = allPermissions.filter((p) => codes.includes(p.code));
      } else if (prefixes.length > 0) {
        rolePerms = allPermissions.filter((p) =>
          prefixes.some((prefix) => p.code.startsWith(prefix)),
        );
      }
      if (roleData.readOnly) {
        rolePerms = rolePerms.filter((p) => /\.(READ|VER|PDF)$/.test(p.code));
      }
      role.permissions = rolePerms;
      await roleRepository.save(role);
    }

    // 4. Crear persona para el admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@importcore.local';
    let adminPerson = await personRepository.findOne({
      where: { email: adminEmail },
    });

    if (!adminPerson) {
      adminPerson = personRepository.create({
        firstName: 'Administrador',
        lastName: 'ImportCore',
        email: adminEmail,
        identityType: IdentityType.ID_CARD,
        identityNumber: 'V-12345678',
      });
      await personRepository.save(adminPerson);
    }

    // 5. Crear usuario admin
    let adminUser = await userRepository.findOne({
      where: { username: 'admin' },
    });

    if (!adminUser) {
      const adminPassword =
        process.env.ADMIN_PASSWORD || 'Jose.Caraballo.*!123';
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      adminUser = userRepository.create({
        username: 'admin',
        passwordHash,
        emailVerified: true,
        isSuperAdmin: true,
        status: 'active',
        person: adminPerson,
        organization,
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
      });
      await userRepository.save(adminUser);
    }

    // Asignar rol SuperAdmin al usuario admin
    if (
      !adminUser.roles ||
      !adminUser.roles.some((r) => r.id === superAdminRole.id)
    ) {
      adminUser.roles = [superAdminRole];
      await userRepository.save(adminUser);
    }

    // 6. Crear rol de Usuario Básico
    let userRole = await roleRepository.findOne({
      where: { name: 'Usuario' },
    });

    if (!userRole) {
      userRole = roleRepository.create({
        name: 'Usuario',
        description: 'Usuario básico del sistema',
        isSystem: false,
        isSystemRole: false,
        isGlobal: true,
      });
      await roleRepository.save(userRole);
    }

    // Rol Usuario: consulta operativa sin acceso a administración,
    // configuración (incluye SMTP) ni datos de otros usuarios.
    const basicPermissionCodes = [
      'IMPORTCORE.QUOTES.READ',
      'IMPORTCORE.ORDERS.READ',
      'IMPORTCORE.CONTAINERS.READ',
      'IMPORTCORE.CUSTOMERS.READ',
      'IMPORTCORE.PRODUCTS.READ',
      'IMPORTCORE.VENDORS.READ',
      'IMPORTCORE.EXCHANGE_RATES.READ',
    ];

    const basicPermissions = await permissionRepository.find({
      where: basicPermissionCodes.map((code) => ({ code })),
    });

    userRole.permissions = basicPermissions;
    await roleRepository.save(userRole);

    // 7. Crear usuario de prueba
    let testPerson = await personRepository.findOne({
      where: { email: 'usuario@prueba.com' },
    });

    if (!testPerson) {
      testPerson = personRepository.create({
        firstName: 'Usuario',
        lastName: 'Prueba',
        email: 'usuario@prueba.com',
        identityType: IdentityType.ID_CARD,
        identityNumber: 'V-87654321',
      });
      await personRepository.save(testPerson);
    }

    let testUser = await userRepository.findOne({
      where: { username: 'usuario' },
    });

    if (!testUser) {
      const testPassword = await bcrypt.hash('TestUser123!', 10);

      testUser = userRepository.create({
        username: 'usuario',
        passwordHash: testPassword,
        emailVerified: true,
        isSuperAdmin: false,
        status: 'active',
        person: testPerson,
        organization,
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
      });
      await userRepository.save(testUser);
    }

    // Asignar rol Usuario al usuario de prueba
    if (!testUser.roles || !testUser.roles.some((r) => r.id === userRole.id)) {
      testUser.roles = [userRole];
      await userRepository.save(testUser);
    }

    console.log('Seeder ejecutado exitosamente');
    console.log('Usuario admin creado: admin');
    console.log(
      'Contraseña admin: (usando variable de entorno ADMIN_PASSWORD)',
    );
    console.log('Usuario de prueba creado: usuario');
    console.log('Contraseña prueba: TestUser123!');
  }
}
