import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { CategoriasService } from '../categorias/categorias.service.js';
import { Producto } from './entities/producto.entity.js';
import { PRODUCT_USAGE_PORT } from './product-usage.port.js';
import type { ProductUsagePort } from './product-usage.port.js';
import { ProductosService } from './productos.service.js';
import {
  createMockRepository,
  type MockRepository,
} from '../../test/utils/mock-repository.js';
import {
  createServiceTestModule,
  provideMockRepository,
} from '../../test/utils/test-module.helper.js';

describe('ProductosService', () => {
  let module: TestingModule;
  let service: ProductosService;
  let repository: MockRepository<Producto>;
  let categoriasService: {
    findById: ReturnType<typeof vi.fn<CategoriasService['findById']>>;
    findManyByIds: ReturnType<typeof vi.fn<CategoriasService['findManyByIds']>>;
  };
  let productUsage: {
    isProductInAnyOrder: ReturnType<
      typeof vi.fn<ProductUsagePort['isProductInAnyOrder']>
    >;
  };

  const category = { id: 1, nombre: 'Bebidas' };
  const producto: Producto = {
    id: 1,
    nombre: 'Café',
    descripcion: null,
    precio: '850.00',
    stock: 5,
    stockMinimo: 2,
    disponible: true,
    categoriaId: 1,
  };

  function queryFailedWith(code: string): QueryFailedError {
    return new QueryFailedError(
      'DELETE FROM productos',
      [],
      Object.assign(new Error('violación de restricción'), { code }),
    );
  }

  beforeEach(async () => {
    repository = createMockRepository<Producto>();
    categoriasService = {
      findById: vi.fn<CategoriasService['findById']>(),
      findManyByIds: vi.fn<CategoriasService['findManyByIds']>(),
    };
    categoriasService.findById.mockResolvedValue(category);
    categoriasService.findManyByIds.mockResolvedValue([category]);
    productUsage = {
      isProductInAnyOrder: vi.fn<ProductUsagePort['isProductInAnyOrder']>(),
    };
    productUsage.isProductInAnyOrder.mockResolvedValue(false);

    ({ module, service } = await createServiceTestModule(ProductosService, [
      provideMockRepository(Producto, repository),
      { provide: CategoriasService, useValue: categoriasService },
      { provide: PRODUCT_USAGE_PORT, useValue: productUsage },
    ]));
  });

  afterEach(async () => {
    await module.close();
  });

  it('lista productos ordenados por nombre y adjunta categoría en lote', async () => {
    const productos = [
      {
        id: 1,
        nombre: 'Café',
        descripcion: null,
        precio: '850.00',
        stock: 5,
        stockMinimo: 2,
        disponible: true,
        categoriaId: 1,
      },
    ];
    repository.find.mockResolvedValue(productos);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({ order: { nombre: 'ASC' } });
    expect(categoriasService.findManyByIds).toHaveBeenCalledWith([1]);
    expect(result[0]).toMatchObject({ categoria: category });
  });

  it('devuelve lista vacía sin consultar categorías', async () => {
    repository.find.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(categoriasService.findManyByIds).not.toHaveBeenCalled();
  });

  it('busca producto por id y responde 404 si no existe', async () => {
    repository.findOneBy.mockResolvedValueOnce({
      id: 1,
      nombre: 'Café',
      descripcion: null,
      precio: '850.00',
      stock: 5,
      stockMinimo: 2,
      disponible: true,
      categoriaId: 1,
    });
    repository.findOneBy.mockResolvedValueOnce(null);

    await expect(service.findById(1)).resolves.toMatchObject({
      categoria: category,
    });
    await expect(service.findById(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crea con defaults y valida categoría antes de guardar', async () => {
    repository.create.mockImplementation((data) => data as Producto);
    repository.save.mockImplementation((producto) => Promise.resolve(producto as Producto));

    const created = await service.create({
      nombre: 'Café',
      precio: 850,
      categoria_id: 1,
    });

    expect(categoriasService.findById).toHaveBeenCalledWith(1);
    expect(repository.create).toHaveBeenCalledWith({
      nombre: 'Café',
      descripcion: null,
      precio: '850',
      stock: 0,
      stockMinimo: 5,
      disponible: true,
      categoriaId: 1,
      categoria: category,
    });
    expect(created.precio).toBe('850');
    expect(created.categoria).toEqual(category);
  });

  it('rechaza alta con categoría inexistente', async () => {
    categoriasService.findById.mockResolvedValue(null);

    await expect(
      service.create({ nombre: 'Café', precio: 850, categoria_id: 8 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('actualiza solo campos provistos y conserva null explícito', async () => {
    const producto = {
      id: 1,
      nombre: 'Café',
      descripcion: 'Vieja descripción',
      precio: '850.00',
      stock: 5,
      stockMinimo: 2,
      disponible: true,
      categoriaId: 1,
    };
    repository.findOneBy.mockResolvedValue(producto);
    repository.save.mockImplementation((entity) =>
      Promise.resolve(entity as Producto),
    );

    const updated = await service.update(1, {
      descripcion: null,
      precio: 900.5,
    });

    expect(updated).toMatchObject({ descripcion: null, precio: '900.5' });
    expect(categoriasService.findById).toHaveBeenCalledWith(1);
  });

  it('rechaza cambio a categoría inexistente sin persistir', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 1,
      nombre: 'Café',
      descripcion: null,
      precio: '850.00',
      stock: 5,
      stockMinimo: 2,
      disponible: true,
      categoriaId: 1,
    });
    categoriasService.findById.mockResolvedValue(null);

    await expect(
      service.update(1, { categoria_id: 404 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  describe('remove', () => {
    const IN_USE_DETAIL =
      'No se puede eliminar: el producto tiene pedidos asociados. Marcalo como no disponible en su lugar.';

    it('elimina un producto que no figura en ningún pedido', async () => {
      repository.findOneBy.mockResolvedValue(producto);
      repository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.remove(1)).resolves.toBeUndefined();

      expect(productUsage.isProductInAnyOrder).toHaveBeenCalledWith(1);
      expect(repository.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('responde 404 si el producto no existe, sin consultar pedidos ni borrar', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(404)).rejects.toThrow(
        new NotFoundException('Producto no encontrado'),
      );

      expect(productUsage.isProductInAnyOrder).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('responde 400 si el producto figura en un pedido, sin borrarlo', async () => {
      repository.findOneBy.mockResolvedValue(producto);
      productUsage.isProductInAnyOrder.mockResolvedValue(true);

      await expect(service.remove(1)).rejects.toThrow(
        new BadRequestException(IN_USE_DETAIL),
      );

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('traduce a 400 la violación de FK de una venta simultánea', async () => {
      repository.findOneBy.mockResolvedValue(producto);
      repository.delete.mockRejectedValue(queryFailedWith('23503'));

      await expect(service.remove(1)).rejects.toThrow(
        new BadRequestException(IN_USE_DETAIL),
      );
    });

    it('responde 404 si otro borrado simultáneo ganó la carrera', async () => {
      repository.findOneBy.mockResolvedValue(producto);
      repository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove(1)).rejects.toThrow(
        new NotFoundException('Producto no encontrado'),
      );
    });

    it('propaga cualquier otro error de la base', async () => {
      const failure = queryFailedWith('08006');
      repository.findOneBy.mockResolvedValue(producto);
      repository.delete.mockRejectedValue(failure);

      await expect(service.remove(1)).rejects.toBe(failure);
    });
  });
});