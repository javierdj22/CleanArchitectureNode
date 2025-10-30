import handler from '../src/consumers/appointmentConsumerPE';
import { putItem, getItem, TABLES } from '../src/services/dynamo.service';
import { v4 as uuidv4 } from 'uuid';
import type { SNSEvent } from 'aws-lambda';

jest.mock('../src/services/dynamo.service', () => ({
  putItem: jest.fn(),
  getItem: jest.fn(),
  TABLES: { APPOINTMENTS_PE: 'APPOINTMENTS_PE' },
}));

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('appointmentConsumerPE handler', () => {
  const mockedPutItem = putItem as jest.MockedFunction<typeof putItem>;
  const mockedGetItem = getItem as jest.MockedFunction<typeof getItem>;
  const mockedUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildEvent = (messages: any[]): SNSEvent => ({
    Records: messages.map((m, idx) => ({
      EventSource: 'aws:sns',
      EventVersion: '1.0',
      EventSubscriptionArn: `arn:aws:sns:region:acct:topic:${idx}`,
      Sns: {
        SignatureVersion: '1',
        Timestamp: new Date().toISOString(),
        Signature: 'signature',
        SigningCertUrl: 'https://example.com/cert',
        MessageId: `msg-${idx}`,
        Message: JSON.stringify(m),
        MessageAttributes: {},
        Type: 'Notification',
        TopicArn: 'arn:aws:sns:region:acct:topic',
        Subject: null as any,
        UnsubscribeUrl: 'https://example.com/unsub',
      },
      awsRegion: 'us-east-1',
    })) as any,
  }) as unknown as SNSEvent;

  test('Should persist one appointment with generated id and defaults', async () => {
    mockedUuid.mockReturnValue('uuid-1');
    mockedPutItem.mockResolvedValueOnce(undefined as any);
    mockedGetItem.mockResolvedValueOnce(null);

    const event = buildEvent([{ insuredId: 123, requestId: 'req-1' }]);

    await handler(event);

    expect(mockedPutItem).toHaveBeenCalledTimes(1);
    const [, item] = mockedPutItem.mock.calls[0];
    expect(item).toMatchObject({
      id: 'uuid-1',
      insuredId: 123,
      requestId: 'req-1',
      scheduleId: null,
      countryISO: 'PE',
      status: 'processed',
    });
  });

  test('Should use message-provided scheduleId, countryISO and status when present', async () => {
    mockedUuid.mockReturnValue('uuid-2');
    mockedPutItem.mockResolvedValueOnce(undefined as any);
    mockedGetItem.mockResolvedValueOnce(null);

    const event = buildEvent([
      { insuredId: 999, requestId: 'req-2', scheduleId: 777, countryISO: 'PE', status: 'done' },
    ]);

    await handler(event);

    const [, item] = mockedPutItem.mock.calls[0];
    expect(item).toMatchObject({
      id: 'uuid-2',
      insuredId: 999,
      requestId: 'req-2',
      scheduleId: 777,
      countryISO: 'PE',
      status: 'done',
    });
  });

  test('Should process multiple records in a single event', async () => {
    mockedUuid
      .mockReturnValueOnce('uuid-a')
      .mockReturnValueOnce('uuid-b');
    mockedPutItem.mockResolvedValue(undefined as any);
    mockedGetItem.mockResolvedValue(null);

    const event = buildEvent([
      { insuredId: 1, requestId: 'r1', scheduleId: 10 },
      { insuredId: 2, requestId: 'r2' },
    ]);

    await handler(event);

    expect(mockedPutItem).toHaveBeenCalledTimes(2);
    expect(mockedPutItem).toHaveBeenNthCalledWith(
      1,
      TABLES.APPOINTMENTS_PE,
      expect.objectContaining({ id: 'uuid-a', insuredId: 1, requestId: 'r1', scheduleId: 10 })
    );
    expect(mockedPutItem).toHaveBeenNthCalledWith(
      2,
      TABLES.APPOINTMENTS_PE,
      expect.objectContaining({ id: 'uuid-b', insuredId: 2, requestId: 'r2', scheduleId: null })
    );
  });

  test('Should throw and stop on putItem error', async () => {
    mockedUuid.mockReturnValue('uuid-err');
    mockedPutItem.mockRejectedValueOnce(new Error('DDB down'));
    mockedGetItem.mockResolvedValueOnce(null);

    const event = buildEvent([{ insuredId: 3, requestId: 'r3' }]);

    await expect(handler(event)).rejects.toThrow('DDB down');
  });

  test('Should throw when the message is invalid JSON', async () => {
    const event: SNSEvent = {
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn: 'arn',
          Sns: {
            SignatureVersion: '1',
            Timestamp: new Date().toISOString(),
            Signature: 'sig',
            SigningCertUrl: 'url',
            MessageId: 'id',
            Message: '{invalid json',
            MessageAttributes: {},
            Type: 'Notification',
            TopicArn: 'arn',
            Subject: null as any,
            UnsubscribeUrl: 'url',
          },
          awsRegion: 'us-east-1',
        } as any,
      ],
    } as any;

    await expect(handler(event)).rejects.toBeDefined();
    expect(mockedPutItem).not.toHaveBeenCalled();
  });
});
