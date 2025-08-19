import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// controllers/projects.controller.js
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, DeleteCommand, UpdateCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "gestiondetareas";

// --- FUNCIONES PARA PROYECTOS ---

export const createProject = async (req, res) => {
    const { name, description, userId } = req.body;
    if (!userId) { return res.status(400).json({ message: "userId es requerido" }); }
    const projectId = uuidv4();
    const newProject = {
        pk: `PROJECT#${projectId}`, sk: `METADATA#${projectId}`,
        Name: name, Description: description, CreatedAt: new Date().toISOString()
    };
    const userProjectRelation = {
        pk: `USER#${userId}`, sk: `PROJECT#${projectId}`,
        gsi1pk: `USER#${userId}`, gsi1sk: `PROJECT#${projectId}`,
        projectName: name, projectDescription: description
    };
    const command = new BatchWriteCommand({
        RequestItems: {
            [TABLE_NAME]: [ { PutRequest: { Item: newProject } }, { PutRequest: { Item: userProjectRelation } } ]
        }
    });
    try {
        await docClient.send(command);
        res.status(201).json(newProject);
    } catch (error) { res.status(500).json({ message: "Error al crear proyecto", error: error.message }); }
};

export const getProjects = async (req, res) => {
    const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(pk, :pk) AND begins_with(sk, :sk)",
        ExpressionAttributeValues: { ":pk": "PROJECT#", ":sk": "METADATA#" }
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) { res.status(500).json({ message: "Error al obtener proyectos", error: error.message }); }
};

export const getProjectById = async (req, res) => {
    const { id } = req.params;
    const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${id}`, sk: `METADATA#${id}` },
    });
    try {
        const response = await docClient.send(command);
        if (response.Item) { res.status(200).json(response.Item); } 
        else { res.status(404).json({ message: "Proyecto no encontrado" }); }
    } catch (error) { res.status(500).json({ message: "Error al obtener proyecto", error: error.message }); }
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
    } catch (error) { res.status(500).json({ message: "Error al actualizar proyecto", error: error.message }); }
};

export const deleteProject = async (req, res) => {
    const { id } = req.params;
    const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${id}`, sk: `METADATA#${id}` },
    });
    try {
        await docClient.send(command);
        res.status(200).json({ message: "Proyecto eliminado" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar proyecto", error: error.message }); }
};

export const assignProjectToUser = async (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.body;
    if (!userId) { return res.status(400).json({ message: "userId es requerido." }); }
    try {
        const projectCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: `PROJECT#${projectId}`, sk: `METADATA#${projectId}` },
        });
        const projectResponse = await docClient.send(projectCommand);
        if (!projectResponse.Item) { return res.status(404).json({ message: "Proyecto no encontrado." }); }
        const project = projectResponse.Item;
        const userProjectRelation = {
            pk: `USER#${userId}`, sk: `PROJECT#${projectId}`,
            gsi1pk: `USER#${userId}`, gsi1sk: `PROJECT#${projectId}`,
            projectName: project.Name, projectDescription: project.Description
        };
        const putCommand = new PutCommand({ TableName: TABLE_NAME, Item: userProjectRelation });
        await docClient.send(putCommand);
        res.status(200).json({ message: `Proyecto asignado a ${userId} exitosamente.` });
    } catch (error) { res.status(500).json({ message: "Error al asignar el proyecto", error: error.message }); }
};

export const getProjectsForUser = async (req, res) => {
    const { username } = req.params;
    const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "gsi1-index",
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: { ":pk": `USER#${username}` },
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) { res.status(500).json({ message: "Error al obtener proyectos de usuario", error: error.message }); }
};

// --- FUNCIONES PARA TAREAS ---
// ... (el resto de las funciones) ...

// --- FUNCIONES PARA TAREAS ---

export const createTask = async (req, res) => {
    const { projectId } = req.params;
    const { title, description, status, priority, deadline } = req.body;
    const taskId = uuidv4();
    const assignedUserId = "daniel";

    const newTask = {
        pk: `PROJECT#${projectId}`,
        sk: `TASK#${taskId}`,
        Title: title,
        Description: description,
        Status: status || 'pendiente',
        Priority: priority || 'media',
        Deadline: deadline || null,
        AssignedUser: assignedUserId,
        CreatedAt: new Date().toISOString(),
        // --- ¡NUEVOS ATRIBUTOS PARA EL FILTRADO! ---
        gsi2pk: `STATUS#${status || 'pendiente'}`,
        gsi2sk: `PRIORITY#${priority || 'media'}`,
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

export const filterTasksByStatus = async (req, res) => {
    // Obtenemos el estado desde los query params de la URL (ej: /tasks/filter?status=pendiente)
    const { status } = req.query;

    if (!status) {
        return res.status(400).json({ message: "El parámetro 'status' es requerido." });
    }

    const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "gsi2-index", // ¡Le decimos que use nuestro nuevo índice!
        KeyConditionExpression: "gsi2pk = :status",
        ExpressionAttributeValues: {
            ":status": `STATUS#${status}`,
        },
    });

    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) {
        console.error("Error al filtrar tareas:", error);
        res.status(500).json({ message: "Error al filtrar tareas" });
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
    // Recibimos todos los campos para asegurar consistencia
    const { Title, Description, Status, Priority, Deadline, AssignedUser, CreatedAt } = req.body;

    const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `PROJECT#${projectId}`, sk: `TASK#${taskId}` },
        // Expresión para actualizar TODOS los campos relevantes
        UpdateExpression: "SET #title = :t, #desc = :d, #status = :s, #priority = :p, #deadline = :dl, #gsi2pk = :gsi2pk, #gsi2sk = :gsi2sk, #assignedUser = :au, #createdAt = :ca",
        ExpressionAttributeNames: {
            "#title": "Title", "#desc": "Description", "#status": "Status",
            "#priority": "Priority", "#deadline": "Deadline", "#gsi2pk": "gsi2pk",
            "#gsi2sk": "gsi2sk", "#assignedUser": "AssignedUser", "#createdAt": "CreatedAt"
        },
        ExpressionAttributeValues: {
            ":t": Title, ":d": Description, ":s": Status, ":p": Priority,
            ":dl": Deadline || null, ":au": AssignedUser, ":ca": CreatedAt,
            // ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! Actualizamos los índices GSI con los nuevos valores
            ":gsi2pk": `STATUS#${Status}`,
            ":gsi2sk": `PRIORITY#${Priority}`
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
        // CORRECCIÓN: Filtramos para obtener solo los ítems que son TAREAS REALES
        FilterExpression: "begins_with(pk, :pk) AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
            ":pk": "PROJECT#", // La pk debe empezar con PROJECT#
            ":sk": "TASK#",    // Y la sk debe empezar con TASK#
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