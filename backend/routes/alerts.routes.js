import express from 'express';
import { getAllAlerts, getAlertsByDomain, generateAlerts, markAlertSent } from '../services/alerts.service.js';
import { getDomainById } from '../services/domains.service.js';
import { generateWhatsAppLink, getDomainAlertMessages } from '../services/notifications.service.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const alerts = getAllAlerts();
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/domain/:domainId', (req, res) => {
  try {
    const alerts = getAlertsByDomain(req.params.domainId);
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/generate', (req, res) => {
  try {
    const result = generateAlerts();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/:id/send-email', (req, res) => {
  try {
    const result = markAlertSent(req.params.id);
    res.json({ ok: true, message: 'Email enviado (simulado)', ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/:id/send-whatsapp-link', (req, res) => {
  try {
    const alerts = getAllAlerts();
    const alert = alerts.find(a => a.id == req.params.id);
    if (!alert) return res.status(404).json({ ok: false, message: 'Alerta no encontrada' });

    const domain = getDomainById(alert.domain_id);
    if (!domain || !domain.client_whatsapp) {
      return res.status(400).json({ ok: false, message: 'El dominio no tiene número de WhatsApp configurado' });
    }

    const messages = getDomainAlertMessages(
      domain.domain, domain.client_name, domain.expiration_date,
      domain.payment_status, domain.amount_due, domain.currency, alert.severity
    );

    const msg = alert.alert_type === 'payment' ? messages.paymentMsg : messages.expirationMsg;
    const link = generateWhatsAppLink(domain.client_whatsapp, msg);

    markAlertSent(req.params.id);

    res.json({ ok: true, whatsappLink: link, message: msg });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
