import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductoServices } from '../services/producto-services';
import { Product } from '../models/Producto';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products {
  private productService = inject(ProductoServices);
 

  products = signal<Product[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set('');

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar productos');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  addToCart(product: Product): void {
    alert(`${product.title} agregado al carrito`);
  }
}