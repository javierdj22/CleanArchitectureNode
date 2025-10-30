import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export async function publishAppointment(payload: any) {
  if (!payload.countryISO) {
    throw new Error("Payload debe tener countryISO definido");
  }

  try {
    const topicArn =
      payload.countryISO === "PE"
        ? process.env.SNS_TOPIC_PE_ARN
        : payload.countryISO === "CL"
        ? process.env.SNS_TOPIC_CL_ARN
        : process.env.SNS_TOPIC_GLOBAL_ARN;

    if (!topicArn) {
      throw new Error(`No se encontró un Topic ARN válido para ${payload.countryISO}`);
    }

    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(payload), // ✅ Obligatorio si rawMessageDelivery = true
      MessageAttributes: {
        countryISO: { DataType: "String", StringValue: payload.countryISO },
      },
      Subject: `AppointmentsQueue${payload.countryISO}`, // Opcional
    });

    console.log("📤 Publicando en SNS:");
    console.log("TopicArn:", topicArn);
    console.log("Message:", JSON.stringify(payload, null, 2));
    console.log("MessageAttributes:", {
      countryISO: { DataType: "String", StringValue: payload.countryISO },
    });

    const result = await snsClient.send(command);
    console.log(`✅ SNS publicado (${payload.countryISO}) → MessageId: ${result.MessageId}`);

    return result;
  } catch (error) {
    console.error("❌ Error publicando en SNS:", error);
    throw error;
  }
}
