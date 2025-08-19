// routes/usuarios.routes.js

import { Router } from 'express';
import { createUser, getAllUsers, deleteUser } from '../controllers/usuarios.controller.js';

const router = Router();

router.post('/', createUser);
router.get('/', getAllUsers);
router.delete('/:username', deleteUser);

export default router;