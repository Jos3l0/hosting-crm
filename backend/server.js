import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './database/db.js';
import domainsRouter from './routes/domains.routes.js';
import syncRouter from './routes/sync.routes.js';
import paymentsRouter from './routes/payments.routes.js';
import alertsRouter from './routes/alerts.routes.js';
import { startDailySyncJob } from './jobs/daily-sync.job.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.APP_PORT || 3001;

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { ok: false, message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.' }
});
app.use('/api/', limiter);

getDb();

app.use('/api/domains', domainsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/alerts', alertsRouter);

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[Server] Error no manejado:', err.message);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] CRM Hosting corriendo en http://0.0.0.0:${PORT}`);
  console.log(`[Server] Panel web: http://0.0.0.0:${PORT}`);
});

startDailySyncJob();

export default app;
