import { getDb } from '../database/db.js';

export function getAllAlerts() {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, d.domain, d.client_name, d.client_whatsapp, d.client_email
    FROM alerts a
    LEFT JOIN domains d ON a.domain_id = d.id
    ORDER BY a.created_at DESC
  `).all();
}

export function getAlertsByDomain(domainId) {
  const db = getDb();
  return db.prepare('SELECT * FROM alerts WHERE domain_id = ? ORDER BY created_at DESC').all(domainId);
}

export function generateAlerts() {
  const db = getDb();
  const results = { created: 0, errors: 0 };

  const domains = db.prepare(`
    SELECT * FROM domains
    WHERE alerts_enabled = 1 AND is_active = 1 AND expiration_date IS NOT NULL
  `).all();

  const insertAlert = db.prepare(`
    INSERT INTO alerts (domain_id, client_id, alert_type, severity, message, due_date, status)
    VALUES (?, NULL, ?, ?, ?, ?, 'pending')
  `);

  const existingAlert = db.prepare(`
    SELECT id FROM alerts
    WHERE domain_id = ? AND alert_type = ? AND severity = ? AND status = 'pending'
  `);

  for (const domain of domains) {
    const today = new Date();
    const expDate = new Date(domain.expiration_date);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    let alerts = [];

    if (diffDays <= 0) {
      alerts.push({ type: 'domain_expiration', severity: 'critica', message: `El dominio ${domain.domain} está VENCIDO desde el ${domain.expiration_date}` });
    } else if (diffDays <= 1) {
      alerts.push({ type: 'domain_expiration', severity: 'critica', message: `El dominio ${domain.domain} vence MAÑANA (${domain.expiration_date})` });
    } else if (diffDays <= 3) {
      alerts.push({ type: 'domain_expiration', severity: 'urgente', message: `El dominio ${domain.domain} vence en ${diffDays} días (${domain.expiration_date})` });
    } else if (diffDays <= 7) {
      alerts.push({ type: 'domain_expiration', severity: 'urgente', message: `El dominio ${domain.domain} vence en ${diffDays} días (${domain.expiration_date})` });
    } else if (diffDays <= 15) {
      alerts.push({ type: 'domain_expiration', severity: 'importante', message: `El dominio ${domain.domain} vence en ${diffDays} días (${domain.expiration_date})` });
    } else if (diffDays <= 30) {
      alerts.push({ type: 'domain_expiration', severity: 'importante', message: `El dominio ${domain.domain} vence en ${diffDays} días (${domain.expiration_date})` });
    } else if (diffDays <= 60) {
      alerts.push({ type: 'domain_expiration', severity: 'preventiva', message: `El dominio ${domain.domain} vence en ${diffDays} días (${domain.expiration_date})` });
    }

    if (domain.payment_status === 'pending' || domain.payment_status === 'overdue') {
      if (diffDays <= 0) {
        alerts.push({ type: 'payment', severity: 'critica', message: `Pago vencido para ${domain.domain}. Monto: ${domain.amount_due || 0} ${domain.currency}` });
      } else if (diffDays <= 7) {
        alerts.push({ type: 'payment', severity: 'urgente', message: `Pago pendiente para ${domain.domain}. Vence en ${diffDays} días. Monto: ${domain.amount_due || 0} ${domain.currency}` });
      }
    }

    for (const alert of alerts) {
      const exists = existingAlert.get(domain.id, alert.type, alert.severity);
      if (!exists) {
        insertAlert.run(domain.id, alert.type, alert.severity, alert.message, domain.expiration_date);
        results.created++;
      }
    }
  }

  return results;
}

export function markAlertSent(alertId) {
  const db = getDb();
  db.prepare(`
    UPDATE alerts SET sent_at = CURRENT_TIMESTAMP, status = 'sent' WHERE id = ?
  `).run(alertId);
  return { sent: true };
}
