import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from '../../entities/product.entity';
import { StorageService } from '../../../storage/storage.service';

describe('ProductsService - catalog detail', () => {
  let service: ProductsService;

  const productRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
  };

  const storageService = {
    upload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepo,
        },
        {
          provide: StorageService,
          useValue: storageService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('returns related products by tariff, vendor and description', async () => {
    const product = {
      id: 'product-1',
      sku: 'SKU-1',
      description: 'Zapatos deportivos running',
      vendorId: 'vendor-1',
      tariffHeadingId: 'tariff-1',
      isActive: true,
      imageUrls: [],
    };
    const bestMatch = {
      id: 'product-2',
      sku: 'SKU-2',
      description: 'Zapatos running amarillo',
      vendorId: 'vendor-1',
      tariffHeadingId: 'tariff-1',
      isActive: true,
      imageUrls: [],
    };
    const vendorOnly = {
      id: 'product-3',
      sku: 'SKU-3',
      description: 'Mochila urbana',
      vendorId: 'vendor-1',
      tariffHeadingId: 'tariff-2',
      isActive: true,
      imageUrls: [],
    };

    productRepo.findOne.mockResolvedValue(product);
    productRepo.find.mockResolvedValue([product, bestMatch, vendorOnly]);

    const detail = await service.findDetailById('product-1');

    expect(detail.relatedProducts.map((item) => item.id)).toEqual([
      'product-2',
      'product-3',
    ]);
  });

  it('appends uploaded image urls to the product gallery', async () => {
    const product = {
      id: 'product-1',
      sku: 'SKU-1',
      description: 'Producto',
      vendorId: null,
      tariffHeadingId: null,
      isActive: true,
      imageUrls: ['https://cdn.example.com/one.jpg'],
    };

    productRepo.findOne.mockResolvedValue(product);
    productRepo.find.mockResolvedValue([product]);
    productRepo.save.mockImplementation((value) => Promise.resolve(value));
    storageService.upload
      .mockResolvedValueOnce({ url: 'https://cdn.example.com/two.jpg' })
      .mockResolvedValueOnce({ url: 'https://cdn.example.com/three.jpg' });

    const detail = await service.addImages('product-1', [
      {
        buffer: Buffer.from('one'),
        originalName: 'two.jpg',
        mimeType: 'image/jpeg',
        size: 3,
        folder: 'products',
      },
      {
        buffer: Buffer.from('two'),
        originalName: 'three.jpg',
        mimeType: 'image/jpeg',
        size: 3,
        folder: 'products',
      },
    ]);

    expect(storageService.upload).toHaveBeenCalledTimes(2);
    expect(product.imageUrls).toEqual([
      'https://cdn.example.com/one.jpg',
      'https://cdn.example.com/two.jpg',
      'https://cdn.example.com/three.jpg',
    ]);
    expect(detail.relatedProducts).toEqual([]);
  });

  it('rejects updates with unsafe image urls', async () => {
    productRepo.findOne.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      description: 'Producto',
      imageUrls: [],
    });

    await expect(
      service.update('product-1', { imageUrls: ['javascript:alert(1)'] }),
    ).rejects.toThrow('URLs http(s)');
    expect(productRepo.save).not.toHaveBeenCalled();
  });
});
