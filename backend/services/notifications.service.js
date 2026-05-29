import { getDb } from '../database/db.js';

export function generateWhatsAppLink(phone, message) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export function getDomainAlertMessages(domain, clientName, expirationDate, paymentStatus, amountDue, currency, severity) {
  const expirationMsg = `Hola ${clientName || 'cliente'},\n\nLe informamos que el dominio ${domain} vence el día ${expirationDate}.\n\nEstado de pago actual: ${paymentStatus}.\n\nPara evitar interrupciones, favor confirmar la renovación.\n\nGracias.`;

  const paymentMsg = `Hola ${clientName || 'cliente'},\n\nTenemos registrado que el servicio asociado al dominio ${domain} aparece como pendiente de pago.\n\nMonto pendiente: ${amountDue || 0} ${currency || 'USD'}.\n\nFavor confirmar el pago o comunicarse con nosotros.\n\nGracias.`;

  const adminMsg = `ALERTA CRM HOSTING\n\nDominio: ${domain}\nCliente: ${clientName || 'N/A'}\nVence: ${expirationDate || 'N/A'}\nPago: ${paymentStatus || 'N/A'}\nMonto: ${amountDue || 0} ${currency || 'USD'}\nSeveridad: ${severity || 'N/A'}`;

  return { expirationMsg, paymentMsg, adminMsg };
}
