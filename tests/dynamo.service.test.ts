import axios from 'axios';
jest.mock('axios');

const API_URL = 'https://9ta7wdq3l9.execute-api.us-east-1.amazonaws.com/appointments';

describe('Pruebas mock para creación de citas', () => {

  const aseguradosPE = [1001, 1003, 1004, 1007, 1010];
  const aseguradosCL = [1002, 1006, 1009];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Crea cita correctamente para asegurado válido y país válido', async () => {
    const mockResponse = {
      status: 201,
      data: { requestId: 'abc123' }
    };
    (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const response = await axios.post(API_URL, {
      insuredId: "01001",
      scheduleId: 521,
      countryISO: 'PE'
    });

    expect([200, 201]).toContain(response.status);
    expect(
      response.data.requestId !== undefined ||
      response.data.mensaje === "La cita ya fue generada previamente"
    ).toBe(true);
  });

  test('Error por countryISO no válido', async () => {
    const mockError = {
      response: { status: 400, data: { mensaje: "countryISO no válido" } }
    };
    (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

    try {
      await axios.post(API_URL, {
        insuredId: "1001",
        scheduleId: 501,
        countryISO: 'AR'
      });
    } catch (err: any) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.mensaje).toMatch(/countryISO no válido/i);
    }
  });

  test('Error por asegurado no encontrado para el país', async () => {
    const mockError = {
      response: { status: 400, data: { mensaje: "El asegurado no puede agendar cita en este país" } }
    };
    (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

    try {
      await axios.post(API_URL, {
        insuredId: "1001",
        scheduleId: 502,
        countryISO: 'CL'
      });
    } catch (err: any) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.mensaje).toMatch(/no puede agendar cita/i);
    }
  });

  test('Error por asegurado inexistente', async () => {
    const mockError = {
      response: { status: 404, data: { mensaje: "Asegurado no encontrado" } }
    };
    (axios.post as jest.Mock).mockRejectedValueOnce(mockError);

    try {
      await axios.post(API_URL, {
        insuredId: "9999",
        scheduleId: 503,
        countryISO: 'PE'
      });
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.mensaje).toMatch(/asegurado no encontrado/i);
    }
  });

  test('Registrar múltiples citas para PE (mock)', async () => {
    const mockResponse = { status: 201, data: { requestId: 'abc' } };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    for (let i = 0; i < 10; i++) {
      const insuredId = aseguradosPE[i % aseguradosPE.length];
      const scheduleId = 5000 + i;
      const response = await axios.post(API_URL, {
        insuredId,
        scheduleId,
        countryISO: 'PE'
      });
      expect([200, 201]).toContain(response.status);
    }

    expect(axios.post).toHaveBeenCalledTimes(10);
  });

  test('Registrar múltiples citas para CL (mock)', async () => {
    const mockResponse = { status: 201, data: { requestId: 'xyz' } };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    for (let i = 0; i < 5; i++) {
      const insuredId = aseguradosCL[i % aseguradosCL.length];
      const scheduleId = 600 + i;
      const response = await axios.post(API_URL, {
        insuredId,
        scheduleId,
        countryISO: 'CL'
      });
      expect([200, 201]).toContain(response.status);
    }

    expect(axios.post).toHaveBeenCalledTimes(5);
  });
});
