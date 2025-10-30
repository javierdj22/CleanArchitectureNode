import { v4 as uuidv4 } from 'uuid';
import handler from '../src/consumers/appointmentConsumerPE';

// 🔹 Simular una cola SQS local
class LocalSQS {
  private messages: any[] = [];

  sendMessage(message: any) {
    this.messages.push({ messageId: uuidv4(), body: message });
  }

  async receiveMessages(max: number = 10) {
    const msgs = this.messages.splice(0, max);
    return msgs.map(m => ({
      messageId: m.messageId,
      receiptHandle: uuidv4(),
      body: m.body,
    }));
  }
}

// 🔹 Instanciar "cola local"
const localQueue = new LocalSQS();

// 🔹 Simular publicación en SNS
function publishToSNS(message: any) {
  console.log('🌐 Publicando mensaje en SNS local:', message);
  // SNS entrega el mensaje a SQS
  localQueue.sendMessage(JSON.stringify({ Message: JSON.stringify(message) }));
}

// 🔹 Función que "escucha" la cola y ejecuta Lambda
async function pollSQSAndInvokeLambda() {
  const messages = await localQueue.receiveMessages(10);
  if (messages.length === 0) return;

  const sqsEvent = {
    Records: messages,
  };

  await handler(sqsEvent as any); // casteo a SQSEvent
}

// 🔹 Simulación completa
async function main() {
  // 1️⃣ Mensaje que normalmente iría al SNS
  const message = {
    insuredId: '01003',
    scheduleId: 512,
    countryISO: 'PE',
    requestId: uuidv4(),
  };

  // 2️⃣ Publicar en SNS
  publishToSNS(message);

  // 3️⃣ "Escuchar" SQS y ejecutar Lambda
  await pollSQSAndInvokeLambda();

  console.log('✅ Flujo completo simulado SNS → SQS → Lambda');
}

main().catch(console.error);
