Reto Rimac - Local version (Express + TypeScript + RabbitMQ + SQL Server)

This scaffold implements the same flow as the original AWS diagram but using free/open-source components:
- Express.js as API Gateway replacement
- RabbitMQ as SNS/SQS replacement (pub/sub + queues)
- SQL Server as per your environment (two databases/tables for PE and CL)
- Node.js consumers that read from RabbitMQ queues and persist to SQL Server
- Internal EventEmitter to emulate EventBridge

Quick start (local):
1. Install dependencies:
   npm install

2. Configure environment (.env):
   Copy .env.example to .env and update values (DB and RabbitMQ).

3. If you want to run services via Docker (recommended), see docker-compose.yml which includes RabbitMQ and SQL Server.

4. Run the API:
   npm run dev

5. Run consumers in separate terminals:
   npm run consumers
   npm run consumer:pe
   npm run consumer:cl
   npm run test

API Endpoints:
- POST /api/appointments
- GET  /api/appointments/:insuredId

Project layout:
- src/api        : Express API (routes, controllers)
- src/consumers  : RabbitMQ consumers (PE and CL)
- src/services   : Broker/AMQP helper, event emitter
- src/db         : SQL Server connection pool
- docker-compose.yml : optional RabbitMQ + SQL Server containers


### 📘 Swagger UI
Access API docs at: [http://localhost:3000/docs](http://localhost:3000/docs)
