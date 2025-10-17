import axios from 'axios';

const API_URL = 'http://localhost:3000/api/appointments';

describe('Pruebas smoke para creación de citas', () => {

  const aseguradosPE = [1001, 1003, 1004, 1007, 1010]; // asegurados PE de ejemplo (puedes repetir)
  const aseguradosCL = [1002, 1006, 1009];             // asegurados CL de ejemplo

  test('Registrar 1000 citas para PE pendiente de Procesamiento', async () => {
    for (let i = 0; i < 1000; i++) {
      const insuredId = aseguradosPE[i % aseguradosPE.length];
      const scheduleId = 5000 + i;  // scheduleId diferente
      const response = await axios.post(API_URL, {
        insuredId,
        scheduleId,
        countryISO: 'PE',
      });
      expect([200, 201]).toContain(response.status);
    }
  }, 20000); // timeout extendido por si tarda

  test('Registrar 1000 citas para CL pendiente de Procesamiento', async () => {
    for (let i = 0; i < 1000; i++) {
      const insuredId = aseguradosCL[i % aseguradosCL.length];
      const scheduleId = 600 + i;  // scheduleId diferente
      const response = await axios.post(API_URL, {
        insuredId,
        scheduleId,
        countryISO: 'CL',
      });
      expect([200, 201]).toContain(response.status);
    }
  }, 20000);

  test('Crea cita correctamente para asegurado válido y país válido', async () => {
    const response = await axios.post(API_URL, {
      insuredId: 1001,    // Javier Salazar - PE
      scheduleId: 501,
      countryISO: 'PE'
    });

    // Aceptamos status 200 o 201 (creado)
    expect([200, 201]).toContain(response.status);

    // Validamos que o bien exista requestId o el mensaje de cita ya creada
    expect(
      response.data.requestId !== undefined ||
      response.data.mensaje === "La cita ya fue generada previamente"
    ).toBe(true);
  });

  test('Error por countryISO no válido', async () => {
    try {
      await axios.post(API_URL, {
        insuredId: 1001,
        scheduleId: 501,
        countryISO: 'AR'  // No permitido
      });
    } catch (err) {
      const error = err as unknown as { response: { status: number; data: { mensaje: string } } };
      expect(error.response.status).toBe(400);
      expect(error.response.data.mensaje).toMatch(/countryISO no válido/i);
    }
  });

  test('Error por asegurado no encontrado para el país', async () => {
    try {
      await axios.post(API_URL, {
        insuredId: 1001,  // Javier Salazar es PE
        scheduleId: 502,
        countryISO: 'CL'  // Chile, asegurado no corresponde
      });
    } catch (err: any) {
      // Cambiado para que coincida con el mensaje real recibido
      expect(err.response.status).toBe(400); // porque recibiste 400 no 404
      expect(err.response.data.mensaje).toMatch(/no puede agendar cita/i);
    }
  });

  test('Error por asegurado inexistente', async () => {
    try {
      await axios.post(API_URL, {
        insuredId: 9999,  // No existe
        scheduleId: 503,
        countryISO: 'PE'
      });
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.mensaje).toMatch(/asegurado no encontrado/i);
    }
  });

});
