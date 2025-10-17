import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || 'TuNuevaClave123!',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'rimac_db',
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });

export default poolPromise;
export { sql };
