import express from 'express';
import { getAllPayments, getPaymentsByDomain, createPayment } from '../services/payments.service.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const payments = getAllPayments();
    res.json({ ok: true, data: payments });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get('/domain/:domainId', (req, res) => {
  try {
    const payments = getPaymentsByDomain(req.params.domainId);
    res.json({ ok: true, data: payments });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const result = createPayment(req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
