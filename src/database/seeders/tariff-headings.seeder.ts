import { DataSource } from 'typeorm';
import { TariffHeading } from '../../modules/tariff-headings/entities/tariff-heading.entity';

/**
 * Partidas arancelarias DGA precargadas (M2).
 * Tasas de referencia; ajustar contra la tabla arancelaria vigente.
 */
const HEADINGS: Array<{
  hsCode: string;
  description: string;
  gravamenRate: string;
  itbisRate: string;
  selectivoRate: string;
}> = [
  { hsCode: '8471.30', description: 'Computadoras portátiles (laptops)', gravamenRate: '0', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '8517.12', description: 'Teléfonos celulares (smartphones)', gravamenRate: '0', itbisRate: '0.18', selectivoRate: '0.10' },
  { hsCode: '6204.62', description: 'Pantalones de mujer, fibra sintética', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '6203.42', description: 'Pantalones de hombre, fibra sintética', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '6109.10', description: 'Camisetas de punto, algodón', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '3926.90', description: 'Artículos de plástico diversos', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '6911.10', description: 'Vaquería de cerámica', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '9403.60', description: 'Muebles de madera', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '8509.80', description: 'Electrodomésticos diversos', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
  { hsCode: '8703.23', description: 'Automóviles de pasajeros, cilindrada media', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0.10' },
  { hsCode: '3304.99', description: 'Productos de belleza', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0.10' },
  { hsCode: '9503.00', description: 'Juguetes', gravamenRate: '0.20', itbisRate: '0.18', selectivoRate: '0' },
];

export class TariffHeadingsSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(TariffHeading);
    for (const h of HEADINGS) {
      const exists = await repo.findOne({ where: { hsCode: h.hsCode } });
      if (!exists) await repo.save(repo.create(h));
    }
    console.log(`TariffHeadingsSeeder: ${HEADINGS.length} partidas verificadas`);
  }
}
