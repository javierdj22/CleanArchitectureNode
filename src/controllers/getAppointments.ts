import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getItem, TABLES } from '../services/dynamo.service';

const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const insuredId = event.pathParameters?.insuredId;
    if (!insuredId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'insuredId required' }) };
    }

    const items = await getItem(TABLES.APPOINTMENTS, { insuredId });

    return {
      statusCode: 200,
      body: JSON.stringify({ appointments: items })
    };
  } catch (error) {
    console.error('getAppointments error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get appointments' })
    };
  }
};

export default handler;
