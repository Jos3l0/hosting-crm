import { getDb } from '../database/db.js';

export function getAllDomains() {
  const db = getDb();
  return db.prepare('SELECT * FROM domains ORDER BY domain ASC').all();
}

export function getDomainById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
}

export function getDomainByDomainName(domain) {
  const db = getDb();
  return db.prepare('SELECT * FROM domains WHERE domain = ?').get(domain);
}

export function upsertDomainFromSPanel(spanelDomain) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM domains WHERE domain = ?').get(spanelDomain.domain);

  if (!existing) {
    const result = db.prepare(`
      INSERT INTO domains (
        domain, spanel_user, is_active, last_seen_in_spanel,
        expiration_source, payment_status, alerts_enabled,
        created_at, updated_at
      ) VALUES (?, ?, 1, CURRENT_TIMESTAMP, 'manual', 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(spanelDomain.domain, spanelDomain.spanelUser);
    return { action: 'created', id: result.lastInsertRowid };
  }

  db.prepare(`
    UPDATE domains SET
      spanel_user = ?,
      is_active = 1,
      last_seen_in_spanel = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE domain = ?
  `).run(spanelDomain.spanelUser, spanelDomain.domain);

  return { action: 'updated', id: existing.id };
}

export function updateDomainProfile(id, data) {
  const db = getDb();
  const fields = [];
  const values = [];

  if (data.client_name !== undefined) { fields.push('client_name = ?'); values.push(data.client_name); }
  if (data.client_company !== undefined) { fields.push('client_company = ?'); values.push(data.client_company); }
  if (data.client_email !== undefined) { fields.push('client_email = ?'); values.push(data.client_email); }
  if (data.client_phone !== undefined) { fields.push('client_phone = ?'); values.push(data.client_phone); }
  if (data.client_whatsapp !== undefined) { fields.push('client_whatsapp = ?'); values.push(data.client_whatsapp); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

  if (fields.length === 0) return { updated: false };

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return { updated: true };
}

export function updateDomainExpiration(id, expirationDate) {
  const db = getDb();
  db.prepare(`
    UPDATE domains SET
      expiration_date = ?,
      expiration_source = 'manual',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(expirationDate, id);
  return { updated: true };
}

export function updateDomainPayment(id, data) {
  const db = getDb();
  const fields = [];
  const values = [];

  if (data.payment_status !== undefined) { fields.push('payment_status = ?'); values.push(data.payment_status); }
  if (data.amount_due !== undefined) { fields.push('amount_due = ?'); values.push(data.amount_due); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
  if (data.last_payment_date !== undefined) { fields.push('last_payment_date = ?'); values.push(data.last_payment_date); }
  if (data.next_payment_due !== undefined) { fields.push('next_payment_due = ?'); values.push(data.next_payment_due); }
  if (data.payment_notes !== undefined) { fields.push('payment_notes = ?'); values.push(data.payment_notes); }

  if (fields.length === 0) return { updated: false };

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return { updated: true };
}

export function updateDomainAlerts(id, data) {
  const db = getDb();
  const fields = [];
  const values = [];

  if (data.alerts_enabled !== undefined) { fields.push('alerts_enabled = ?'); values.push(data.alerts_enabled ? 1 : 0); }
  if (data.alert_email_enabled !== undefined) { fields.push('alert_email_enabled = ?'); values.push(data.alert_email_enabled ? 1 : 0); }
  if (data.alert_whatsapp_enabled !== undefined) { fields.push('alert_whatsapp_enabled = ?'); values.push(data.alert_whatsapp_enabled ? 1 : 0); }

  if (fields.length === 0) return { updated: false };

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return { updated: true };
}

export function getDashboardStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM domains').get();
  const active = db.prepare('SELECT COUNT(*) as count FROM domains WHERE is_active = 1').get();
  const expiringSoon = db.prepare(`
    SELECT COUNT(*) as count FROM domains
    WHERE expiration_date IS NOT NULL
    AND expiration_date BETWEEN DATE('now') AND DATE('now', '+30 days')
    AND is_active = 1
  `).get();
  const expired = db.prepare(`
    SELECT COUNT(*) as count FROM domains
    WHERE expiration_date IS NOT NULL
    AND expiration_date < DATE('now')
    AND is_active = 1
  `).get();
  const paid = db.prepare("SELECT COUNT(*) as count FROM domains WHERE payment_status = 'paid'").get();
  const pending = db.prepare("SELECT COUNT(*) as count FROM domains WHERE payment_status = 'pending' AND is_active = 1").get();
  const overdue = db.prepare("SELECT COUNT(*) as count FROM domains WHERE payment_status = 'overdue'").get();

  const totalDue = db.prepare(`
    SELECT COALESCE(SUM(amount_due), 0) as total FROM domains
    WHERE payment_status IN ('pending', 'overdue')
  `).get();

  const totalPaid = db.prepare(`
    SELECT COALESCE(SUM(amount_due), 0) as total FROM domains
    WHERE payment_status = 'paid'
  `).get();

  const criticalAlerts = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'pending' AND severity IN ('critica', 'urgente')").get();

  return {
    total: total.count,
    active: active.count,
    expiringSoon: expiringSoon.count,
    expired: expired.count,
    paid: paid.count,
    pending: pending.count,
    overdue: overdue.count,
    totalDue: totalDue.total,
    totalPaid: totalPaid.total,
    criticalAlerts: criticalAlerts.count
  };
}

export function deleteDomain(id) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
  if (!existing) {
    throw new Error('Dominio no encontrado');
  }
  db.prepare('DELETE FROM domains WHERE id = ?').run(id);
  return { deleted: true };
}

export function createManualDomain(domain, clientName) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM domains WHERE domain = ?').get(domain);
  if (existing) {
    throw new Error('El dominio ya existe en la base de datos');
  }
  const result = db.prepare(`
    INSERT INTO domains (
      domain, client_name, is_active, expiration_source,
      payment_status, alerts_enabled, created_at, updated_at
    ) VALUES (?, ?, 1, 'manual', 'pending', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(domain, clientName || null);
  return { id: result.lastInsertRowid };
}
