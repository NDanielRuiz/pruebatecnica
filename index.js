// index.js (Versión Final y Ordenada)

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import projectsRoutes from './routes/projects.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // 1. Servir archivos HTML, CSS, etc.

// Rutas Específicas
// 2. Definimos la redirección de la raíz.
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Enrutadores Generales
// 3. Pasamos el resto del tráfico a nuestros enrutadores.
app.use(projectsRoutes); // Maneja /login, /projects, /tasks
app.use('/users', usuariosRoutes); // Maneja /users

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${3000}`);
});