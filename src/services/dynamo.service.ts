import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';
dotenv.config();

const REGION = process.env.AWS_REGION || 'us-east-1';
export interface InsuredItem {
  insuredId: string;
  countryISO: string;
  createdAt: string;
  documentNumber: string;
  email: string;
  fullName: string;
  phone: string;
  requestId: string;
  scheduleId: string;
  status: string;
}
// Cliente DynamoDB
const ddbClient = new DynamoDBClient({
  region: REGION,
  credentials: fromEnv(),
});
const ddbDoc = DynamoDBDocumentClient.from(ddbClient);

/**
 * Inserta un ítem en la tabla especificada
 */
export async function findInsured(insuredId: string, countryISO: string) {
  try {
    const result = await ddbDoc.send(
      new ScanCommand({
        TableName: TABLES.INSUREDS,
        FilterExpression: "insuredId = :insuredId AND countryISO = :countryISO",
        ExpressionAttributeValues: {
          ":insuredId": insuredId,
          ":countryISO": countryISO
        }
      })
    );

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error("Error buscando asegurado:", error);
    throw error;
  }
}
export async function putItem(tableName: string, item: Record<string, any>) {
  await ddbDoc.send(new PutCommand({ TableName: tableName, Item: item }));
}
/* Actualiza un ítem en la tabla especificada */
export async function updateItem(
  tableName: string,
  {
    key,
    updateExpression,
    expressionAttributeNames,
    expressionAttributeValues,
  }: {
    key: Record<string, any>;
    updateExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, any>;
  }
) {
  try {
    const result = await ddbDoc.send(
      new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'UPDATED_NEW',
      })
    );

    console.log(`Item actualizado correctamente en ${tableName}`, result.Attributes);
    return result.Attributes;
  } catch (error) {
    console.error(`Error actualizando item en ${tableName}:`, error);
    throw error;
  }
}
/** Obtiene un ítem de la tabla especificada por su clave */

interface GetItemParams {
  insuredId?: string;
  scheduleId?: string;
  countryISO?: string;
}
export async function getItem(tableName: string, params: GetItemParams): Promise<Record<string, any> | null> {
 try {
    const expressionParts: string[] = [];
    const expressionValues: Record<string, any> = {};

    if (params.insuredId != null) {
      expressionParts.push("insuredId = :insuredId");
      expressionValues[":insuredId"] = params.insuredId;
    }

    if (params.scheduleId != null) {
      expressionParts.push("scheduleId = :scheduleId");
      expressionValues[":scheduleId"] = params.scheduleId;
    }

    if (params.countryISO != null) {
      expressionParts.push("countryISO = :countryISO");
      expressionValues[":countryISO"] = params.countryISO;
    }

    const filterExpression = expressionParts.join(" AND ");

    const result = await ddbDoc.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression || undefined,
        ExpressionAttributeValues: Object.keys(expressionValues).length ? expressionValues : undefined,
      })
    );

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error("Error buscando item:", error);
    throw error;
  }
}

/* Tablas usadas por las Lambdas */
export const TABLES = {
  APPOINTMENTS: process.env.DYNAMODB_TABLE_GLOBAL || 'appointments',
  APPOINTMENTS_PE: process.env.APPOINTMENTS_PE_TABLE || 'appointments_pe',
  APPOINTMENTS_CL: process.env.APPOINTMENTS_CL_TABLE || 'appointments_cl',
  INSUREDS: process.env.INSUREDS_TABLE || 'insureds',
};
