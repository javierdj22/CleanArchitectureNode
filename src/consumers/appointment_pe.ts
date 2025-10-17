import amqp from 'amqplib';
import poolPromise, { sql } from '../db/db';
import dotenv from 'dotenv';
dotenv.config();

const URL_RABBITMQ = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INTERCAMBIO = 'appointments_topic';
const COLA = 'appointments_pe';
const CLAVE_RUTEO = 'PE';

async function start() {
  const conexion = await amqp.connect(URL_RABBITMQ);
  const canal = await conexion.createChannel();
  await canal.assertExchange(INTERCAMBIO, 'topic', { durable: true });
  await canal.assertQueue(COLA, { durable: true });
  await canal.bindQueue(COLA, INTERCAMBIO, CLAVE_RUTEO);
  console.log('Consumidor PE esperando mensajes...');

  canal.consume(COLA, async (mensaje) => {
    if (!mensaje) return;
    try {
      const datos = JSON.parse(mensaje.content.toString());
      console.log('Consumidor PE recibió:', datos);

      // Validar que el mensaje sea para Perú
      if (datos.countryISO !== 'PE') {
        console.warn(`Mensaje descartado: countryISO es '${datos.countryISO}', se esperaba 'PE'`);
        canal.ack(mensaje); // Confirmar el mensaje para que no se reproceso
        return;
      }

      const pool = await poolPromise;
      const status = 'procesado_pe';

      // Insertar en tabla específica del país si no existe
      await pool.request()
        .input('insuredId', sql.Int, datos.insuredId)
        .input('requestId', sql.VarChar(50), datos.requestId)
        .input('scheduleId', sql.Int, datos.scheduleId)
        .input('countryISO', sql.VarChar(2), datos.countryISO)
        .input('status', sql.VarChar(20), status)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM appointments_pe 
            WHERE insuredId = @insuredId AND scheduleId = @scheduleId AND countryISO = @countryISO
          )
          INSERT INTO appointments_pe (insuredId, requestId, scheduleId, countryISO, status, processedAt)
          VALUES (@insuredId, @requestId, @scheduleId, @countryISO, @status, GETDATE())
        `);

      // Actualizar estado en la tabla principal
      await pool.request()
        .input('requestId', sql.VarChar(50), datos.requestId)
        .input('status', sql.VarChar(20), status)
        .query(`
          UPDATE appointments
          SET status = @status, processedAt = GETDATE()
          WHERE requestId = @requestId
        `);

      canal.ack(mensaje);
    } catch (error) {
      console.error('Error en consumidor PE:', error);
      canal.nack(mensaje, false, false);
    }
  }, { noAck: false });
}

start().catch(console.error);
