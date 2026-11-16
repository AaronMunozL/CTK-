# CTK — Client to Kitchen

**CTK (Client to Kitchen)** es una aplicación web desarrollada como Proyecto de Fin de Grado del ciclo de **Desarrollo de Aplicaciones Web (DAW)**.  

Su objetivo es digitalizar el proceso de realización de pedidos en un restaurante tipo buffet, permitiendo que los clientes realicen pedidos desde una tablet, que los camareros puedan gestionarlos y que la cocina reciba los pedidos para prepararlos.

## Descripción

La aplicación permite:

- Validar un código de entrada para acceder como cliente.
- Crear pedidos y añadir líneas de pedido.
- Enviar pedidos a cocina.
- Iniciar sesión como trabajador.
- Gestionar los pedidos desde las vistas de camarero y cocina.
- Controlar el acceso según el rol del usuario.
- Ofrecer una interfaz responsive, pensada para tabletas y dispositivos móviles.

## Tecnologías utilizadas

| Área | Tecnología |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | PHP puro |
| API | API REST |
| Base de datos | MySQL / MariaDB |
| Servidor local | XAMPP |
| Control de versiones | Git y GitHub |

## Estructura del proyecto

```text
CTK-/
├── backCTK/       # Backend: API REST en PHP
├── frontCTK/      # Frontend: aplicación React
└── README.md
```

## Funcionalidades principales

### Cliente

- Introducir un código de entrada.
- Consultar el menú.
- Crear un pedido.
- Añadir productos al pedido.
- Enviar el pedido a cocina.

### Camarero

- Iniciar sesión con credenciales de trabajador.
- Consultar pedidos.
- Gestionar el estado de los pedidos.
- Acceder únicamente a las funciones permitidas para su rol.

### Cocina

- Iniciar sesión con credenciales de trabajador.
- Consultar los pedidos recibidos.
- Consultar las líneas de cada pedido.
- Gestionar la preparación de los pedidos.

## Roles y permisos

La aplicación diferencia el acceso mediante roles:

| Rol | Acceso |
|---|---|
| Cliente | Realización y envío de pedidos |
| Camarero | Gestión de pedidos |
| Cocina | Consulta y preparación de pedidos |

El frontend protege las vistas según el rol devuelto por el backend tras el inicio de sesión, evitando que un usuario normal acceda a las secciones de camarero o cocina.

## Puesta en marcha

### Requisitos

- XAMPP o un entorno equivalente con Apache y MySQL.
- PHP 8 o superior.
- Node.js y npm.
- Navegador web actualizado.

### 1. Clonar el repositorio

```bash
git clone [https://github.com/AaronMunozL/CTK-.git](https://github.com/AaronMunozL/CTK-.git)
cd CTK-
```

### 2. Configurar la base de datos

1. Inicia Apache y MySQL desde XAMPP.
2. Abre phpMyAdmin.
3. Crea una base de datos para el proyecto.
4. Importa el archivo SQL incluido en el backend, si está disponible.
5. Revisa las credenciales de conexión en los archivos de configuración del backend.

### 3. Iniciar el backend

Copia la carpeta `backCTK` dentro de `htdocs` de XAMPP:

```text
C:\xampp\htdocs\backCTK
```

Comprueba que la API responde correctamente desde:

```text
http://localhost/backCTK
```

### 4. Iniciar el frontend

```bash
cd frontCTK
npm install
npm run dev
```

Después, abre en el navegador la URL que muestra Vite, normalmente:

```text
http://localhost:5173
```

## Configuración de la API

El frontend se comunica con el backend mediante peticiones HTTP a la API REST.

Si el backend se encuentra en `http://localhost/backCTK`, asegúrate de que la URL base utilizada en el frontend coincide con esa ruta.

Ejemplo:

```js
const API_URL = "http://localhost/backCTK";
```

## Usuarios de prueba

Puedes crear usuarios de prueba directamente en la base de datos para comprobar los distintos roles:

- Cliente: accede mediante código de entrada.
- Camarero: inicia sesión con usuario y contraseña.
- Cocina: inicia sesión con usuario y contraseña.

> No incluyas contraseñas reales ni credenciales de producción en este repositorio.

## Seguridad

El proyecto incluye:

- Autenticación de trabajadores mediante login.
- Autorización basada en roles.
- Validación de códigos de entrada para clientes.
- Separación de responsabilidades entre frontend y backend.
- Comunicación mediante API REST.

## Autor

**Aarón Muñoz**  
Proyecto de Fin de Grado — Desarrollo de Aplicaciones Web  
IES Juana I de Castilla

## Licencia

Este proyecto se ha desarrollado con fines académicos para el Proyecto de Fin de Grado.
