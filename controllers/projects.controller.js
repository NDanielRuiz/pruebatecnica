import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// controllers/projects.controller.js
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, DeleteCommand, UpdateCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "gestiondetareas";

// --- FUNCIONES PARA PROYECTOS ---

export const createProject = async (req, res) => {
    // 1. AHORA RECIBIMOS EL userId DESDE EL FRONTEND EN EL BODY
    const { name, description, userId } = req.body; 

    if (!userId) {
        // Añadimos una validación
        return res.status(400).json({ message: "El ID del usuario es requerido para crear un proyecto." });
    }

    const projectId = uuidv4();

    const newProject = {
        pk: `PROJECT#${projectId}`,
        sk: `METADATA#${projectId}`,
        Name: name, Description: description, CreatedAt: new Date().toISOString()
    };

    // 2. LA RELACIÓN AHORA USA EL userId QUE LLEGÓ EN LA PETICIÓN
    const userProjectRelation = {
        pk: `USER#${userId}`,
        sk: `PROJECT#${projectId}`,
        gsi1pk: `USER#${userId}`,
        gsi1sk: `PROJECT#${projectId}`,
        projectName: name,
        projectDescription: description
    };

    const command = new BatchWriteCommand({
        RequestItems: {
            [TABLE_NAME]: [
                { PutRequest: { Item: newProject } },
                { PutRequest: { Item: userProjectRelation } },
            ],
        },
    });

    try {
        await docClient.send(command);
        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ message: "Error al crear el proyecto y su relación", error: error.message });
    }
};

export const getProjects = async (req, res) => {
    const command = new ScanCommand({
        TableName: TABLE_NAME,
        // Este filtro se asegura de que solo obtengamos ítems de Proyectos
        FilterExpression: "begins_with(pk, :pk) AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
            ":pk": "PROJECT#",
            ":sk": "METADATA#"
        },
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener todos los proyectos", error: error.message });
    }
};

export const getProjectById = async (req, res) => {
    const { id } = req.params;
    const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${id}`, sk: `METADATA#${id}` },
    });
    try {
        const response = await docClient.send(command);
        if (response.Item) {
            res.status(200).json(response.Item);
        } else {
            res.status(404).json({ message: "Proyecto no encontrado" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el proyecto", error: error.message });
    }
};

export const updateProject = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${id}`, sk: `METADATA#${id}` },
        UpdateExpression: "SET #name = :n, #desc = :d",
        ExpressionAttributeNames: { "#name": "Name", "#desc": "Description" },
        ExpressionAttributeValues: { ":n": name, ":d": description },
        ReturnValues: "ALL_NEW",
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Attributes);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el proyecto", error: error.message });
    }
};

export const deleteProject = async (req, res) => {
    const { id } = req.params;
    const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${id}`, sk: `METADATA#${id}` },
    });
    try {
        await docClient.send(command);
        res.status(200).json({ message: "Proyecto eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el proyecto", error: error.message });
    }
};

// controllers/projects.controller.js

// ... (después de la función deleteProject) ...

export const getProjectsForUser = async (req, res) => {
    const { username } = req.params;
    
    // Este comando es la clave: usa el GSI que creamos.
    const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "gsi1-index", // ¡Le decimos que use nuestro índice especial!
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: {
            ":pk": `USER#${username}`,
        },
    });

    try {
        const response = await docClient.send(command);
        // Esto devolverá los ítems de RELACIÓN (que contienen el nombre y descripción del proyecto)
        res.status(200).json(response.Items);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los proyectos del usuario", error: error.message });
    }
};

// --- FUNCIONES PARA TAREAS ---
// ... (el resto de las funciones) ...

// --- FUNCIONES PARA TAREAS ---

export const createTask = async (req, res) => {
    const { projectId } = req.params;
    const { title, description, status, priority, deadline } = req.body;
    const taskId = uuidv4();
    // Por ahora, simulamos que todas las tareas se le asignan a 'daniel'
    const assignedUserId = "daniel"; 

    const newTask = {
        pk: `PROJECT#${projectId}`,
        sk: `TASK#${taskId}`,
        Title: title,
        Description: description,
        Status: status || 'pendiente',
        Priority: priority || 'media',
        Deadline: deadline || null,
        AssignedUser: assignedUserId, // <-- ¡NUEVO CAMPO IMPORTANTE!
        CreatedAt: new Date().toISOString(),
    };

    const userTaskRelation = {
        pk: `USER#${assignedUserId}`,
        sk: `TASK#${taskId}`,
        projectId: `PROJECT#${projectId}`,
        createdAt: new Date().toISOString(),
    };

    const command = new BatchWriteCommand({
        RequestItems: {
            [TABLE_NAME]: [
                { PutRequest: { Item: newTask } },
                { PutRequest: { Item: userTaskRelation } },
            ],
        },
    });

    try {
        await docClient.send(command);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: "Error al crear la tarea y su relación", error: error.message });
    }
};

export const getTasksForProject = async (req, res) => {
    const { projectId } = req.params;
    const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
            ":pk": `PROJECT#${projectId}`,
            ":sk": "TASK#",
        },
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las tareas", error: error.message });
    }
};

export const updateTask = async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title, description, status, priority } = req.body;
    const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${projectId}`, sk: `TASK#${taskId}` },
        UpdateExpression: "SET #title = :t, #desc = :d, #status = :s, #priority = :p",
        ExpressionAttributeNames: {
            "#title": "Title",
            "#desc": "Description",
            "#status": "Status",
            "#priority": "Priority",
        },
        ExpressionAttributeValues: {
            ":t": title,
            ":d": description,
            ":s": status,
            ":p": priority,
        },
        ReturnValues: "ALL_NEW",
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Attributes);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar la tarea", error: error.message });
    }
};

export const deleteTask = async (req, res) => {
    const { projectId, taskId } = req.params;
    const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${projectId}`, sk: `TASK#${taskId}` },
    });
    try {
        await docClient.send(command);
        res.status(200).json({ message: "Tarea eliminada exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar la tarea", error: error.message });
    }
};

export const getAllTasks = async (req, res) => {
    const command = new ScanCommand({
        TableName: TABLE_NAME,
        // Filtramos para obtener solo los ítems cuya 'sk' empieza con TASK#
        FilterExpression: "begins_with(sk, :sk)",
        ExpressionAttributeValues: {
            ":sk": "TASK#",
        },
    });

    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) {
        console.error("Error al obtener todas las tareas:", error);
        res.status(500).json({ message: "Error al obtener todas las tareas" });
    }
};

export const loginUser = async (req, res) => {
    const { username } = req.body;
    
    const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
            pk: `USER#${username}`,
            sk: `METADATA#${username}`,
        },
    });

    try {
        const response = await docClient.send(command);
        if (response.Item) {
            res.status(200).json(response.Item);
        } else {
            res.status(404).json({ message: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error("Error durante el login:", error);
        res.status(500).json({ message: "Error en el servidor durante el login" });
    }
};

export const getNotificationsForUser = async (req, res) => {
    const { username } = req.params;

    const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
            ":pk": `USER#${username}`,
            ":sk": "NOTIFICATION#",
        },
        // Devuelve los resultados en orden descendente (los más nuevos primero)
        ScanIndexForward: false, 
    });

    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener las notificaciones", error: error.message });
    }
};