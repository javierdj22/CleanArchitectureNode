import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { putItem, getItem, TABLES } from '../src/services/dynamo.service';

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('@aws-sdk/credential-providers', () => ({ fromEnv: jest.fn(() => ({ accessKeyId: 'x', secretAccessKey: 'y' })) }));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

const sendMock = jest.fn();
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({ send: sendMock })),
    },
    PutCommand: jest.fn().mockImplementation((input: any) => ({ __type: 'PutCommand', input })),
    ScanCommand: jest.fn().mockImplementation((input: any) => ({ __type: 'ScanCommand', input })),
    GetCommand: jest.fn().mockImplementation((input: any) => ({ __type: 'GetCommand', input })),
  };
});

describe('dynamo.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('putItem should send PutCommand with provided params', async () => {
    sendMock.mockResolvedValueOnce({});
    const item = { id: '1', foo: 'bar' };

    await putItem('tbl', item);

    expect(DynamoDBClient).toHaveBeenCalledWith({ region: expect.any(String), credentials: expect.any(Object) });
    expect(DynamoDBDocumentClient.from).toHaveBeenCalled();
    expect(PutCommand).toHaveBeenCalledWith({ TableName: 'tbl', Item: item });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ __type: 'PutCommand', input: { TableName: 'tbl', Item: item } }));
  });

  // test('scanByInsuredId should send ScanCommand with filter and return items array', async () => {
  //   sendMock.mockResolvedValueOnce({ Items: [{ a: 1 }, { a: 2 }] });

  //   const out = await scanByInsuredId('tbl', 123);

  //   expect(ScanCommand).toHaveBeenCalledWith({
  //     TableName: 'tbl',
  //     FilterExpression: '#iid = :id',
  //     ExpressionAttributeNames: { '#iid': 'insuredId' },
  //     ExpressionAttributeValues: { ':id': 123 },
  //   });
  //   expect(out).toEqual([{ a: 1 }, { a: 2 }]);
  // });

  // test('scanByInsuredId should return empty array when no Items', async () => {
  //   sendMock.mockResolvedValueOnce({});

  //   const out = await scanByInsuredId('tbl', '999');

  //   expect(out).toEqual([]);
  // });

  test('getItem should return null when no Item found', async () => {
    sendMock.mockResolvedValueOnce({ Item: undefined });

    const out = await getItem('tbl', { id: 'x' });

    expect(GetCommand).toHaveBeenCalledWith({ TableName: 'tbl', Key: { id: 'x' } });
    expect(out).toBeNull();
  });

  test('getItem should return typed item when found', async () => {
    sendMock.mockResolvedValueOnce({ Item: { id: 'x', n: 1 } });

    const out = await getItem<{ id: string; n: number }>('tbl', { id: 'x' });

    expect(out).toEqual({ id: 'x', n: 1 });
  });

  test('getItem should rethrow errors and log once', async () => {
    const err = new Error('boom');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockRejectedValueOnce(err);

    await expect(getItem('tbl', { id: 'x' })).rejects.toThrow('boom');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test('TABLES should expose default names when env not set', () => {
    // No env overrides in test
    expect(TABLES).toEqual({
      APPOINTMENTS: 'appointments',
      APPOINTMENTS_PE: 'appointments_pe',
      APPOINTMENTS_CL: 'appointments_cl',
      INSUREDS: 'insureds',
    });
  });
});
