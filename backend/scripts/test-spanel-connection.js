import 'dotenv/config';
import { spanelRequest } from '../services/spanel.service.js';

try {
  const result = await spanelRequest('accounts/listaccounts');
  console.log('Conexión correcta con SPanel');
  console.log('Total de cuentas:', Array.isArray(result.data) ? result.data.length : 0);
  if (Array.isArray(result.data) && result.data.length > 0) {
    console.log('Primera cuenta:', JSON.stringify(result.data[0], null, 2));
  }
} catch (error) {
  console.error('Falló la conexión con SPanel:', error.message);
  process.exit(1);
}
