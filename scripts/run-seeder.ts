import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { AdminSeeder } from '../src/database/seeders/admin.seeder';
import { TariffHeadingsSeeder } from '../src/database/seeders/tariff-headings.seeder';

// Cargar variables de entorno
config({ path: join(__dirname, '..', '.env') });

async function runSeeder() {
    console.log('Iniciando seeder...');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5430'),
        username: process.env.POSTGRES_USERNAME || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DATABASE || 'importcore_db',
        entities: [join(__dirname, '..', 'src', '**', '*.entity.ts')],
        synchronize: false,
        logging: true,
    });

    try {
        await dataSource.initialize();
        console.log('Conexión a la base de datos establecida');

        // Ejecutar seeder
        const seeder = new AdminSeeder();
        await seeder.run(dataSource);

        const tariffs = new TariffHeadingsSeeder();
        await tariffs.run(dataSource);

        console.log('Seeder ejecutado exitosamente');
        console.log('========================================');
        console.log('Credenciales creadas:');
        console.log('----------------------------------------');
        console.log('Usuario Admin:');
        console.log('  Username: admin');
        console.log(`  Contraseña: ${process.env.ADMIN_PASSWORD || 'Jose.Caraballo.*!123'}`);
        console.log(`  Email: ${process.env.ADMIN_EMAIL || 'admin@importcore.local'}`);
        console.log('  Rol: SuperAdmin (todos los permisos)');
        console.log('----------------------------------------');
        console.log('Usuario de Prueba:');
        console.log('  Username: usuario');
        console.log('  Contraseña: TestUser123!');
        console.log('  Email: usuario@prueba.com');
        console.log('  Rol: Usuario (permisos básicos)');
        console.log('========================================');
    } catch (error) {
        console.error('Error ejecutando seeder:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

runSeeder();