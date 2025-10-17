import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'appointments_topic';
const QUEUE_PE = 'appointments_pe';
const QUEUE_CL = 'appointments_cl';

let channel: amqp.Channel | null = null;

export async function initQueues() {
  const conn = await amqp.connect(RABBIT_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE_PE, { durable: true });
  await channel.assertQueue(QUEUE_CL, { durable: true });
  await channel.bindQueue(QUEUE_PE, EXCHANGE, 'PE');
  await channel.bindQueue(QUEUE_CL, EXCHANGE, 'CL');
  console.log('✅ RabbitMQ exchange and queues ready');
}

export async function publishAppointment(payload: any) {
  if (!channel) {
    await initQueues();
  }
  const buffer = Buffer.from(JSON.stringify(payload));
  const key = payload.countryISO || 'PE';
  channel!.publish(EXCHANGE, key, buffer, { persistent: true });
  console.log('Published appointment to exchange', key, payload.requestId);
}
