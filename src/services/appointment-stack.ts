import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class AppointmentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
 
    // 🔹 Crear el Topic SNS principal
    const topic = new sns.Topic(this, "AppointmentsTopic", {
      displayName: "AppointmentsTopic",
    });

    // 🔹 Crear las Lambdas consumidoras
    const lambdaPE = new lambda.Function(this, "ConsumerPE", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "src/consumers/appointmentConsumerPE.handler",
      code: lambda.Code.fromAsset("./dist"), // o "./lambda" según tu build
      environment: {
        COUNTRY: "PE",
      },
    });

    const lambdaCL = new lambda.Function(this, "ConsumerCL", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "src/consumers/appointmentConsumerCL.handler",
      code: lambda.Code.fromAsset("./dist"),
      environment: {
        COUNTRY: "CL",
      },
    });

    // 🔹 Suscripciones con filtro por país
    topic.addSubscription(
      new subs.LambdaSubscription(lambdaPE, {
        filterPolicy: {
          countryISO: sns.SubscriptionFilter.stringFilter({
            allowlist: ["PE"],
          }),
        },
      })
    );

    topic.addSubscription(
      new subs.LambdaSubscription(lambdaCL, {
        filterPolicy: {
          countryISO: sns.SubscriptionFilter.stringFilter({
            allowlist: ["CL"],
          }),
        },
      })
    );

    // 🔹 Exportar el ARN del topic para usarlo en Serverless
    this.exportValue(topic.topicArn, { name: "AppointmentsTopicArn" });
  }
}
