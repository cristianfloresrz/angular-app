import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product, ProductInput } from '../models/Producto';
import { ProductoServices } from '../services/producto-services';

@Component({
  selector: 'app-panel',
  imports: [FormsModule],
  templateUrl: './panel.html',
  styleUrl: './panel.css'
})
export class Panel {
  private productService = inject(ProductoServices);

  products = signal<Product[]>([]);
  categories = signal<string[]>([]);
  editingId = signal<number | null>(null); // null = nuevo producto, número = editando
  message = signal('');
  error = signal('');

  // Datos del formulario, enlazados con ngModel
  form: ProductInput = { title: '', price: 0, description: '', category: '', image: '' };

  ngOnInit(): void {
    this.loadData();
  }

  // READ: cargar la lista de productos
  loadData(): void {
    this.productService.getProducts().subscribe({
      next: (data) => this.products.set(data),
      error: () => this.error.set('No se pudieron cargar los productos.')
    });
    this.productService.getCategories().subscribe((data) => this.categories.set(data));
  }

  // El mismo formulario sirve para crear y para editar
  save(): void {
    this.message.set('');
    this.error.set('');

    if (!this.form.title || !this.form.category || !this.form.image || this.form.price <= 0) {
      this.error.set('Completa título, precio, categoría e imagen con valores válidos.');
      return;
    }

    const id = this.editingId();
    if (id === null) {
      this.create();
    } else {
      this.update(id);
    }
  }

  // CREATE: agregar un producto
  private create(): void {
    this.productService.createProduct(this.form).subscribe({
      next: (product) => {
        this.products.update((list) => [product, ...list]);
        this.message.set(`Producto "${product.title}" creado.`);
        this.cancel();
      },
      error: () => this.error.set('No se pudo crear el producto.')
    });
  }

  // UPDATE: guardar los cambios de un producto
  private update(id: number): void {
    this.productService.updateProduct(id, this.form).subscribe({
      next: (product) => {
        this.products.update((list) =>
          list.map((item) => (item.id === id ? { ...item, ...product } : item))
        );
        this.message.set(`Producto "${product.title}" actualizado.`);
        this.cancel();
      },
      error: () => this.error.set('No se pudo actualizar el producto.')
    });
  }

  // DELETE: eliminar un producto
  remove(product: Product): void {
    if (!confirm(`¿Eliminar "${product.title}"?`)) {
      return;
    }

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products.update((list) => list.filter((item) => item.id !== product.id));
        this.message.set(`Producto "${product.title}" eliminado.`);
        if (this.editingId() === product.id) {
          this.cancel();
        }
      },
      error: () => this.error.set('No se pudo eliminar el producto.')
    });
  }

  // Llena el formulario con el producto que se va a editar
  edit(product: Product): void {
    this.editingId.set(product.id);
    this.form = { ...product };
  }

  // Limpia el formulario y sale del modo edición
  cancel(): void {
    this.editingId.set(null);
    this.form = { title: '', price: 0, description: '', category: '', image: '' };
  }
}
