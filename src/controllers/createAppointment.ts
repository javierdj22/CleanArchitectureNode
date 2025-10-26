import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { publishAppointment } from '../services/broker.service';
import { putItem, getItem, TABLES, findInsured } from '../services/dynamo.service';
import { v4 as uuidv4 } from 'uuid';

const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const errorId = uuidv4(); // ID para rastreo de errores
  try {
    const body = JSON.parse(event.body || '{}');
    let { insuredId, scheduleId, countryISO } = body;

    // 🔍 Validación básica de campos obligatorios
    if (!insuredId || !scheduleId || !countryISO) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          mensaje: 'insuredId, scheduleId y countryISO son obligatorios',
          errorId 
        }),
      };
    }

    countryISO = countryISO.toUpperCase();
    const paisesPermitidos = ['PE', 'CL'];
    if (!paisesPermitidos.includes(countryISO)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ mensaje: 'countryISO no válido', errorId }),
      };
    }

    // 🧩 Validar que el asegurado exista
    const asegurado = await findInsured(insuredId.toString(), countryISO);
    if (!asegurado) {
      return {
        statusCode: 404,
        body: JSON.stringify({ mensaje: 'Asegurado no encontrado', errorId }),
      };
    }

    if (asegurado.countryISO !== countryISO) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          mensaje: `El asegurado pertenece a ${asegurado.countryISO}, no puede agendar cita en ${countryISO}`,
          errorId
        }),
      };
    }

    // Verificar si ya existe la cita
    const nuevoRequestId = uuidv4();
    const item = {
      id: uuidv4(),
      insuredId,
      requestId: nuevoRequestId,
      scheduleId,
      countryISO,
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    };

    const citaExistente = await getItem(TABLES.APPOINTMENTS, { insuredId, scheduleId, countryISO });  
    if (citaExistente) {
      return {
        statusCode: 200,  
        body: JSON.stringify({
          mensaje: 'La cita ya fue generada previamente',
          requestId: citaExistente.requestId,
        }),
      }; 
    }else {
      // Crear nueva cita
      await putItem(TABLES.APPOINTMENTS, item);
    }
      
    // Publicar en broker
    await publishAppointment(item);

    return {
      statusCode: 201,
      body: JSON.stringify({
        mensaje: 'La solicitud de cita fue recibida y está siendo procesada.',
        estado: 'pendiente',
        requestId: nuevoRequestId,
      }),
    };
  } catch (error: any) {
    // Clasificación de error para logs
    const errorType = error.code || error.name || 'InternalError';
    console.error(`[${errorType}] createAppointment Lambda error | errorId: ${errorId} | message: ${error.message} | stack: ${error.stack}`);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        mensaje: 'Error interno del servidor',
        errorId // Retorna el id para correlacionar logs
      }),
    };
  }
};

export default handler;
