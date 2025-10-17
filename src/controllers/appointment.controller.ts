import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import poolPromise, { sql } from '../db/db';
import { publishAppointment } from '../services/broker.service';

export const createAppointment = async (req: Request, res: Response) => {
  try {
    let { insuredId, scheduleId, countryISO } = req.body;

    countryISO = countryISO.toUpperCase();
    
    // 🔍 Validación básica de campos obligatorios
    if (!insuredId || !scheduleId || !countryISO) {
      return res.status(400).json({ mensaje: 'insuredId, scheduleId y countryISO son obligatorios' });
    }

    // ✅ Validar que insuredId sea número entero
    if (!Number.isInteger(insuredId)) {
      return res.status(400).json({ mensaje: 'El campo insuredId debe ser un número entero' });
    }

    const paisesPermitidos = ['PE', 'CL'];
    if (!paisesPermitidos.includes(countryISO.toUpperCase())) {
      return res.status(400).json({ mensaje: 'countryISO no válido' });
    }
    const pool = await poolPromise;

    // 🧩 Validar que el asegurado exista y pertenezca al país indicado
    const asegurado = await pool.request()
      .input('insuredId', sql.Int, insuredId)
      .query(`
        SELECT fullName, countryISO
        FROM insureds
        WHERE insuredId = @insuredId
      `);

    if (asegurado.recordset.length === 0) {
      return res.status(404).json({ mensaje: 'Asegurado no encontrado' });
    }

    const paisAsegurado = asegurado.recordset[0].countryISO;
    if (paisAsegurado !== countryISO) {
      return res.status(400).json({
        mensaje: `El asegurado pertenece a ${paisAsegurado}, no puede agendar cita en ${countryISO}`
      });
    }

    // Verificar si ya existe la cita
    const resultado = await pool.request()
      .input('insuredId', sql.Int, insuredId)
      .input('scheduleId', sql.Int, scheduleId)
      .input('countryISO', sql.VarChar(2), countryISO)
      .query(`
        SELECT requestId FROM appointments
        WHERE insuredId = @insuredId AND scheduleId = @scheduleId AND countryISO = @countryISO
      `);

    // Si existe, devolver mensaje y no continuar
    if (resultado.recordset.length > 0) {
      // const requestIdExistente = resultado.recordset[0].requestId;
      return res.status(200).json({
        mensaje: 'La cita ya fue generada previamente',
        // requestId: requestIdExistente
      });
    }

    // Si no existe, crear la cita
    const nuevoRequestId = uuidv4();
    const estado = 'pendiente';

    await pool.request()
      .input('insuredId', sql.Int, insuredId)
      .input('requestId', sql.VarChar(50), nuevoRequestId)
      .input('scheduleId', sql.Int, scheduleId)
      .input('countryISO', sql.VarChar(2), countryISO)
      .input('status', sql.VarChar(20), estado)
      .query(`
        INSERT INTO appointments (insuredId, requestId, scheduleId, countryISO, status, createdAt)
        VALUES (@insuredId, @requestId, @scheduleId, @countryISO, @status, GETDATE())
      `);

    // Publicar al broker
    await publishAppointment({ insuredId, requestId: nuevoRequestId, scheduleId, countryISO });

    return res.status(201).json({
      mensaje: 'La solicitud de cita fue recibida y está siendo procesada.',
      estado: 'pendiente',
      requestId: nuevoRequestId
    });

  } catch (error) {
    console.error('Error en crearCita:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const insuredId = req.params.insuredId;

    const pool = await poolPromise;
    const resultado = await pool.request()
      .input('insuredId', sql.Int, insuredId)
      .query('SELECT * FROM appointments WHERE insuredId = @insuredId ORDER BY createdAt DESC');

    return res.status(200).json(resultado.recordset || []);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
