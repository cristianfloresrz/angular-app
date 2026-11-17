# Guía paso a paso: Tienda Angular 22

Guía para construir el proyecto desde cero y explicarlo a los alumnos.

## 1. Qué se va a construir

Una tienda muy simple con tres partes:

1. **Catálogo público** en `/`: muestra los productos de Fake Store API.
2. **Login** en `/login`: autentica contra la API y guarda el token.
3. **Panel admin** en `/admin`: CRUD de productos. Solo puede entrar el usuario `johnd`.
4. **Vista de usuario** en `/usuario`: catálogo de solo lectura para usuarios que no son admin.

La API utilizada es [Fake Store API](https://fakestoreapi.com/docs).

---

## 2. Requisitos

- Node.js LTS instalado.
- npm.
- Angular CLI.
- Editor de código (VS Code recomendado).
- Navegador con DevTools.

Verificar versiones:

```bash
node -v
npm -v
```

Instalar Angular CLI:

```bash
npm install -g @angular/cli
```

Comprobar que se instaló Angular 22:

```bash
ng version
```

---

## 3. Crear el proyecto

```bash
ng new tienda --routing --style=css --ssr=false
cd tienda
npm start
```

Abrir `http://localhost:4200`.

> Angular moderno crea componentes standalone por defecto. No se necesita `AppModule`.

---

## 4. Endpoints que se van a usar

| Operación | Método | URL |
|---|---|---|
| Login | POST | `https://fakestoreapi.com/auth/login` |
| Listar productos | GET | `https://fakestoreapi.com/products` |
| Crear producto | POST | `https://fakestoreapi.com/products` |
| Actualizar producto | PUT | `https://fakestoreapi.com/products/:id` |
| Eliminar producto | DELETE | `https://fakestoreapi.com/products/:id` |
| Categorías | GET | `https://fakestoreapi.com/products/categories` |

El login recibe:

```json
{
  "username": "johnd",
  "password": "m38rmF$"
}
```

Y devuelve:

```json
{
  "token": "eyJhbGciOi..."
}
```

Credenciales de prueba:

- **Admin:** `johnd` / `m38rmF$`
- **Usuario normal:** `mor_2314` / `83r5^_`

> Importante para explicar: Fake Store API no guarda los cambios de POST, PUT ni DELETE. Las respuestas son simuladas. Por eso el CRUD actualiza la lista local del componente y los cambios desaparecen al recargar.

---

## 5. Estructura final del proyecto

```text
src/app/
├── admin/
│   ├── admin.ts
│   ├── admin.html
│   └── admin.css
├── guards/
│   ├── admin-guard.ts
│   └── auth-guard.ts
├── login/
│   ├── login.ts
│   ├── login.html
│   └── login.css
├── models/
│   └── Producto.ts
├── navbar/
│   ├── navbar.ts
│   ├── navbar.html
│   └── navbar.css
├── products/
│   ├── products.ts
│   ├── products.html
│   └── products.css
├── services/
│   ├── auth-service.ts
│   └── producto-services.ts
├── usuario/
│   ├── usuario.ts
│   ├── usuario.html
│   └── usuario.css
├── app.config.ts
├── app.routes.ts
├── app.ts
└── app.html
```

---

## 6. Paso 1: habilitar HTTP

Angular no incluye `HttpClient` activo por defecto. Hay que registrarlo en `src/app/app.config.ts`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes)
  ]
};
```

Sin `provideHttpClient()` aparece el error:

```text
No provider for HttpClient
```

---

## 7. Paso 2: crear el modelo Product

Archivo `src/app/models/Producto.ts`:

```ts
export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: {
    rate: number;
    count: number;
  };
}

export type ProductInput = Pick<
  Product,
  'title' | 'price' | 'description' | 'category' | 'image'
>;
```

`ProductInput` representa los datos que el usuario puede escribir en el formulario. `id` y `rating` los genera la API.

---

## 8. Paso 3: servicio de productos

Archivo `src/app/services/producto-services.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Product, ProductInput } from '../models/Producto';

@Service()
export class ProductoServices {
  private apiUrl = 'https://fakestoreapi.com/products';
  private http = inject(HttpClient);

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  createProduct(product: ProductInput): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: number, product: ProductInput): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<Product> {
    return this.http.delete<Product>(`${this.apiUrl}/${id}`);
  }
}
```

Conceptos para explicar:

- `@Service()` registra el servicio automáticamente en la inyección de dependencias.
- `inject(HttpClient)` obtiene la dependencia sin usar constructor.
- Cada método devuelve un `Observable`. El componente decide cuándo suscribirse.

---

## 9. Paso 4: servicio de autenticación

Archivo `src/app/services/auth-service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  token: string;
}

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'https://fakestoreapi.com/auth/login';
  private storageKey = 'fakestore_token';

  private tokenSignal = signal<string | null>(localStorage.getItem(this.storageKey));

  readonly username = computed(() => {
    const token = this.tokenSignal();
    return token ? this.readUsername(token) : null;
  });

  readonly isAuthenticated = computed(() => this.username() !== null);
  readonly isAdmin = computed(() => this.username() === 'johnd');

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(this.apiUrl, { username, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.storageKey, response.token);
          this.tokenSignal.set(response.token);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.tokenSignal.set(null);
  }

  private readUsername(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        '='
      );
      const data = JSON.parse(atob(padded)) as { user?: string };
      return data.user ?? null;
    } catch {
      return null;
    }
  }
}
```

Explicación:

- El token JWT guarda el nombre del usuario en su segunda parte.
- `readUsername()` decodifica esa parte para saber quién inició sesión.
- `isAuthenticated` es un `computed`: vale `true` si hay usuario.
- `isAdmin` es otro `computed`: vale `true` solo si el usuario es `johnd`.
- El token se guarda en `localStorage` para mantener la sesión al recargar.

> Seguridad: decodificar un JWT en el navegador solo sirve para leer datos del token. No verifica su firma. En una aplicación real, el backend debe validar permisos.

---

## 10. Paso 5: formulario de login

Archivo `src/app/login/login.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  loading = signal(false);
  error = signal('');

  submit(): void {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    this.loading.set(true);

    this.auth.login(username.trim(), password).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = this.auth.isAdmin() ? (returnUrl ?? '/admin') : '/usuario';
        this.router.navigateByUrl(destination);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401
            ? 'Usuario o contraseña incorrectos.'
            : 'No se pudo conectar con el servidor.'
        );
      }
    });
  }
}
```

Plantilla `login.html`:

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <label for="username">Usuario</label>
  <input id="username" formControlName="username" autocomplete="username" />

  <label for="password">Contraseña</label>
  <input
    id="password"
    type="password"
    formControlName="password"
    autocomplete="current-password"
  />

  @if (error()) {
    <p>{{ error() }}</p>
  }

  <button type="submit" [disabled]="loading()">
    {{ loading() ? 'Ingresando...' : 'Ingresar' }}
  </button>
</form>
```

Puntos clave:

- `FormGroup` agrupa los campos.
- `formControlName` conecta cada input con su control.
- `form.invalid` se activa cuando falla `Validators.required`.
- `markAllAsTouched()` muestra errores después de intentar enviar.
- `navigateByUrl()` cambia de página después del login correcto.

Regla de redirección:

- Si el usuario es `johnd`, va a `/admin` o a la URL que intentaba abrir.
- Si es otro usuario, va a `/usuario`.

---

## 11. Paso 6: proteger rutas con guards

### Guard de sesión

Archivo `src/app/guards/auth-guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
```

### Guard de administrador

Archivo `src/app/guards/admin-guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (!auth.isAdmin()) {
    router.navigate(['/usuario']);
    return false;
  }

  return true;
};
```

Explicación:

- Un guard decide si una ruta se puede abrir.
- `authGuard` solo exige estar logueado.
- `adminGuard` exige estar logueado **y** ser `johnd`.
- Si no hay sesión, redirige a `/login` y guarda la URL intentada en `returnUrl`.
- Si hay sesión pero no es admin, redirige a `/usuario`.
- Después de `router.navigate()` se devuelve `false` para cancelar la navegación original.

---

## 12. Paso 7: definir rutas

Archivo `src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { authGuard } from './guards/auth-guard';
import { Products } from './products/products';

export const routes: Routes = [
  { path: '', component: Products, pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
    canActivate: [adminGuard]
  },
  {
    path: 'usuario',
    loadComponent: () => import('./usuario/usuario').then((m) => m.Usuario),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
```

Explicación:

- `/` es público.
- `/login` es público.
- `/admin` usa `adminGuard`.
- `/usuario` usa `authGuard`.
- `loadComponent` carga el componente solo cuando se visita la ruta.
- `**` captura rutas inexistentes y las manda al inicio.

---

## 13. Paso 8: catálogo público

Archivo `src/app/products/products.ts`:

```ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoServices } from '../services/producto-services';
import { Product } from '../models/Producto';

@Component({
  selector: 'app-products',
  imports: [CommonModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products implements OnInit {
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
      error: () => {
        this.error.set('Error al cargar productos');
        this.loading.set(false);
      }
    });
  }
}
```

Plantilla: usar `@if` para cargando/error y `@for` para recorrer los productos:

```html
@if (loading()) {
  <p>Cargando productos...</p>
} @else if (error()) {
  <p>{{ error() }}</p>
} @else {
  <div class="products-grid">
    @for (product of products(); track product.id) {
      <article class="product-card">
        <img [src]="product.image" [alt]="product.title" />
        <h3>{{ product.title }}</h3>
        <p>{{ product.category }}</p>
        <p>{{ product.price | currency: 'USD' }}</p>
      </article>
    }
  </div>
}
```

Conceptos para explicar:

- Un `signal` guarda estado reactivo.
- Se lee con paréntesis: `products()`.
- Se actualiza con `set()` o `update()`.
- Angular vuelve a pintar la vista cuando cambia el signal.
- No modificar el array directamente: `products().push(...)` no notifica el cambio.

---

## 14. Paso 9: panel de administración

El panel usa el servicio de productos para listar, crear, editar y eliminar.

### Listar

```ts
products = signal<Product[]>([]);
loading = signal(true);
error = signal('');

loadProducts(): void {
  this.loading.set(true);
  this.productService.getProducts().subscribe({
    next: (data) => {
      this.products.set(data);
      this.loading.set(false);
    },
    error: () => {
      this.error.set('No se pudieron cargar los productos.');
      this.loading.set(false);
    }
  });
}
```

### Formulario

```ts
form: ProductInput = {
  title: '',
  price: 0,
  description: '',
  category: '',
  image: ''
};

editingId = signal<number | null>(null);
```

Cuando el usuario pulsa **Editar**:

```ts
edit(product: Product): void {
  this.editingId.set(product.id);
  this.form = {
    title: product.title,
    price: product.price,
    description: product.description,
    category: product.category,
    image: product.image
  };
}
```

### Crear o actualizar

```ts
save(): void {
  const id = this.editingId();
  const payload: ProductInput = {
    ...this.form,
    price: Number(this.form.price)
  };

  const request = id === null
    ? this.productService.createProduct(payload)
    : this.productService.updateProduct(id, payload);

  request.subscribe({
    next: (product) => {
      if (id === null) {
        this.products.update((list) => [product, ...list]);
      } else {
        this.products.update((list) =>
          list.map((item) => (item.id === id ? { ...item, ...product } : item))
        );
      }
      this.resetForm();
    },
    error: () => this.error.set('No se pudo guardar el producto.')
  });
}
```

### Eliminar

```ts
remove(product: Product): void {
  if (!confirm(`¿Eliminar "${product.title}"?`)) {
    return;
  }

  this.productService.deleteProduct(product.id).subscribe({
    next: () => {
      this.products.update((list) => list.filter((item) => item.id !== product.id));
    },
    error: () => this.error.set('No se pudo eliminar el producto.')
  });
}
```

Explicación importante:

- El `GET` sí devuelve los productos reales de la API.
- `POST`, `PUT` y `DELETE` responden, pero la API no guarda los cambios.
- Para que la interfaz se sienta funcional, el componente actualiza su signal local.
- Si se recarga la página, los cambios desaparecen.

---

## 15. Paso 10: vista de usuario normal

Archivo `src/app/usuario/usuario.ts`:

```ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Product } from '../models/Producto';
import { AuthService } from '../services/auth-service';
import { ProductoServices } from '../services/producto-services';

@Component({
  selector: 'app-usuario',
  imports: [CommonModule],
  templateUrl: './usuario.html',
  styleUrl: './usuario.css'
})
export class Usuario implements OnInit {
  private productService = inject(ProductoServices);
  protected auth = inject(AuthService);

  products = signal<Product[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
```

Esta vista solo muestra el catálogo. No tiene botones de crear, editar ni eliminar.

---

## 16. Paso 11: navbar según el rol

`src/app/navbar/navbar.ts`:

```ts
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  protected auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
```

`navbar.html`:

```html
<nav>
  <a routerLink="/">Tienda Online</a>

  @if (auth.isAuthenticated()) {
    <a routerLink="/usuario">Mi vista</a>

    @if (auth.isAdmin()) {
      <a routerLink="/admin">Admin</a>
    }

    <button type="button" (click)="logout()">Cerrar sesión</button>
  } @else {
    <a routerLink="/login">Iniciar sesión</a>
  }
</nav>
```

Así el enlace **Admin** solo aparece para `johnd`.

---

## 17. Paso 12: estilos simples

No hace falta diseño complejo. Usar CSS básico:

- Contenedor centrado con `max-width`.
- Tarjetas con `border-radius` y `box-shadow`.
- Formularios con `display: grid`.
- Tabla con `overflow-x: auto` para móviles.
- Botones con colores distintos: azul para guardar, gris para cancelar, rojo para eliminar.

Separar estilos por componente usando `styleUrl`.

---

## 18. Orden recomendado para construir

1. Crear el proyecto.
2. Configurar `provideHttpClient()`.
3. Crear el modelo `Product`.
4. Crear `ProductoServices` y probar el `GET`.
5. Crear el catálogo público.
6. Crear el login con Reactive Forms.
7. Crear `AuthService` y guardar el token.
8. Decodificar el token y calcular `isAdmin`.
9. Crear los guards.
10. Configurar rutas protegidas.
11. Crear el panel admin y su CRUD.
12. Crear la vista de usuario normal.
13. Agregar la navbar condicional.
14. Probar los dos roles.
15. Ajustar estilos.

---

## 19. Pruebas manuales

### Admin

1. Abrir `/admin` sin sesión. Debe redirigir a `/login`.
2. Iniciar sesión con `johnd` / `m38rmF$`.
3. Verificar que entra a `/admin`.
4. Crear un producto.
5. Editarlo.
6. Eliminarlo.
7. Cerrar sesión.

### Usuario normal

1. Iniciar sesión con `mor_2314` / `83r5^_`.
2. Verificar que entra a `/usuario`.
3. Intentar abrir `/admin` manualmente.
4. Verificar que vuelve a `/usuario`.
5. Confirmar que no aparece el enlace **Admin** en la navbar.

### Sesión

1. Recargar la página después del login.
2. La sesión debe mantenerse por el token en `localStorage`.
3. Cerrar sesión debe borrar el token.
4. Después de cerrar sesión, `/admin` y `/usuario` deben pedir login otra vez.

---

## 20. Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `No provider for HttpClient` | Falta el módulo HTTP | Agregar `provideHttpClient()` |
| `Can't bind to 'formGroup'` | Falta Reactive Forms | Importar `ReactiveFormsModule` |
| La lista no se actualiza | Se mutó el array del signal | Usar `set()` o `update()` |
| Los cambios desaparecen al recargar | Fake Store API no persiste | Explicar que es una API de práctica |
| Usuario normal entra a `/admin` | Guard mal aplicado | Revisar `canActivate: [adminGuard]` |
| `returnUrl` no funciona | No se leyó el query param | Usar `route.snapshot.queryParamMap.get('returnUrl')` |
| El token no se lee | Token inválido o corrupto | Hacer logout y volver a iniciar sesión |

---

## 21. Conceptos para explicar a los alumnos

- **Componente standalone:** componente que declara sus propias importaciones.
- **Inyección de dependencias:** Angular entrega servicios ya creados.
- **`inject()`:** forma moderna de obtener una dependencia.
- **Signal:** valor reactivo que avisa cuando cambia.
- **`computed`:** valor derivado de otros signals.
- **Observable:** flujo de datos asíncrono que se consume con `subscribe`.
- **Reactive Forms:** formularios controlados desde TypeScript.
- **Guard:** función que decide si una ruta se puede abrir.
- **Lazy loading:** cargar código solo cuando se necesita.
- **JWT:** token que contiene datos del usuario.
- **Rol:** permiso asociado al usuario; aquí `johnd` es admin.

---

## 22. Ejercicios propuestos

1. Agregar un buscador por título en el panel admin.
2. Filtrar productos por categoría.
3. Mostrar un mensaje de confirmación después de guardar.
4. Validar que el precio sea mayor que cero.
5. Guardar los cambios del CRUD en `localStorage` para simular persistencia.
6. Crear un segundo administrador y centralizar la lista de admins.
7. Mostrar el nombre del usuario en la navbar.
8. Agregar un botón para volver al catálogo desde el panel admin.

---

## 23. Resumen

El flujo completo es:

1. El usuario abre `/admin`.
2. `adminGuard` revisa si hay sesión y si el usuario es `johnd`.
3. Si no hay sesión, va a `/login` y guarda `returnUrl`.
4. El login llama a Fake Store API y guarda el token.
5. `AuthService` decodifica el token y determina el rol.
6. Si es `johnd`, entra al panel admin.
7. Si es otro usuario, entra a la vista de solo lectura.
8. El panel admin usa `ProductoServices` para el CRUD.
9. Los cambios se reflejan en la lista local porque la API no los persiste.
