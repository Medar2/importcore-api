import { AppDataSource } from '../src/database/data-source';
import { AdminSeeder } from '../src/database/seeders/admin.seeder';
import { TariffHeadingsSeeder } from '../src/database/seeders/tariff-headings.seeder';
import { ImportCoreDataSeeder } from '../src/database/seeders/importcore-data.seeder';

async function runSeeder() {
  console.log('Iniciando ejecución completa de seeders...');

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Conexión a la base de datos establecida (Neon / PostgreSQL)');
    }

    // 1. Permisos, roles y usuarios
    const adminSeeder = new AdminSeeder();
    await adminSeeder.run(AppDataSource);

    // 2. Partidas arancelarias oficiales
    const tariffsSeeder = new TariffHeadingsSeeder();
    await tariffsSeeder.run(AppDataSource);

    // 3. Datos base ImportCore (Contenedores, Órdenes, Ventas, Clientes, etc.)
    const importCoreDataSeeder = new ImportCoreDataSeeder();
    await importCoreDataSeeder.run(AppDataSource);

    console.log('\n========================================');
    console.log('Todos los seeders se ejecutaron con éxito.');
    console.log('========================================');
    console.log('Credenciales de acceso:');
    console.log('----------------------------------------');
    console.log('Usuario SuperAdmin:');
    console.log('  Username: admin');
    console.log(`  Contraseña: ${process.env.ADMIN_PASSWORD || 'Jose.Caraballo.*!123'}`);
    console.log(`  Email: ${process.env.ADMIN_EMAIL || 'admin@importcore.local'}`);
    console.log('----------------------------------------');
    console.log('Usuario Operativo de Prueba:');
    console.log('  Username: usuario');
    console.log('  Contraseña: TestUser123!');
    console.log('  Email: usuario@prueba.com');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error ejecutando seeder:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runSeeder();
