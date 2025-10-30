import { SQSEvent } from 'aws-lambda';
import { putItem, updateItem, getItem, TABLES } from '../services/dynamo.service';
import { v4 as uuidv4 } from 'uuid';

const handler = async (event: SQSEvent): Promise<void> => {
  try {
    console.log("Event completo:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
      console.log("Record.body raw:", record.body);

      let message: any;
      try {
        // Intentamos parsear el mensaje de SQS
        const snsWrapper = JSON.parse(record.body);

        // Manejar casos donde Message ya es objeto o string
        if (typeof snsWrapper.Message === 'string') {
          message = JSON.parse(snsWrapper.Message);
        } else {
          message = snsWrapper.Message;
        }

        console.log("Mensaje parseado:", message);

      } catch (err) {
        console.error("Error al parsear record.body o snsMessage:", err);
        console.log("Contenido problemático:", record.body);
        continue; // Salta este record y sigue con el siguiente
      }

      // Validar país
      if (message.countryISO !== 'PE') {
        console.warn(`Mensaje descartado: countryISO es '${message.countryISO}', se esperaba 'PE'`);
        continue;
      }

      const estado = 'procesado_pe';

      // Verificar si ya existe el registro en appointments_pe
      const existing = await getItem(TABLES.APPOINTMENTS_PE, {
        insuredId: message.insuredId,
        scheduleId: message.scheduleId,
        countryISO: message.countryISO
      });

      if (!existing) {
        const item = {
          id: uuidv4(),
          insuredId: message.insuredId,
          requestId: message.requestId ?? uuidv4(), // generar requestId si no viene
          scheduleId: message.scheduleId ?? null,
          countryISO: message.countryISO,
          status: estado,
          processedAt: new Date().toISOString(),
        };

        await putItem(TABLES.APPOINTMENTS_PE, item);
        console.log('✅ Insertado en appointments_pe:', item);
      } else {
        console.log('ℹ️ Registro ya existente en appointments_pe, se omite inserción.');
      }

      // Buscar cita existente para actualizar
      const citaExistente = await getItem(TABLES.APPOINTMENTS, {
        insuredId: message.insuredId,
        scheduleId: message.scheduleId,
        countryISO: message.countryISO,
      });

      if (!citaExistente) {
        console.log("❌ No se encontró la cita para actualizar");
        continue;
      }

      // Actualizar cita existente
      await updateItem(TABLES.APPOINTMENTS, {
        key: { id: citaExistente.id },
        updateExpression: 'SET #status = :estado, processedAt = :fecha',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: {
          ':estado': estado,
          ':fecha': new Date().toISOString(),
        },
      });

      console.log(`✅ Actualizado estado de appointment ${message.requestId} → ${estado}`);
    }

  } catch (error) {
    console.error('Error en consumidor PE:', error);
    throw error;
  }
};

export default handler;
