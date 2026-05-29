import express from 'express';
import { createManualDomain, 
  getAllDomains, getDomainById, updateDomainProfile,
  updateDomainExpiration, updateDomainPayment, updateDomainAlerts,
  getDashboardStats
} from '../services/domains.service.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const domains = getAllDomains();
    res.json({ ok: true, data: domains });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/dashboard', (req, res) => {
  try {
    const stats = getDashboardStats();
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const domain = getDomainById(req.params.id);
    if (!domain) return res.status(404).json({ ok: false, message: 'Dominio no encontrado' });
    res.json({ ok: true, data: domain });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put('/:id/profile', (req, res) => {
  try {
    const { client_name, client_company, client_email, client_phone, client_whatsapp, notes } = req.body;
    const result = updateDomainProfile(req.params.id, { client_name, client_company, client_email, client_phone, client_whatsapp, notes });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put('/:id/expiration', (req, res) => {
  try {
    const { expiration_date } = req.body;
    if (!expiration_date) return res.status(400).json({ ok: false, message: 'expiration_date es requerido' });
    const result = updateDomainExpiration(req.params.id, expiration_date);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put('/:id/payment', (req, res) => {
  try {
    const result = updateDomainPayment(req.params.id, req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.put('/:id/alerts', (req, res) => {
  try {
    const result = updateDomainAlerts(req.params.id, req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;

router.post('/', (req, res) => {
  try {
    const { domain, client_name } = req.body;
    if (!domain) return res.status(400).json({ ok: false, message: 'El dominio es requerido' });
    const result = createManualDomain(domain, client_name);
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});
