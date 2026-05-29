import cron from 'node-cron';

let job = null;

export function startDailySyncJob() {
  if (job) return;

  job = cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Ejecutando sincronización diaria con SPanel...');
    try {
      const { listSPanelAccounts } = await import('../services/spanel.accounts.js');
      const { listSPanelDomains, extractDomainsFromAccount } = await import('../services/spanel.domains.js');
      const { upsertDomainFromSPanel } = await import('../services/domains.service.js');
      const { getDb } = await import('../database/db.js');

      const db = getDb();
      const accounts = await listSPanelAccounts();
      let totalDomains = 0;

      for (const account of accounts) {
        const mainDomains = extractDomainsFromAccount(account);
        for (const dom of mainDomains) {
          totalDomains++;
          upsertDomainFromSPanel(dom);
        }
        try {
          const addonDomains = await listSPanelDomains(account.user);
          for (const dom of addonDomains) {
            totalDomains++;
            upsertDomainFromSPanel(dom);
          }
        } catch (e) {}
      }

      db.prepare('INSERT INTO sync_logs (source, status, message) VALUES (?, ?, ?)')
        .run('cron', 'completado', `Sincronización diaria automática. Dominios sincronizados: ${totalDomains}`);

      console.log(`[Cron] Sincronización diaria completada. Dominios: ${totalDomains}`);
    } catch (error) {
      console.error('[Cron] Error en sincronización diaria:', error.message);
    }
  }, {
    scheduled: false
  });

  job.start();
  console.log('[Cron] Job de sincronización diaria programado (3:00 AM)');
}

export function stopDailySyncJob() {
  if (job) {
    job.stop();
    job = null;
  }
}
