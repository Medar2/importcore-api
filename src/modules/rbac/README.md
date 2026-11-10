# RBAC Module

Este módulo implementa el sistema de Control de Acceso Basado en Roles (RBAC) para el Sistema de Seguridad Granular.

## Servicios

### RBACService

Servicio principal para la gestión de permisos y roles.

#### Métodos

##### assignPermissionToUser(userId, permissionCode, options?)

Asigna un permiso directo a un usuario con contexto opcional.

**Parámetros:**
- `userId` (string): ID del usuario
- `permissionCode` (string): Código del permiso en formato MODULO.RECURSO.ACCION
- `options` (AssignPermissionOptions, opcional):
  - `context`: Contexto del permiso (organizationId, projectId, resourceId, etc.)
  - `type`: Tipo de permiso ('direct', 'provisional', 'temporary')
  - `startsAt`: Fecha de inicio (para permisos temporales)
  - `expiresAt`: Fecha de expiración (para permisos temporales)

**Retorna:** `Promise<UserPermission>`

**Excepciones:**
- `BadRequestException`: Si el formato del permiso es inválido o el permiso ya está asignado
- `NotFoundException`: Si el usuario o el permiso no existen

**Ejemplo:**
```typescript
await rbacService.assignPermissionToUser(
  'user-123',
  'USERS.PROFILE.READ',
  {
    context: { organizationId: 'org-456' },
    type: 'direct'
  }
);
```

##### assignPermissionToRole(roleId, permissionCode, context?)

Asigna un permiso a un rol con contexto opcional.

**Parámetros:**
- `roleId` (string): ID del rol
- `permissionCode` (string): Código del permiso en formato MODULO.RECURSO.ACCION
- `context` (objeto, opcional): Contexto del permiso

**Retorna:** `Promise<RolePermission>`

**Excepciones:**
- `BadRequestException`: Si el formato del permiso es inválido o el permiso ya está asignado
- `NotFoundException`: Si el rol o el permiso no existen

**Ejemplo:**
```typescript
await rbacService.assignPermissionToRole(
  'role-123',
  'USERS.PROFILE.READ',
  { organizationId: 'org-456' }
);
```

##### revokeUserPermission(userPermissionId)

Revoca un permiso directo de un usuario.

**Parámetros:**
- `userPermissionId` (string): ID del permiso de usuario

**Retorna:** `Promise<void>`

**Excepciones:**
- `NotFoundException`: Si el permiso de usuario no existe

**Ejemplo:**
```typescript
await rbacService.revokeUserPermission('up-123');
```

##### revokeRolePermission(rolePermissionId)

Revoca un permiso de un rol.

**Parámetros:**
- `rolePermissionId` (string): ID del permiso de rol

**Retorna:** `Promise<void>`

**Excepciones:**
- `NotFoundException`: Si el permiso de rol no existe

**Ejemplo:**
```typescript
await rbacService.revokeRolePermission('rp-123');
```

##### assignRoleToUser(userId, roleId)

Asigna un rol a un usuario.

**Parámetros:**
- `userId` (string): ID del usuario
- `roleId` (string): ID del rol

**Retorna:** `Promise<void>`

**Excepciones:**
- `BadRequestException`: Si el usuario ya tiene el rol
- `NotFoundException`: Si el usuario o el rol no existen

**Ejemplo:**
```typescript
await rbacService.assignRoleToUser('user-123', 'role-456');
```

##### revokeRoleFromUser(userId, roleId)

Revoca un rol de un usuario.

**Parámetros:**
- `userId` (string): ID del usuario
- `roleId` (string): ID del rol

**Retorna:** `Promise<void>`

**Excepciones:**
- `BadRequestException`: Si el usuario no tiene el rol
- `NotFoundException`: Si el usuario no existe

**Ejemplo:**
```typescript
await rbacService.revokeRoleFromUser('user-123', 'role-456');
```

## Validaciones

### Formato de Permisos

Todos los códigos de permisos deben seguir el formato `MODULO.RECURSO.ACCION`:

- **MODULO**: Módulo del sistema (ej: USERS, PROJECTS, REPORTS)
- **RECURSO**: Recurso dentro del módulo (ej: PROFILE, SETTINGS, DASHBOARD)
- **ACCION**: Acción sobre el recurso (ej: READ, WRITE, DELETE)

**Ejemplos válidos:**
- `USERS.PROFILE.READ`
- `PROJECTS.SETTINGS.WRITE`
- `REPORTS.DASHBOARD.DELETE`

**Ejemplos inválidos:**
- `USERS.READ` (falta una parte)
- `USERS..READ` (parte vacía)
- `INVALID` (formato incorrecto)

## Caché

El servicio invalida automáticamente el caché de permisos cuando:

1. Se asigna o revoca un permiso directo a un usuario
2. Se asigna o revoca un permiso a un rol (invalida caché de todos los usuarios con ese rol)
3. Se asigna o revoca un rol a un usuario

Esto asegura que los cambios de permisos se reflejen inmediatamente en las verificaciones de acceso.

## Auditoría

Todas las operaciones de gestión de permisos deben ser registradas en el audit log. Esto se implementará en fases posteriores mediante:

1. Interceptores de auditoría
2. Integración con el AuditService
3. Registro de eventos de cambio de permisos

## Testing

El módulo incluye pruebas unitarias completas que cubren:

- Validación de formato de permisos
- Manejo de errores (usuarios/roles/permisos no encontrados)
- Prevención de duplicados
- Invalidación de caché
- Asignación y revocación de permisos y roles

Para ejecutar las pruebas:

```bash
npm test -- rbac.service.spec.ts
```

## Próximos Pasos

Las siguientes funcionalidades se implementarán en tareas posteriores:

1. **Permisos temporales**: Soporte completo para permisos con fecha de inicio y expiración
2. **Delegación de permisos**: Permitir a usuarios delegar sus permisos temporalmente
3. **Verificación de permisos**: Servicio para verificar si un usuario tiene un permiso específico
4. **Ownership-based access**: Control de acceso basado en propiedad de recursos
5. **Políticas dinámicas**: Motor de evaluación de políticas en tiempo real
6. **Permisos provisionales**: Permisos por excepción con justificación y aprobación
