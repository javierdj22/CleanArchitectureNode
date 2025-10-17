import app from './app';
import poolPromise from '../db/db';
import { initQueues } from '../services/broker.service';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await poolPromise;
    console.log('✅ Connected to SQL Server (pool ready)');
    await initQueues();
    app.listen(PORT, () => {
      console.log(`✅ Server listening on http://localhost:${PORT}/docs`);
    });
  } catch (err) {
    console.error('Fatal startup error', err);
    process.exit(1);
  }
}

start();
