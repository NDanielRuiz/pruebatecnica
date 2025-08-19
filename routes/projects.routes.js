// routes/projects.routes.js (Corregido)

import { Router } from 'express';
import { 
    createProject, getProjects, getProjectById, deleteProject, updateProject,
    createTask, getTasksForProject, updateTask, deleteTask, loginUser, getAllTasks, getProjectsForUser, getNotificationsForUser, filterTasksByStatus, assignProjectToUser     
} from '../controllers/projects.controller.js';

const router = Router();

// Ruta de Autenticación
router.post('/login', loginUser);
router.get('/tasks', getAllTasks);

// --- Rutas de Proyectos ---
router.post('/projects', createProject);
router.get('/projects', getProjects);
router.get('/projects/:id', getProjectById);
router.delete('/projects/:id', deleteProject);
router.put('/projects/:id', updateProject);

// --- Rutas de Tareas ---
router.post('/projects/:projectId/tasks', createTask);
router.get('/projects/:projectId/tasks', getTasksForProject);
router.put('/projects/:projectId/tasks/:taskId', updateTask);
router.delete('/projects/:projectId/tasks/:taskId', deleteTask);
router.post('/projects/:projectId/assign', assignProjectToUser);

router.get('/tasks/filter', filterTasksByStatus);

router.get('/users/:username/projects', getProjectsForUser);
router.get('/users/:username/notifications', getNotificationsForUser);

export default router;