// controllers/usuarios.controller.js

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Reutilizamos la misma configuración de la base de datos
const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "gestiondetareas";

// --- FUNCIONES PARA USUARIOS ---

export const createUser = async (req, res) => {
    const { username, name, role } = req.body;
    if (!username || !name || !role) {
        return res.status(400).json({ message: "username, name y role son requeridos." });
    }

    const newUser = {
        pk: `USER#${username}`,
        sk: `METADATA#${username}`,
        name: name,
        role: role, // 'admin' o 'usuario'
        createdAt: new Date().toISOString()
    };

    const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: newUser,
        // Expresión de condición: Falla si un ítem con la misma pk/sk ya existe.
        ConditionExpression: "attribute_not_exists(pk)"
    });

    try {
        await docClient.send(command);
        res.status(201).json(newUser);
    } catch (error) {
        // Si la condición falla, DynamoDB devuelve un error específico.
        if (error.name === 'ConditionalCheckFailedException') {
            return res.status(409).json({ message: "El nombre de usuario ya existe." });
        }
        res.status(500).json({ message: "Error al crear el usuario", error: error.message });
    }
};

export const getAllUsers = async (req, res) => {
    const command = new ScanCommand({
        TableName: TABLE_NAME,
        // Filtramos para obtener solo los ítems que son metadatos de usuarios
        FilterExpression: "begins_with(pk, :pk) AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
            ":pk": "USER#",
            ":sk": "METADATA#"
        },
    });
    try {
        const response = await docClient.send(command);
        res.status(200).json(response.Items);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los usuarios", error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    const { username } = req.params;
    const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
            pk: `USER#${username}`,
            sk: `METADATA#${username}`
        }
    });

    try {
        await docClient.send(command);
        res.status(200).json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el usuario", error: error.message });
    }
};