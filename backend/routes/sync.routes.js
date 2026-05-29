import express from 'express';
import { listSPanelAccounts } from '../services/spanel.accounts.js';
import { listSPanelDomains, extractDomainsFromAccount } from '../services/spanel.domains.js';
import { upsertDomainFromSPanel } from '../services/domains.service.js';
import { getDb } from '../database/db.js';

const router = express.Router();

router.post('/spanel', async (req, res) => {
  const db = getDb();
  try {
    const logInsert = db.prepare('INSERT INTO sync_logs (source, status, message) VALUES (?, ?, ?)');

    logInsert.run('spanel', 'iniciado', 'Iniciando sincronización con SPanel...');

    const accounts = await listSPanelAccounts();
    let totalAccounts = 0;
    let totalDomains = 0;
    let created = 0;
    let updated = 0;

    for (const account of accounts) {
      totalAccounts++;

      const mainDomains = extractDomainsFromAccount(account);
      for (const dom of mainDomains) {
        totalDomains++;
        const result = upsertDomainFromSPanel(dom);
        if (result.action === 'created') created++;
        else updated++;
      }

      try {
        const addonDomains = await listSPanelDomains(account.user);
        for (const dom of addonDomains) {
          totalDomains++;
          const result = upsertDomainFromSPanel(dom);
          if (result.action === 'created') created++;
          else updated++;
        }
      } catch (err) {
        // addon domains no disponibles, solo usamos dominio principal
      }
    }

    const msg = `Sincronización completada. Cuentas: ${totalAccounts}, Dominios sincronizados: ${totalDomains}, Nuevos: ${created}, Actualizados: ${updated}`;
    logInsert.run('spanel', 'completado', msg);

    res.json({
      ok: true,
      message: msg,
      totalAccounts,
      totalDomains,
      created,
      updated
    });
  } catch (error) {
    db.prepare('INSERT INTO sync_logs (source, status, message) VALUES (?, ?, ?)')
      .run('spanel', 'error', `Error: ${error.message}`);

    res.status(500).json({
      ok: false,
      message: 'No se pudo sincronizar con SPanel'
    });
  }
});

router.get('/logs', (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 50').all();
    res.json({ ok: true, data: logs });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
