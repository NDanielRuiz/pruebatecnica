# pruebatecnica
Prueba tecnica parque explora
# Proyecto de Gestión de Tareas (Prueba Técnica Full Stack)

Este es un proyecto full-stack de gestión de tareas construido con Node.js en el backend, servicios de AWS para la base de datos y la lógica serverless, y un frontend simple en HTML/JS/Tailwind.

La aplicación permite la gestión de proyectos y tareas con dos roles de usuario (administrador y usuario estándar), demostrando una arquitectura desacoplada y moderna.

## Tecnologías Utilizadas

* **Backend:** Node.js, Express.js
* **Frontend:** HTML5, Tailwind CSS, JavaScript (Vanilla)
* **Base de Datos:** AWS DynamoDB (Diseño de Tabla Única con GSI)
* **Serverless:** AWS Lambda, Amazon EventBridge
* **Despliegue:** Render (Backend), Netlify (Frontend)

## Arquitectura General

El proyecto sigue una arquitectura desacoplada:

1.  **Frontend:** Una aplicación de múltiples páginas estáticas alojada en Netlify.
2.  **Backend:** Una API RESTful construida con Node.js/Express, desplegada en Render.
3.  **Base de Datos:** Una tabla única en DynamoDB que gestiona todas las entidades y sus relaciones.
4.  **Lógica Asíncrona:** Funciones Lambda que se activan por eventos de la base de datos (DynamoDB Streams) o por tiempo (EventBridge) para manejar notificaciones.

---

## 🚀 Instalación y Ejecución Local

Para correr este proyecto en tu máquina, necesitas tener Node.js, npm y el AWS CLI configurado con tus credenciales.

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/NDanielRuiz/pruebatecnica.git](https://github.com/NDanielRuiz/pruebatecnica.git)
    ```
2.  **Navegar a la carpeta:**
    ```bash
    cd pruebatecnica
    ```
3.  **Instalar dependencias:**
    ```bash
    npm install
    ```
4.  **Iniciar el servidor:**
    ```bash
    npm start
    ```
    La aplicación estará corriendo en `http://localhost:3000`.

---

## ⚙️ Configuración de AWS

Para que la aplicación funcione, es necesario configurar los siguientes servicios en AWS (en la región `us-east-1`):

1.  **DynamoDB:**
    * Crear una tabla llamada `gestiondetareas`.
    * **Clave Primaria:** `pk` (String) y `sk` (String).
    * **Índice Secundario Global (GSI):** Crear un índice llamado `gsi1-index` con `gsi1pk` (Partition Key, String) y `gsi1sk` (Sort Key, String).
    * **Streams:** Activar DynamoDB Streams con la vista "Imágenes nuevas y viejas".

2.  **Lambda:**
    * Crear la función `notificadorDeTareas` conectada al Stream de DynamoDB.
    * Crear la función `revisorDeFechasLimite`.

3.  **EventBridge:**
    * Crear una regla programada para ejecutar la función `revisorDeFechasLimite` periódicamente.

---

## 🗄️ Diseño de Datos en DynamoDB

[cite_start]Se utiliza un diseño de **Tabla Única** para modelar todas las entidades, optimizando las consultas. [cite: 194]

| Entidad | pk (Clave de Partición) | sk (Clave de Ordenación) | Descripción |
| :--- | :--- | :--- | :--- |
| **Usuario** | `USER#<username>` | `METADATA#<username>` | [cite_start]Datos principales del usuario. [cite: 197] |
| **Proyecto** | `PROJECT#<projectId>` | `METADATA#<projectId>` | [cite_start]Datos principales del proyecto. [cite: 198] |
| **Tarea** | `PROJECT#<projectId>` | `TASK#<taskId>` | [cite_start]Tarea asociada a un proyecto. [cite: 199] |
| **Relación Usuario-Proyecto** | `USER#<username>` | `PROJECT#<projectId>` | [cite_start]Asigna un proyecto a un usuario. [cite: 200] |

---

## 📖 Documentación de la API

Endpoints principales de la API.

#### Autenticación

* `POST /login`
    * Simula un inicio de sesión.
    * **Body:** `{ "username": "admin" }`

#### Usuarios

* `GET /users`
    * Obtiene la lista de todos los usuarios.
* `POST /users`
    * Crea un nuevo usuario.
    * **Body:** `{ "username": "test", "name": "Test User", "role": "usuario" }`

#### Proyectos

* `GET /projects`
    * (Admin) Obtiene todos los proyectos del sistema.
* `GET /users/:username/projects`
    * (Usuario) Obtiene los proyectos asignados a un usuario específico.
* `POST /projects`
    * Crea un nuevo proyecto y lo asigna al usuario actual.
    * **Body:** `{ "name": "Nombre Proyecto", "description": "Desc...", "userId": "admin" }`

---

## 🌐 Despliegue

La aplicación está desplegada en dos partes:

* **Backend (API):** `https://api-gestion-proyectos.onrender.com`
* **Frontend (Sitio Web):** `https://tu-url-de-netlify.netlify.app` *(Aquí debes pegar la URL que te dio Netlify)*