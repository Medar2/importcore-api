import { DataSource } from 'typeorm';
import { Organization } from '../../modules/organization/entities/organization.entity';
import { Company } from '../../modules/organization/entities/company.entity';
import { SystemConfig } from '../../modules/config/entities/system-config.entity';
import { ExchangeRate } from '../../modules/currency/entities/exchange-rate.entity';
import { TariffHeading } from '../../modules/tariff-headings/entities/tariff-heading.entity';
import { Vendor } from '../../modules/vendors/entities/vendor.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { ShipmentContainer } from '../../modules/shipping/entities/shipment-container.entity';
import { Quote } from '../../modules/landed-cost/entities/quote.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { OrderPayment } from '../../modules/orders/entities/order-payment.entity';
import { NcfSequence } from '../../modules/fiscal/entities/ncf-sequence.entity';
import { FiscalDocument } from '../../modules/fiscal/entities/fiscal-document.entity';
import { PurchaseOrder } from '../../modules/purchases/entities/purchase-order.entity';
import { PurchasePayment } from '../../modules/purchases/entities/purchase-payment.entity';
import { FiscalPurchase } from '../../modules/fiscal/entities/fiscal-purchase.entity';

export class ImportCoreDataSeeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('--- Iniciando Seeder de Datos de Prueba ImportCore ---');

    const orgRepo = dataSource.getRepository(Organization);
    const companyRepo = dataSource.getRepository(Company);
    const configRepo = dataSource.getRepository(SystemConfig);
    const rateRepo = dataSource.getRepository(ExchangeRate);
    const tariffRepo = dataSource.getRepository(TariffHeading);
    const vendorRepo = dataSource.getRepository(Vendor);
    const productRepo = dataSource.getRepository(Product);
    const customerRepo = dataSource.getRepository(Customer);
    const containerRepo = dataSource.getRepository(ShipmentContainer);
    const quoteRepo = dataSource.getRepository(Quote);
    const orderRepo = dataSource.getRepository(Order);
    const orderPaymentRepo = dataSource.getRepository(OrderPayment);
    const ncfSeqRepo = dataSource.getRepository(NcfSequence);
    const fiscalDocRepo = dataSource.getRepository(FiscalDocument);
    const poRepo = dataSource.getRepository(PurchaseOrder);
    const poPaymentRepo = dataSource.getRepository(PurchasePayment);
    const fiscalPurchaseRepo = dataSource.getRepository(FiscalPurchase);

    // 1. Asegurar Organización Principal
    let organization = await orgRepo.findOne({ where: { slug: 'organizacion-principal' } });
    if (!organization) {
      organization = orgRepo.create({
        name: 'Organización Principal',
        slug: 'organizacion-principal',
        description: 'Organización principal del sistema',
        isActive: true,
      });
      await orgRepo.save(organization);
    }

    // 2. Configuración Fiscal y Empresa Emisora
    const COMPANY_RNC = '131880703'; // RNC válido mod11
    const COMPANY_NAME = 'Todo Import RD, SRL';

    const systemConfigs = [
      { key: 'FISCAL.COMPANY_RNC', value: COMPANY_RNC, description: 'RNC emisor para facturación e-CF', group: 'FISCAL' },
      { key: 'FISCAL.COMPANY_NAME', value: COMPANY_NAME, description: 'Razón social emisora e-CF', group: 'FISCAL' },
      { key: 'SYSTEM.TIMEZONE', value: 'America/Santo_Domingo', description: 'Zona horaria oficial', group: 'REGIONAL' },
      { key: 'SYSTEM.DATE_FORMAT', value: 'yyyy-MM-dd', description: 'Formato de fecha', group: 'REGIONAL' },
      { key: 'SYSTEM.TIME_FORMAT', value: 'HH:mm:ss', description: 'Formato de hora', group: 'REGIONAL' },
      { key: 'SYSTEM.DATE_TIME_FORMAT', value: 'yyyy-MM-dd HH:mm:ss', description: 'Formato de fecha y hora', group: 'REGIONAL' },
      { key: 'VALIDATION.CEDULA_DOMINICANA', value: 'true', description: 'Validación de cédulas JCE', group: 'VALIDATION' },
    ];

    for (const conf of systemConfigs) {
      const existing = await configRepo.findOne({ where: { key: conf.key } });
      if (!existing) {
        await configRepo.save(configRepo.create(conf));
      } else {
        existing.value = conf.value;
        await configRepo.save(existing);
      }
    }

    let company = await companyRepo.findOne({ where: { taxId: COMPANY_RNC } });
    if (!company) {
      company = companyRepo.create({
        name: COMPANY_NAME,
        taxId: COMPANY_RNC,
        email: 'administracion@todoimportrd.com',
        phone: '809-555-0199',
        website: 'https://todoimportrd.com',
        country: 'República Dominicana',
        city: 'Santo Domingo',
        stateProvince: 'Distrito Nacional',
        sector: 'Piantini',
        street: 'Av. Winston Churchill #1099, Torre Empresarial',
        status: 'active',
        organizationId: organization.id,
      });
      await companyRepo.save(company);
    }

    // 3. Tasas de Cambio (USD -> DOP, USD -> CNY)
    const today = new Date().toISOString().slice(0, 10);
    const ratesData = [
      { baseCurrency: 'USD' as const, quoteCurrency: 'DOP' as const, rate: '60.250000', effectiveDate: today, source: 'BANCO_CENTRAL_RD' },
      { baseCurrency: 'USD' as const, quoteCurrency: 'CNY' as const, rate: '7.240000', effectiveDate: today, source: 'PBoC' },
    ];

    for (const r of ratesData) {
      const exists = await rateRepo.findOne({
        where: { baseCurrency: r.baseCurrency, quoteCurrency: r.quoteCurrency, effectiveDate: r.effectiveDate },
      });
      if (!exists) {
        await rateRepo.save(rateRepo.create(r));
      }
    }

    // 4. Secuencias de e-NCF para Facturación Electrónica (DGII)
    const sequences = [
      { ecfType: '31' as const, currentNumber: '8', endNumber: '1000000', expiresAt: '2027-12-31', isActive: true },
      { ecfType: '32' as const, currentNumber: '2', endNumber: '1000000', expiresAt: '2027-12-31', isActive: true },
    ];

    for (const seq of sequences) {
      const exists = await ncfSeqRepo.findOne({ where: { ecfType: seq.ecfType } });
      if (!exists) {
        await ncfSeqRepo.save(ncfSeqRepo.create(seq));
      }
    }

    // 5. Suplidores Internacionales (China / Fabricantes)
    const vendorsData = [
      {
        name: 'Shenzhen Electronics Tech Co., Ltd.',
        tradeName: 'SZ Tech Ltd.',
        countryCode: 'CN',
        contact: 'Chen Wei',
        phone: '+86 755 8321 0001',
        email: 'sales@sztech.cn',
        address: 'Baoan District, Shenzhen, Guangdong, China',
        paymentTerms: '30% deposit, 70% before shipment',
        isActive: true,
      },
      {
        name: 'Guangzhou Apex Hardware & Tools Ltd.',
        tradeName: 'Apex Tools',
        countryCode: 'CN',
        contact: 'Li Ming',
        phone: '+86 20 8912 3456',
        email: 'export@apextools.com.cn',
        address: 'Panyu Industrial Zone, Guangzhou, China',
        paymentTerms: '30% deposit, 70% against BL copy',
        isActive: true,
      },
      {
        name: 'Yiwu Global Wholesale Trading Ltd.',
        tradeName: 'Yiwu Global',
        countryCode: 'CN',
        contact: 'Zhang Wei',
        phone: '+86 579 8555 1234',
        email: 'info@yiwuglobal.cn',
        address: 'Chouzhou North Rd, Yiwu, Zhejiang, China',
        paymentTerms: '50% deposit, 50% before dispatch',
        isActive: true,
      },
      {
        name: 'Ningbo Marine & Logistics Gear Ltd.',
        tradeName: 'Ningbo Marine',
        countryCode: 'CN',
        contact: 'Wang Lei',
        phone: '+86 574 8765 4321',
        email: 'orders@ningbomarine.com',
        address: 'Beilun Port Area, Ningbo, China',
        paymentTerms: '100% TT advance',
        isActive: true,
      },
    ];

    const vendors: Vendor[] = [];
    for (const v of vendorsData) {
      let vendor = await vendorRepo.findOne({ where: { name: v.name } });
      if (!vendor) {
        vendor = await vendorRepo.save(vendorRepo.create(v));
      }
      vendors.push(vendor);
    }

    // 6. Productos con Dimensiones CBM, Peso y Partidas Arancelarias
    const allTariffs = await tariffRepo.find();
    const getTariffId = (hs: string) => allTariffs.find((t) => t.hsCode === hs)?.id || null;

    const productsData = [
      {
        sku: 'LAPTOP-PRO-15',
        description: 'Laptop Corporativa 15.6" Intel Core i7 16GB RAM SSD 512GB',
        vendorId: vendors[0].id,
        tariffHeadingId: getTariffId('8471.30'),
        unitsPerBox: 5,
        boxesPerPallet: 20,
        boxLengthM: '0.4500',
        boxWidthM: '0.3500',
        boxHeightM: '0.2500',
        boxGrossWeightKg: '12.5000',
        unitFobPriceUsd: '450.0000',
        isActive: true,
      },
      {
        sku: 'PHONE-SMART-6',
        description: 'Smartphone Android 6.7" AMOLED 256GB Dual SIM 5G',
        vendorId: vendors[0].id,
        tariffHeadingId: getTariffId('8517.12'),
        unitsPerBox: 20,
        boxesPerPallet: 30,
        boxLengthM: '0.3000',
        boxWidthM: '0.2500',
        boxHeightM: '0.2000',
        boxGrossWeightKg: '6.0000',
        unitFobPriceUsd: '180.0000',
        isActive: true,
      },
      {
        sku: 'POWER-BANK-20K',
        description: 'Batería Portátil Externa 20,000mAh Power Delivery 65W Fast Charge',
        vendorId: vendors[0].id,
        tariffHeadingId: getTariffId('8509.80'),
        unitsPerBox: 40,
        boxesPerPallet: 25,
        boxLengthM: '0.3500',
        boxWidthM: '0.3000',
        boxHeightM: '0.2000',
        boxGrossWeightKg: '18.0000',
        unitFobPriceUsd: '18.5000',
        isActive: true,
      },
      {
        sku: 'DRILL-CORDLESS-20V',
        description: 'Taladro Percutor Inalámbrico Industrial 20V con 2 Baterías Litio',
        vendorId: vendors[1].id,
        tariffHeadingId: getTariffId('8471.30'),
        unitsPerBox: 4,
        boxesPerPallet: 18,
        boxLengthM: '0.5000',
        boxWidthM: '0.4000',
        boxHeightM: '0.3000',
        boxGrossWeightKg: '16.0000',
        unitFobPriceUsd: '42.0000',
        isActive: true,
      },
      {
        sku: 'TOOL-SET-108PCS',
        description: 'Set de Herramientas Mecánicas Profesional 108 Piezas Cromo Vanadio',
        vendorId: vendors[1].id,
        tariffHeadingId: getTariffId('3926.90'),
        unitsPerBox: 2,
        boxesPerPallet: 24,
        boxLengthM: '0.4800',
        boxWidthM: '0.3800',
        boxHeightM: '0.2200',
        boxGrossWeightKg: '14.5000',
        unitFobPriceUsd: '35.0000',
        isActive: true,
      },
      {
        sku: 'LED-FLOODLIGHT-100W',
        description: 'Reflector Solar LED 100W Exterior Resistente IP66 con Control Remoto',
        vendorId: vendors[1].id,
        tariffHeadingId: getTariffId('8509.80'),
        unitsPerBox: 10,
        boxesPerPallet: 20,
        boxLengthM: '0.4000',
        boxWidthM: '0.3500',
        boxHeightM: '0.3000',
        boxGrossWeightKg: '15.0000',
        unitFobPriceUsd: '22.0000',
        isActive: true,
      },
      {
        sku: 'DESK-CHAIR-ERGO',
        description: 'Silla Ejecutiva Ergonómica Reclinable Transpirable Mesh con Cabecera',
        vendorId: vendors[2].id,
        tariffHeadingId: getTariffId('9403.60'),
        unitsPerBox: 1,
        boxesPerPallet: 12,
        boxLengthM: '0.6500',
        boxWidthM: '0.6000',
        boxHeightM: '0.3500',
        boxGrossWeightKg: '16.5000',
        unitFobPriceUsd: '65.0000',
        isActive: true,
      },
      {
        sku: 'PLASTIC-STORAGE-50L',
        description: 'Caja Organizadora Plástica de Almacenaje 50 Litros con Trancas y Ruedas',
        vendorId: vendors[2].id,
        tariffHeadingId: getTariffId('3926.90'),
        unitsPerBox: 6,
        boxesPerPallet: 16,
        boxLengthM: '0.6000',
        boxWidthM: '0.4500',
        boxHeightM: '0.4000',
        boxGrossWeightKg: '9.0000',
        unitFobPriceUsd: '12.5000',
        isActive: true,
      },
      {
        sku: 'KIDS-TOY-DRONE',
        description: 'Mini Dron Cuadricóptero para Niños con Cámara HD y Sensor Anti-Colisión',
        vendorId: vendors[2].id,
        tariffHeadingId: getTariffId('9503.00'),
        unitsPerBox: 12,
        boxesPerPallet: 20,
        boxLengthM: '0.4200',
        boxWidthM: '0.3200',
        boxHeightM: '0.2800',
        boxGrossWeightKg: '7.2000',
        unitFobPriceUsd: '24.0000',
        isActive: true,
      },
      {
        sku: 'AUTO-LED-HEADLIGHT',
        description: 'Kit de Bombillos LED Automotriz Alta Potencia H4/H7 12V 6000K Luz Blanca',
        vendorId: vendors[3].id,
        tariffHeadingId: getTariffId('8703.23'),
        unitsPerBox: 25,
        boxesPerPallet: 40,
        boxLengthM: '0.3800',
        boxWidthM: '0.3000',
        boxHeightM: '0.2500',
        boxGrossWeightKg: '8.5000',
        unitFobPriceUsd: '15.0000',
        isActive: true,
      },
    ];

    const products: Product[] = [];
    for (const p of productsData) {
      let prod = await productRepo.findOne({ where: { sku: p.sku } });
      if (!prod) {
        prod = await productRepo.save(productRepo.create(p));
      }
      products.push(prod);
    }

    // 7. Clientes Dominicanos (Con RNC y Cédulas válidas por algoritmo DGII)
    const customersData = [
      {
        name: 'Distribuidora Dominicana de Tecnología, SRL',
        taxId: '131880703',
        customerType: 'NACIONAL' as const,
        phone: '809-567-1122',
        email: 'compras@domintech.com.do',
        address: 'Av. 27 de Febrero #450, Ensanche Quisqueya, Santo Domingo',
        notes: 'Cliente corporativo mayorista tech',
        isActive: true,
      },
      {
        name: 'Comercial Caribe Industrial, SAS',
        taxId: '101010101',
        customerType: 'NACIONAL' as const,
        phone: '809-582-4400',
        email: 'adquisiciones@caribeindustrial.com.do',
        address: 'Av. Bartolomé Colón #12, Los Jardines, Santiago',
        notes: 'Distribuidor ferretero zona norte',
        isActive: true,
      },
      {
        name: 'Ferretería & Construcciones El Cibao, SRL',
        taxId: '130987653',
        customerType: 'NACIONAL' as const,
        phone: '809-573-8899',
        email: 'ventas@ferreteriacibao.do',
        address: 'Calle Pedro A. Rivera Km 2, La Vega',
        notes: 'Construcción y ferretería mayorista',
        isActive: true,
      },
      {
        name: 'Inversiones Gómez & Asociados, SRL',
        taxId: '132456785',
        customerType: 'NACIONAL' as const,
        phone: '809-598-3311',
        email: 'administracion@inversionesgomez.com.do',
        address: 'Av. Charles de Gaulle #88, Santo Domingo Este',
        notes: 'Mobiliario comercial y retail',
        isActive: true,
      },
      {
        name: 'Juan Carlos Pérez Ramírez',
        taxId: '00118492012', // Cédula 11 dígitos válida
        customerType: 'NACIONAL' as const,
        phone: '829-340-9988',
        email: 'jcperez@gmail.com',
        address: 'Calle El Sol #23, Mirador Sur, Santo Domingo, D.N.',
        notes: 'Persona física - importación comercial',
        isActive: true,
      },
      {
        name: 'Auto Repuestos Las Américas, EIRL',
        taxId: '133557797',
        customerType: 'NACIONAL' as const,
        phone: '809-699-7755',
        email: 'repuestoslasamericas@hotmail.com',
        address: 'Av. Hermanas Mirabal #305, Villa Mella, Santo Domingo Norte',
        notes: 'Repuestos e iluminación automotriz',
        isActive: true,
      },
    ];

    const customers: Customer[] = [];
    for (const c of customersData) {
      let cust = await customerRepo.findOne({ where: { taxId: c.taxId } });
      if (!cust) {
        cust = await customerRepo.save(customerRepo.create(c));
      }
      customers.push(cust);
    }

    // 8. Dos Contenedores (1 En Tránsito 40_HC, 1 Arribado 20_ST)
    const containersData = [
      {
        containerNumber: 'MSKU9284710',
        containerType: '40_HC' as const,
        status: 'IN_TRANSIT' as const,
        sealNumber: 'ML-CN-884120',
        blNumber: 'MSK984712034',
        etd: '2026-11-04',
        eta: '2026-11-24',
        ata: null,
        demurrageFreeDays: 7,
        demurrageDailyRateUsd: '120.00',
        notes: 'Embarque Shanghai -> DP World Caucedo. Nave: Maersk Mc-Kinney Moller.',
      },
      {
        containerNumber: 'CMAU7361842',
        containerType: '20_ST' as const,
        status: 'ARRIVED' as const,
        sealNumber: 'CMA-992015',
        blNumber: 'CMA837192015',
        etd: '2026-10-20',
        eta: '2026-11-16',
        ata: '2026-11-17',
        demurrageFreeDays: 5,
        demurrageDailyRateUsd: '95.00',
        notes: 'Embarque Ningbo -> HIT Puerto Río Haina. Arribado, proceso de aforo.',
      },
    ];

    const containers: ShipmentContainer[] = [];
    for (const cont of containersData) {
      let c = await containerRepo.findOne({ where: { containerNumber: cont.containerNumber } });
      if (!c) {
        c = await containerRepo.save(containerRepo.create(cont));
      }
      containers.push(c);
    }

    // 9. Cotizaciones Base (Quotes)
    const quotesPlan = [
      { number: 'COT-2026-001', cust: customers[0], cont: containers[1], status: 'CONVERTED' as const, fob: '12000.00', landed: '14250.00' },
      { number: 'COT-2026-002', cust: customers[1], cont: containers[1], status: 'CONVERTED' as const, fob: '7500.00', landed: '8900.00' },
      { number: 'COT-2026-003', cust: customers[2], cont: containers[1], status: 'CONVERTED' as const, fob: '9600.00', landed: '11400.00' },
      { number: 'COT-2026-004', cust: customers[3], cont: containers[1], status: 'CONVERTED' as const, fob: '5400.00', landed: '6500.00' },
      { number: 'COT-2026-005', cust: customers[0], cont: containers[0], status: 'CONVERTED' as const, fob: '19000.00', landed: '22800.00' },
      { number: 'COT-2026-006', cust: customers[1], cont: containers[0], status: 'CONVERTED' as const, fob: '15500.00', landed: '18400.00' },
      { number: 'COT-2026-007', cust: customers[4], cont: containers[0], status: 'CONVERTED' as const, fob: '4300.00', landed: '5200.00' },
      { number: 'COT-2026-008', cust: customers[5], cont: containers[0], status: 'CONVERTED' as const, fob: '8200.00', landed: '9750.00' },
      { number: 'COT-2026-009', cust: customers[2], cont: null, status: 'CONVERTED' as const, fob: '10200.00', landed: '12300.00' },
      { number: 'COT-2026-010', cust: customers[3], cont: null, status: 'CONVERTED' as const, fob: '6500.00', landed: '7800.00' },
      { number: 'COT-2026-011', cust: customers[4], cont: null, status: 'CONVERTED' as const, fob: '3500.00', landed: '4150.00' },
      { number: 'COT-2026-012', cust: customers[5], cont: containers[1], status: 'CONVERTED' as const, fob: '2700.00', landed: '3200.00' },
    ];

    const quotes: Quote[] = [];
    for (const qp of quotesPlan) {
      let q = await quoteRepo.findOne({ where: { quoteNumber: qp.number } });
      if (!q) {
        const calcResult = {
          currency: 'USD' as const,
          prorationBasis: 'CBM',
          recommendedContainer: qp.cont?.containerType || '20_ST',
          totals: {
            cbm: '8.50',
            weightKg: '2200.00',
            fobUsd: qp.fob,
            freightUsd: '950.00',
            insuranceUsd: '85.00',
            cifUsd: (parseFloat(qp.fob) + 1035).toFixed(2),
            gravamenUsd: '450.00',
            selectivoUsd: '0.00',
            itbisUsd: '729.00',
            landedCostUsd: qp.landed,
            customerPriceUsd: qp.landed,
          },
          items: [
            {
              description: 'Mercancía de importación consolidada',
              units: 100,
              cbm: '8.50',
              fobUsd: qp.fob,
              proratedFreightUsd: '950.00',
              proratedInsuranceUsd: '85.00',
              cifUsd: (parseFloat(qp.fob) + 1035).toFixed(2),
              gravamenUsd: '450.00',
              selectivoUsd: '0.00',
              itbisUsd: '729.00',
              landedCostUsd: qp.landed,
              unitLandedCostUsd: (parseFloat(qp.landed) / 100).toFixed(2),
              unitCustomerPriceUsd: (parseFloat(qp.landed) / 100).toFixed(2),
            },
          ],
        };

        q = await quoteRepo.save(
          quoteRepo.create({
            quoteNumber: qp.number,
            customerName: qp.cust.name,
            customerId: qp.cust.id,
            containerId: qp.cont ? qp.cont.id : null,
            status: qp.status,
            currency: 'USD',
            landedCostUsd: qp.landed,
            customerPriceUsd: qp.landed,
            requestSnapshot: { customerId: qp.cust.id, notes: 'Cotización importación' },
            calculationResult: calcResult,
          }),
        );
      }
      quotes.push(q);
    }

    // 10. Órdenes de Importación (12 órdenes con variedad de estados y montos)
    const ordersPlan = [
      {
        orderNumber: 'OD-20261110-A101',
        customer: customers[0],
        container: containers[1],
        quote: quotes[0],
        status: 'READY' as const,
        totalUsd: '14250.0000',
        notes: 'Pedido con 100% de pago registrado. Listo para retiro en almacén Haina.',
        product: products[0],
        qty: 30,
      },
      {
        orderNumber: 'OD-20261110-A102',
        customer: customers[1],
        container: containers[1],
        quote: quotes[1],
        status: 'DISPATCHED' as const,
        totalUsd: '8900.0000',
        notes: 'Despachado y entregado al cliente en Santiago de los Caballeros.',
        product: products[3],
        qty: 150,
      },
      {
        orderNumber: 'OD-20261112-A103',
        customer: customers[2],
        container: containers[1],
        quote: quotes[2],
        status: 'ARRIVED' as const,
        totalUsd: '11400.0000',
        notes: 'En puerto Río Haina. Pago parcial: despacho bloqueado por saldo restante.',
        product: products[4],
        qty: 250,
      },
      {
        orderNumber: 'OD-20261112-A104',
        customer: customers[3],
        container: containers[1],
        quote: quotes[3],
        status: 'ARRIVED' as const,
        totalUsd: '6500.0000',
        notes: 'Arribado en contenedor 2. Totalmente saldo vía transferencia DOP.',
        product: products[7],
        qty: 400,
      },
      {
        orderNumber: 'OD-20261114-B201',
        customer: customers[0],
        container: containers[0],
        quote: quotes[4],
        status: 'IN_TRANSIT' as const,
        totalUsd: '22800.0000',
        notes: 'En tránsito marítimo hacia Caucedo. Anticipo del 50% recibido.',
        product: products[1],
        qty: 100,
      },
      {
        orderNumber: 'OD-20261114-B202',
        customer: customers[1],
        container: containers[0],
        quote: quotes[5],
        status: 'IN_TRANSIT' as const,
        totalUsd: '18400.0000',
        notes: 'En tránsito en contenedor 40HC. Totalmente prepagado.',
        product: products[5],
        qty: 600,
      },
      {
        orderNumber: 'OD-20261115-B203',
        customer: customers[4],
        container: containers[0],
        quote: quotes[6],
        status: 'IN_TRANSIT' as const,
        totalUsd: '5200.0000',
        notes: 'En tránsito. Anticipo del 30% registrado.',
        product: products[2],
        qty: 200,
      },
      {
        orderNumber: 'OD-20261116-B204',
        customer: customers[5],
        container: containers[0],
        quote: quotes[7],
        status: 'CONFIRMED' as const,
        totalUsd: '9750.0000',
        notes: 'Confirmado y asignado a contenedor 1 para despacho en origen.',
        product: products[9],
        qty: 500,
      },
      {
        orderNumber: 'OD-20261117-C301',
        customer: customers[2],
        container: null,
        quote: quotes[8],
        status: 'CONFIRMED' as const,
        totalUsd: '12300.0000',
        notes: 'Confirmado con anticipo. Pendiente de asignación de contenedor próximo embarque.',
        product: products[6],
        qty: 150,
      },
      {
        orderNumber: 'OD-20261118-C302',
        customer: customers[3],
        container: null,
        quote: quotes[9],
        status: 'PENDING' as const,
        totalUsd: '7800.0000',
        notes: 'Pendiente de anticipo inicial por parte del cliente.',
        product: products[8],
        qty: 250,
      },
      {
        orderNumber: 'OD-20261118-C303',
        customer: customers[4],
        container: null,
        quote: quotes[10],
        status: 'PENDING' as const,
        totalUsd: '4150.0000',
        notes: 'Nuevo pedido en espera de validación de crédito.',
        product: products[2],
        qty: 180,
      },
      {
        orderNumber: 'OD-20261105-D401',
        customer: customers[5],
        container: containers[1],
        quote: quotes[11],
        status: 'CANCELLED' as const,
        totalUsd: '3200.0000',
        notes: 'Pedido cancelado por desistimiento del cliente antes del despacho.',
        product: products[9],
        qty: 150,
      },
    ];

    const orders: Order[] = [];
    for (const op of ordersPlan) {
      let order = await orderRepo.findOne({ where: { orderNumber: op.orderNumber } });
      if (!order) {
        const itemSnapshot = [
          {
            sku: op.product.sku,
            description: op.product.description,
            units: op.qty,
            unitPriceUsd: (parseFloat(op.totalUsd) / op.qty).toFixed(2),
            totalPriceUsd: op.totalUsd,
          },
        ];

        order = await orderRepo.save(
          orderRepo.create({
            orderNumber: op.orderNumber,
            customerId: op.customer.id,
            quoteId: op.quote.id,
            containerId: op.container ? op.container.id : null,
            status: op.status,
            currency: 'USD',
            totalUsd: op.totalUsd,
            itemsSnapshot: itemSnapshot,
            notes: op.notes,
          }),
        );
      }
      orders.push(order);
    }

    // 11. Pagos de Clientes (OrderPayment)
    const paymentsPlan = [
      // Order 1: READY ($14,250) -> Pagos $7,000 + $7,250 = $14,250 (100%)
      { order: orders[0], amount: '7000.0000', amountUsd: '7000.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-BPD-991024', date: '2026-11-10', notes: 'Anticipo 50%' },
      { order: orders[0], amount: '7250.0000', amountUsd: '7250.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-BPD-993812', date: '2026-11-18', notes: 'Liquidación final contra aviso de arribo' },

      // Order 2: DISPATCHED ($8,900) -> Pago $8,900 (100%)
      { order: orders[1], amount: '8900.0000', amountUsd: '8900.0000', cur: 'USD', rate: null, method: 'CHECK' as const, ref: 'CHQ-BHD-440192', date: '2026-11-11', notes: 'Pago completo recibido y cobrado' },

      // Order 3: ARRIVED ($11,400) -> Pago parcial $8,000 (Pendiente $3,400)
      { order: orders[2], amount: '8000.0000', amountUsd: '8000.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-BANRESERVAS-55012', date: '2026-11-12', notes: 'Pago parcial. Pendiente US$3,400 para liberación.' },

      // Order 4: ARRIVED ($6,500) -> Pagado en DOP (391,625 DOP @ 60.25 = $6,500 USD)
      { order: orders[3], amount: '391625.0000', amountUsd: '6500.0000', cur: 'DOP', rate: '60.250000', method: 'TRANSFER' as const, ref: 'TRF-BPD-DOP-7821', date: '2026-11-13', notes: 'Pago total en pesos dominicanos @ 60.25' },

      // Order 5: IN_TRANSIT ($22,800) -> Anticipo 50% ($11,400)
      { order: orders[4], amount: '11400.0000', amountUsd: '11400.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-CITI-882190', date: '2026-11-14', notes: 'Anticipo 50% orden internacional' },

      // Order 6: IN_TRANSIT ($18,400) -> Pagos $10,000 + $8,400 = $18,400 (100%)
      { order: orders[5], amount: '10000.0000', amountUsd: '10000.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-BPD-661209', date: '2026-11-14', notes: 'Anticipo inicial' },
      { order: orders[5], amount: '8400.0000', amountUsd: '8400.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-BPD-663451', date: '2026-11-17', notes: 'Completivo 100%' },

      // Order 7: IN_TRANSIT ($5,200) -> Anticipo 30% ($1,560)
      { order: orders[6], amount: '1560.0000', amountUsd: '1560.0000', cur: 'USD', rate: null, method: 'CASH' as const, ref: 'REC-CAJA-0045', date: '2026-11-15', notes: 'Depósito en efectivo' },

      // Order 8: CONFIRMED ($9,750) -> Anticipo 40% ($3,900)
      { order: orders[7], amount: '3900.0000', amountUsd: '3900.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-SCOTIA-11029', date: '2026-11-16', notes: 'Anticipo para producción en fábrica' },

      // Order 9: CONFIRMED ($12,300) -> Anticipo 50% ($6,150)
      { order: orders[8], amount: '6150.0000', amountUsd: '6150.0000', cur: 'USD', rate: null, method: 'TRANSFER' as const, ref: 'TRF-BHD-990182', date: '2026-11-17', notes: 'Anticipo 50%' },
    ];

    for (const p of paymentsPlan) {
      const exists = await orderPaymentRepo.findOne({
        where: { orderId: p.order.id, reference: p.ref },
      });
      if (!exists) {
        await orderPaymentRepo.save(
          orderPaymentRepo.create({
            orderId: p.order.id,
            currency: p.cur,
            amount: p.amount,
            amountUsd: p.amountUsd,
            exchangeRate: p.rate,
            method: p.method,
            reference: p.ref,
            paidAt: p.date,
            notes: p.notes,
          }),
        );
      }
    }

    // 12. Ventas y Facturación Electrónica e-CF (FiscalDocument)
    // Se emiten 10 e-CF representativos: E31 (Crédito Fiscal) y E32 (Consumo)
    const fiscalDocsPlan = [
      { order: orders[0], seq: 1, type: '31' as const, customer: customers[0], date: '2026-11-10', subDop: '858562.50', itbisDop: '154541.25', totDop: '1013103.75', trf: '1013103.75', crd: '0.00' },
      { order: orders[1], seq: 2, type: '31' as const, customer: customers[1], date: '2026-11-10', subDop: '536225.00', itbisDop: '96520.50', totDop: '632745.50', trf: '632745.50', crd: '0.00' },
      { order: orders[2], seq: 3, type: '31' as const, customer: customers[2], date: '2026-11-12', subDop: '686850.00', itbisDop: '123633.00', totDop: '810483.00', trf: '482000.00', crd: '328483.00' },
      { order: orders[3], seq: 4, type: '31' as const, customer: customers[3], date: '2026-11-12', subDop: '391625.00', itbisDop: '70492.50', totDop: '462117.50', trf: '462117.50', crd: '0.00' },
      { order: orders[4], seq: 5, type: '31' as const, customer: customers[0], date: '2026-11-14', subDop: '1373700.00', itbisDop: '247266.00', totDop: '1620966.00', trf: '686850.00', crd: '934116.00' },
      { order: orders[5], seq: 6, type: '31' as const, customer: customers[1], date: '2026-11-14', subDop: '1108600.00', itbisDop: '199548.00', totDop: '1308148.00', trf: '1308148.00', crd: '0.00' },
      { order: orders[6], seq: 1, type: '32' as const, customer: customers[4], date: '2026-11-15', subDop: '313300.00', itbisDop: '56394.00', totDop: '369694.00', trf: '94000.00', crd: '275694.00' },
      { order: orders[7], seq: 7, type: '31' as const, customer: customers[5], date: '2026-11-16', subDop: '587437.50', itbisDop: '105738.75', totDop: '693176.25', trf: '234975.00', crd: '458201.25' },
      { order: orders[8], seq: 8, type: '31' as const, customer: customers[2], date: '2026-11-17', subDop: '741075.00', itbisDop: '133393.50', totDop: '874468.50', trf: '370537.50', crd: '503931.00' },
      { order: orders[10], seq: 2, type: '32' as const, customer: customers[4], date: '2026-11-18', subDop: '250037.50', itbisDop: '45006.75', totDop: '295044.25', trf: '0.00', crd: '295044.25' },
    ];

    for (const fd of fiscalDocsPlan) {
      const encf = `E${fd.type}${String(fd.seq).padStart(10, '0')}`;
      const exists = await fiscalDocRepo.findOne({ where: { encf } });
      if (!exists) {
        await fiscalDocRepo.save(
          fiscalDocRepo.create({
            encf,
            ecfType: fd.type,
            issueDate: fd.date,
            orderId: fd.order.id,
            customerId: fd.customer.id,
            buyerTaxId: fd.customer.taxId,
            buyerName: fd.customer.name,
            incomeType: '01',
            totalUsd: fd.order.totalUsd,
            exchangeRate: '60.250000',
            itbisRate: '0.1800',
            subtotalDop: fd.subDop,
            itbisDop: fd.itbisDop,
            totalDop: fd.totDop,
            paymentBreakdown: {
              cash: '0.00',
              transfer: fd.trf,
              card: '0.00',
              credit: fd.crd,
            },
            status: 'ACCEPTED',
            provider: 'mock',
            trackId: `MOCK-${encf}`,
            securityCode: `SEC${Math.floor(100000 + Math.random() * 900000)}`,
            providerMessage: 'Comprobante recibido y aprobado por DGII (Simulado)',
          }),
        );
      }
    }

    // 13. Órdenes de Compra a Suplidores en Origen (Purchase Orders)
    const poPlan = [
      { poNumber: 'PO-20261101-0001', vendor: vendors[0], order: orders[0], status: 'RECEIVED' as const, total: '9000.0000', date: '2026-11-15', notes: 'Compra laptops corporativas', items: [{ sku: products[0].sku, units: 30, costUsd: '300.00' }] },
      { poNumber: 'PO-20261102-0002', vendor: vendors[1], order: orders[1], status: 'RECEIVED' as const, total: '5200.0000', date: '2026-11-15', notes: 'Compra taladros industriales', items: [{ sku: products[3].sku, units: 150, costUsd: '34.66' }] },
      { poNumber: 'PO-20261105-0003', vendor: vendors[1], order: orders[2], status: 'RECEIVED' as const, total: '7100.0000', date: '2026-11-16', notes: 'Compra sets de herramientas', items: [{ sku: products[4].sku, units: 250, costUsd: '28.40' }] },
      { poNumber: 'PO-20261108-0004', vendor: vendors[0], order: orders[4], status: 'IN_TRANSIT' as const, total: '14500.0000', date: '2026-11-24', notes: 'Compra smartphones 5G', items: [{ sku: products[1].sku, units: 100, costUsd: '145.00' }] },
      { poNumber: 'PO-20261110-0005', vendor: vendors[1], order: orders[5], status: 'IN_TRANSIT' as const, total: '11200.0000', date: '2026-11-24', notes: 'Compra reflectores LED solares', items: [{ sku: products[5].sku, units: 600, costUsd: '18.66' }] },
      { poNumber: 'PO-20261112-0006', vendor: vendors[3], order: orders[7], status: 'CONFIRMED' as const, total: '6000.0000', date: '2026-11-30', notes: 'Compra kits bombillos automotrices', items: [{ sku: products[9].sku, units: 500, costUsd: '12.00' }] },
    ];

    const purchaseOrders: PurchaseOrder[] = [];
    for (const pop of poPlan) {
      let po = await poRepo.findOne({ where: { poNumber: pop.poNumber } });
      if (!po) {
        po = await poRepo.save(
          poRepo.create({
            poNumber: pop.poNumber,
            vendorId: pop.vendor.id,
            orderId: pop.order.id,
            status: pop.status,
            currency: 'USD',
            totalUsd: pop.total,
            itemsSnapshot: pop.items,
            expectedDate: pop.date,
            notes: pop.notes,
          }),
        );
      }
      purchaseOrders.push(po);
    }

    // Pagos de compras a proveedores (PurchasePayment)
    const poPayments = [
      { po: purchaseOrders[0], amount: '9000.0000', date: '2026-11-02', ref: 'SWIFT-BPD-10029', notes: 'Transferencia bancaria internacional 100%' },
      { po: purchaseOrders[1], amount: '5200.0000', date: '2026-11-03', ref: 'SWIFT-BPD-10045', notes: 'Pago completo fábrica' },
      { po: purchaseOrders[2], amount: '7100.0000', date: '2026-11-06', ref: 'SWIFT-CITI-33011', notes: 'Liquidación BL' },
      { po: purchaseOrders[3], amount: '14500.0000', date: '2026-11-09', ref: 'SWIFT-BPD-10892', notes: 'Pago contra zarpe de buque' },
      { po: purchaseOrders[4], amount: '11200.0000', date: '2026-11-11', ref: 'SWIFT-BPD-10990', notes: 'Pago completo' },
      { po: purchaseOrders[5], amount: '3000.0000', date: '2026-11-13', ref: 'SWIFT-BPD-11102', notes: 'Anticipo 50% inicio producción' },
    ];

    for (const pop of poPayments) {
      const exists = await poPaymentRepo.findOne({
        where: { purchaseOrderId: pop.po.id, reference: pop.ref },
      });
      if (!exists) {
        await poPaymentRepo.save(
          poPaymentRepo.create({
            purchaseOrderId: pop.po.id,
            currency: 'USD',
            amount: pop.amount,
            amountUsd: pop.amount,
            exchangeRate: null,
            method: 'TRANSFER',
            reference: pop.ref,
            paidAt: pop.date,
            notes: pop.notes,
          }),
        );
      }
    }

    // 14. Gastos Locales y Facturas de Compra Local (Reporte 606 DGII)
    const localPurchases = [
      {
        supplierTaxId: '101000016',
        supplierTaxIdType: '1' as const,
        supplierName: 'Maersk Dominicana, SAS',
        goodsServicesType: '02' as const, // Trabajos, suministros y servicios
        ncf: 'B01000008491',
        invoiceDate: '2026-11-16',
        paymentDate: '2026-11-17',
        servicesAmount: '45000.0000',
        goodsAmount: '0.0000',
        itbisBilled: '8100.0000',
        itbisWithheld: '0.0000',
        itbisToCost: '0.0000',
        isrWithholdingType: null,
        isrWithheld: '0.0000',
        selectiveTax: '0.0000',
        otherTaxes: '0.0000',
        legalTip: '0.0000',
        paymentMethod: '02' as const, // Transferencia
        purchaseOrderId: purchaseOrders[0].id,
        notes: 'Gastos locales y manejo de contenedor CMAU7361842 en puerto',
      },
      {
        supplierTaxId: '130000028',
        supplierTaxIdType: '1' as const,
        supplierName: 'Agencia Aduanal del Caribe, SRL',
        goodsServicesType: '02' as const,
        ncf: 'B01000012903',
        invoiceDate: '2026-11-17',
        paymentDate: '2026-11-18',
        servicesAmount: '18500.0000',
        goodsAmount: '0.0000',
        itbisBilled: '3330.0000',
        itbisWithheld: '0.0000',
        itbisToCost: '0.0000',
        isrWithholdingType: null,
        isrWithheld: '0.0000',
        selectiveTax: '0.0000',
        otherTaxes: '0.0000',
        legalTip: '0.0000',
        paymentMethod: '02' as const,
        purchaseOrderId: purchaseOrders[1].id,
        notes: 'Honorarios gestión aduanal DGA desaduanaje',
      },
    ];

    for (const lp of localPurchases) {
      const exists = await fiscalPurchaseRepo.findOne({
        where: { supplierTaxId: lp.supplierTaxId, ncf: lp.ncf },
      });
      if (!exists) {
        await fiscalPurchaseRepo.save(fiscalPurchaseRepo.create(lp));
      }
    }

    console.log('--- Seeder de Datos de Prueba ImportCore Finalizado Exitosamente ---');
    console.log(`- 2 Contenedores (MSKU9284710 40HC en tránsito, CMAU7361842 20ST arribado)`);
    console.log(`- ${customers.length} Clientes dominicanos con RNC/Cédula válidos`);
    console.log(`- ${vendors.length} Suplidores internacionales`);
    console.log(`- ${products.length} Productos importables con pesos, CBM y partidas arancelarias`);
    console.log(`- ${quotes.length} Cotizaciones`);
    console.log(`- ${orders.length} Órdenes de importación en estados (READY, DISPATCHED, ARRIVED, IN_TRANSIT, CONFIRMED, PENDING, CANCELLED)`);
    console.log(`- ${paymentsPlan.length} Pagos de clientes registrados (USD / DOP)`);
    console.log(`- ${fiscalDocsPlan.length} Ventas con comprobantes fiscales electrónicos (e-CF E31 y E32)`);
    console.log(`- ${purchaseOrders.length} Órdenes de compra a suplidores y sus pagos correspondientes`);
    console.log(`- ${localPurchases.length} Gastos locales para reporte 606 DGII`);
  }
}
