import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

export class AppointmentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 🔹 Crear el Topic SNS principal
    const topic = new sns.Topic(this, "AppointmentsTopic", {
      displayName: "AppointmentsTopic",
    });

    // 🔹 Crear las colas SQS por país
    const queuePE = new sqs.Queue(this, "AppointmentsQueuePE");
    const queueCL = new sqs.Queue(this, "AppointmentsQueueCL");

    // 🔹 Suscribir las colas SQS al Topic SNS con filtro por país
    topic.addSubscription(
      new subs.SqsSubscription(queuePE, {
        rawMessageDelivery: true, // ✅ clave para que record.body sea JSON directo
        filterPolicy: {
          countryISO: sns.SubscriptionFilter.stringFilter({ allowlist: ["PE"] }),
        },
      })
    );
    topic.addSubscription(
      new subs.SqsSubscription(queueCL, {
        rawMessageDelivery: true, // ✅ clave para que record.body sea JSON directo
        filterPolicy: {
          countryISO: sns.SubscriptionFilter.stringFilter({
            allowlist: ["CL"],
          }),
        },
      })
    );

    // 🔹 Crear Lambdas consumidoras
    const lambdaPE = new lambda.Function(this, "ConsumerPE", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "src/consumers/appointmentConsumerPE.handler",
      code: lambda.Code.fromAsset("./dist"),
      environment: { COUNTRY: "PE" },
    });

    const lambdaCL = new lambda.Function(this, "ConsumerCL", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "src/consumers/appointmentConsumerCL.handler",
      code: lambda.Code.fromAsset("./dist"),
      environment: { COUNTRY: "CL" },
    });

    // 🔹 Conectar las colas SQS como triggers de Lambda
    lambdaPE.addEventSource(new lambdaEventSources.SqsEventSource(queuePE));
    lambdaCL.addEventSource(new lambdaEventSources.SqsEventSource(queueCL));

    // 🔹 Exportar el ARN del topic
    this.exportValue(topic.topicArn, { name: "AppointmentsTopicArn" });

  }
}
