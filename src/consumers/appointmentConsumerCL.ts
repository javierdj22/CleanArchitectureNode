import { SQSEvent } from 'aws-lambda';
import { putItem, updateItem, getItem, TABLES } from '../services/dynamo.service';
import { v4 as uuidv4 } from 'uuid';

const handler = async (event: SQSEvent): Promise<void> => {
  try {
    console.log("Event completo:", JSON.stringify(event, null, 2)); 
    for (const record of event.Records) {
      console.log("Record.body raw:", record.body);
      try {
        const data = JSON.parse(record.body); 
        console.log("Record PE appointment parsed:", data);
      } catch (err) {
        console.error("Error al parsear record.body:", err);
        console.log("Contenido de record.body que falló:", record.body); 
      }
      // Parsear mensaje SQS que contiene el SNS
      const snsMessage = JSON.parse(record.body);
      const message = JSON.parse(snsMessage.Message);

      // Validar país CL
      if (message.countryISO !== 'CL') {
        console.warn(`Mensaje descartado: countryISO es '${message.countryISO}', se esperaba 'CL'`);
        continue;
      }

      const estado = 'procesado_cl';

      // Insertar en appointments_cl si no existe
      const existing = await getItem(TABLES.APPOINTMENTS_CL, {
        insuredId: message.insuredId,
        scheduleId: message.scheduleId,
        countryISO: message.countryISO,
      });
      if (!existing) {
        const item = {
          id: uuidv4(),
          insuredId: message.insuredId,
          requestId: message.requestId,
          scheduleId: message.scheduleId ?? null,
          countryISO: message.countryISO,
          status: estado,
          processedAt: new Date().toISOString(),
        };

        await putItem(TABLES.APPOINTMENTS_CL, item);
        console.log('Insertado en appointments_cl:', item);
      } else {
        console.log('Registro ya existente en appointments_cl, se omite inserción.');
      }

      // Buscar cita existente para actualizar estado
      const citaExistente = await getItem(TABLES.APPOINTMENTS, {
        insuredId: message.insuredId,
        scheduleId: message.scheduleId,
        countryISO: message.countryISO,
      });

      if (!citaExistente) {
        console.log("❌ No se encontró la cita para actualizar");
        continue; // Cambiado return por continue para procesar otros mensajes
      }

      // Actualizar cita encontrada
      await updateItem(TABLES.APPOINTMENTS, {
        key: { id: citaExistente.id },
        updateExpression: 'SET #status = :estado, processedAt = :fecha',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: {
          ':estado': estado,
          ':fecha': new Date().toISOString(),
        },
      });

      console.log(`Actualizado estado de appointment ${message.requestId} → ${estado}`);
    }
  } catch (error) {
    console.error('Error processing SNS message:', error);
    throw error; // Re-lanzar para que AWS reintente si falla
  }
};

export default handler;
