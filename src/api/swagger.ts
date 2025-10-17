import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

export function setupSwagger(app: express.Application) {
  const swaggerPath = path.join(__dirname, '../../swagger.yaml');
  const swaggerDocument = YAML.load(swaggerPath);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📘 Swagger UI available at /docs');
}
