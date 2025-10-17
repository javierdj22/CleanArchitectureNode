import amqp from 'amqplib';
import poolPromise, { sql } from '../db/db';
import dotenv from 'dotenv';
dotenv.config();

const URL_RABBITMQ = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INTERCAMBIO = 'appointments_topic';
const COLA = 'appointments_cl';
const CLAVE_RUTEO = 'CL';

async function start() {
  const conexion = await amqp.connect(URL_RABBITMQ);
  const canal = await conexion.createChannel();
  await canal.assertExchange(INTERCAMBIO, 'topic', { durable: true });
  await canal.assertQueue(COLA, { durable: true });
  await canal.bindQueue(COLA, INTERCAMBIO, CLAVE_RUTEO);
  console.log('Consumidor CL esperando mensajes...');

  canal.consume(COLA, async (msg) => {
    if (!msg) return;
    try {
      const datos = JSON.parse(msg.content.toString());
      console.log('Consumidor CL recibió', datos);

      if (datos.countryISO !== 'CL') {
        console.warn(`Mensaje descartado: countryISO es '${datos.countryISO}', se esperaba 'CL'`);
        canal.ack(msg); // Confirmar el mensaje para que no se reprocese
        return;
      }
      const pool = await poolPromise;
      const estado = 'procesado_cl';

      // Insertar en tabla específica del país
     await pool.request()
      .input('insuredId', sql.Int, datos.insuredId)
      .input('requestId', sql.VarChar(50), datos.requestId)
      .input('scheduleId', sql.Int, datos.scheduleId)
      .input('countryISO', sql.VarChar(2), datos.countryISO)
      .input('status', sql.VarChar(20), estado)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM appointments_cl 
          WHERE insuredId = @insuredId AND scheduleId = @scheduleId AND countryISO = @countryISO
        )
        INSERT INTO appointments_cl (insuredId, requestId, scheduleId, countryISO, status, processedAt)
        VALUES (@insuredId, @requestId, @scheduleId, @countryISO, @status, GETDATE())
      `);

      // Actualizar el estado en la tabla principal
      await pool.request()
        .input('idSolicitud', sql.VarChar(50), datos.requestId)
        .input('estado', sql.VarChar(20), estado)
        .query(`
          UPDATE appointments
          SET status = @estado, processedAt = GETDATE()
          WHERE requestId = @idSolicitud
        `);

      canal.ack(msg);
    } catch (err) {
      console.error('Error en consumidor CL', err);
      canal.nack(msg, false, false);
    }
  }, { noAck: false });
}

start().catch(console.error);
