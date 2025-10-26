import { SNSEvent } from 'aws-lambda';
import { putItem, updateItem, getItem, TABLES } from '../services/dynamo.service';
import { v4 as uuidv4 } from 'uuid';

const handler = async (event: SNSEvent): Promise<void> => {
  try {
    for (const record of event.Records) {
      console.log('SNS Record ConsumerPE objeto:', {
        messageId: record.Sns.MessageId,
        messageAttributes: record.Sns.MessageAttributes,
        timestamp: record.Sns.Timestamp
      });

      const message = JSON.parse(record.Sns.Message);
      console.log('Processing PE appointment:', message);

      // Validar país
      if (message.countryISO !== 'PE') {
        console.warn(`Mensaje descartado: countryISO es '${message.countryISO}', se esperaba 'PE'`);
        continue;
      }

      const estado = 'procesado_pe';
      // Verificar si ya existe el registro en appointments_pe
      const existing = await getItem(TABLES.APPOINTMENTS_PE, { insuredId: message.insuredId, scheduleId: message.scheduleId, countryISO: message.countryISO });
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

        await putItem(TABLES.APPOINTMENTS_PE, item);
        console.log('Insertado en appointments_pe:', item);
      } else {
        console.log('Registro ya existente en appointments_pe, se omite inserción.');
      }

      // 1. Verificar que se encontró un item antes de actualizar
      // Buscar el ítem por scan (como ya haces)
      const citaExistente = await getItem(TABLES.APPOINTMENTS, {
        insuredId: message.insuredId,
        scheduleId: message.scheduleId,
        countryISO: message.countryISO,
      });

      if (!citaExistente) {
        console.log("❌ No se encontró la cita para actualizar");
        return;
      }
      
      if (citaExistente) {
        // Usa las claves REALES del item encontrado
        await updateItem(TABLES.APPOINTMENTS, {
          key: { id: citaExistente.id },
          updateExpression: 'SET #status = :estado, processedAt = :fecha',
          expressionAttributeNames: { '#status': 'status' },
          expressionAttributeValues: {
            ':estado': estado,
            ':fecha': new Date().toISOString(),
          },
        });
      }





      console.log(`Actualizado estado de appointment ${message.requestId} → ${estado}`);
    }
  } catch (error) {
    console.error('Error en consumidor PE:', error);
    throw error;
  }
};

export default handler; 
