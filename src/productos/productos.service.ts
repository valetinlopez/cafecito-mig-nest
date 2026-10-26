import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriasService } from '../categorias/categorias.service.js';
import type { CreateProductoDto } from './dto/create-producto.dto.js';
import type { UpdateProductoDto } from './dto/update-producto.dto.js';
import { Producto } from './entities/producto.entity.js';

const CATEGORY_NOT_FOUND_DETAIL = 'La categoría indicada no existe';
const PRODUCT_NOT_FOUND_DETAIL = 'Producto no encontrado';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repository: Repository<Producto>,
    private readonly categoriasService: CategoriasService,
  ) {}

  async findAll(): Promise<Producto[]> {
    const productos = await this.repository.find({ order: { nombre: 'ASC' } });
    return this.attachCategories(productos);
  }

  async findById(id: number): Promise<Producto> {
    const producto = await this.repository.findOneBy({ id });
    if (producto === null) {
      throw new NotFoundException(PRODUCT_NOT_FOUND_DETAIL);
    }
    const [withCategory] = await this.attachCategories([producto]);
    if (withCategory === undefined) {
      throw new NotFoundException(PRODUCT_NOT_FOUND_DETAIL);
    }
    return withCategory;
  }

  async create(input: CreateProductoDto): Promise<Producto> {
    const categoria = await this.findCategory(input.categoria_id);
    const producto = this.repository.create({
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      precio: String(input.precio),
      stock: input.stock ?? 0,
      stockMinimo: input.stock_minimo ?? 5,
      disponible: input.disponible ?? true,
      categoriaId: categoria.id,
      categoria: { id: categoria.id, nombre: categoria.nombre },
    });
    const saved = await this.repository.save(producto);
    saved.categoria = { id: categoria.id, nombre: categoria.nombre };
    return saved;
  }

  async update(id: number, input: UpdateProductoDto): Promise<Producto> {
    const producto = await this.repository.findOneBy({ id });
    if (producto === null) {
      throw new NotFoundException(PRODUCT_NOT_FOUND_DETAIL);
    }

    if (input.categoria_id !== undefined) {
      const categoria = await this.findCategory(input.categoria_id);
      producto.categoriaId = categoria.id;
    }

    if (input.nombre !== undefined) producto.nombre = input.nombre;
    if (input.descripcion !== undefined) producto.descripcion = input.descripcion;
    if (input.precio !== undefined) producto.precio = String(input.precio);
    if (input.stock !== undefined) producto.stock = input.stock;
    if (input.stock_minimo !== undefined) producto.stockMinimo = input.stock_minimo;
    if (input.disponible !== undefined) producto.disponible = input.disponible;

    const saved = await this.repository.save(producto);
    const categoria = await this.categoriasService.findById(saved.categoriaId);
    if (categoria === null) {
      throw new NotFoundException(CATEGORY_NOT_FOUND_DETAIL);
    }
    saved.categoria = { id: categoria.id, nombre: categoria.nombre };
    return saved;
  }

  private async findCategory(id: number): Promise<{ id: number; nombre: string }> {
    const categoria = await this.categoriasService.findById(id);
    if (categoria === null) {
      throw new BadRequestException(CATEGORY_NOT_FOUND_DETAIL);
    }
    return categoria;
  }

  private async attachCategories(productos: Producto[]): Promise<Producto[]> {
    if (productos.length === 0) {
      return [];
    }
    const categoryIds = [
      ...new Set(productos.map((producto) => producto.categoriaId)),
    ];
    const categories = await this.categoriasService.findManyByIds(categoryIds);
    const categoriesById = new Map(
      categories.map((categoria) => [categoria.id, categoria]),
    );

    return productos.map((producto) => {
      const categoria = categoriesById.get(producto.categoriaId);
      if (categoria === undefined) {
        throw new NotFoundException(CATEGORY_NOT_FOUND_DETAIL);
      }
      producto.categoria = { id: categoria.id, nombre: categoria.nombre };
      return producto;
    });
  }
}