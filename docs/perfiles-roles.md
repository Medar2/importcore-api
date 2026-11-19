# Perfiles de roles — ImportCore RD

Los roles se siembran en `src/database/seeders/admin.seeder.ts` y se pueden
ajustar desde **Admin > Roles** en el frontend. El menú lateral y los botones
solo reflejan permisos; la autoridad final es el backend (`PermissionsGuard`).

## Perfiles disponibles

| Rol | Uso recomendado | Acceso |
| --- | --- | --- |
| `SuperAdmin` | Dueño del sistema / TI | Todos los permisos (bypass). |
| `Gerencia` | Dirección y supervisión | Solo lectura de operación, catálogo, logística, fiscal y auditoría. |
| `Ventas` | Ejecutivos de venta | Cotizaciones (crear/editar/PDF), clientes, catálogo y tasas en lectura. |
| `Operaciones` | Almacén / logística / despacho | Pedidos, despacho (sin override), contenedores, cotizaciones y catálogos. |
| `Compras` | Compras internacionales | Órdenes de compra y pagos a proveedores, proveedores, productos, contenedores. |
| `Contabilidad` | Contador / tesorería | CxC/CxP, pagos, fiscal e-CF/DGII, tasas de cambio y reportes. |
| `Catalogo` | Mantenimiento de datos maestros | Clientes, productos y proveedores (lectura + escritura). |
| `Operador` | Operación amplia (legado) | Prefijo `IMPORTCORE.` completo + personas/organización. |
| `Contador` (legado) | Tesorería amplia | Prefijo `IMPORTCORE.` + reportes + auditoría. |
| `Visualizador` | Consulta general | Solo `READ`/`VER`/`PDF` de ImportCore y actividad. |
| `Usuario` | Usuario básico | Solo lectura de cotizaciones, pedidos, contenedores, catálogos y tasas. |

## Notas

- `IMPORTCORE.ORDERS.OVERRIDE_DISPATCH` queda reservado a SuperAdmin o se
  asigna manualmente a un supervisor; ningún perfil lo incluye por defecto.
- `IMPORTCORE.QUOTES.DELETE` y `IMPORTCORE.QUOTES.CONVERT` existen en el
  catálogo pero hoy ningún controlador los exige; la conversión a pedido usa
  `IMPORTCORE.ORDERS.WRITE`.
- Para crear un perfil nuevo: **Admin > Roles > Nuevo rol** y marcar permisos
  en la matriz (agrupada por recurso dentro de IMPORTCORE).
