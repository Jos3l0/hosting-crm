import { getDb } from '../database/db.js';

export function getAllPayments() {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, d.domain, d.client_name
    FROM payments p
    LEFT JOIN domains d ON p.domain_id = d.id
    ORDER BY p.paid_at DESC
  `).all();
}

export function getPaymentsByDomain(domainId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM payments WHERE domain_id = ? ORDER BY paid_at DESC
  `).all(domainId);
}

export function createPayment(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO payments (domain_id, client_id, amount, currency, method, paid_at, reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.domain_id || null,
    data.client_id || null,
    data.amount || 0,
    data.currency || 'USD',
    data.method || null,
    data.paid_at || null,
    data.reference || null,
    data.notes || null
  );
  return { id: result.lastInsertRowid };
}
