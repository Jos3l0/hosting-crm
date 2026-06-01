let domains = [];
let currentDomainId = null;

async function api(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  const res = await fetch(url, config);
  return res.json();
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

async function init() {
  await loadDashboard();
  await loadDomains();
  await loadAlerts();
  await loadPayments();
  await loadSyncLogs();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('section-' + tab.dataset.tab).classList.add('active');
    });
  });

  document.querySelectorAll('#modalTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#modalTabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('searchInput').addEventListener('input', renderDomains);
  document.getElementById('filterPayment').addEventListener('change', renderDomains);
  document.getElementById('filterExpiration').addEventListener('change', renderDomains);
}

async function loadDashboard() {
  const res = await api('/api/domains/dashboard');
  if (!res.ok) return;
  const d = res.data;
  document.getElementById('statTotal').textContent = d.total;
  document.getElementById('statActive').textContent = d.active;
  document.getElementById('statExpiring').textContent = d.expiringSoon;
  document.getElementById('statExpired').textContent = d.expired;
  document.getElementById('statPaid').textContent = d.paid;
  document.getElementById('statPending').textContent = d.pending;
  document.getElementById('statDue').textContent = `$${Number(d.totalDue).toFixed(2)}`;
  document.getElementById('statPaidTotal').textContent = `$${Number(d.totalPaid).toFixed(2)}`;
  document.getElementById('statAlerts').textContent = d.criticalAlerts;
}

async function loadDomains() {
  document.getElementById('domainsLoading').style.display = 'block';
  document.getElementById('domainsTable').style.display = 'none';
  document.getElementById('domainsEmpty').style.display = 'none';

  const res = await api('/api/domains');
  if (!res.ok) {
    showToast('Error al cargar dominios', 'error');
    return;
  }
  domains = res.data;
  renderDomains();
}

function getPaymentBadge(status) {
  const map = {
    paid: '<span class="badge badge-green">Pagó</span>',
    pending: '<span class="badge badge-yellow">No pagó</span>',
    overdue: '<span class="badge badge-red">Vencido</span>',
    partial: '<span class="badge badge-blue">Pago parcial</span>',
    exempt: '<span class="badge badge-purple">Exento</span>',
    cancelled: '<span class="badge badge-gray">Cancelado</span>'
  };
  return map[status] || `<span class="badge badge-gray">${status}</span>`;
}

function getStatusBadge(isActive) {
  return isActive
    ? '<span class="badge badge-green">Activo</span>'
    : '<span class="badge badge-gray">Inactivo</span>';
}

function getAlertSeverityDot(severity) {
  return `<span class="alert-dot ${severity}"></span>`;
}

function getExpirationColor(date) {
  if (!date) return '';
  const today = new Date();
  const exp = new Date(date);
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'color:var(--danger);font-weight:600;';
  if (diff <= 7) return 'color:var(--danger);font-weight:600;';
  if (diff <= 30) return 'color:var(--warning);font-weight:600;';
  return '';
}

function getAlertSummary(domain) {
  if (!domain.alerts_enabled) return 'Desactivadas';
  if (!domain.expiration_date) return 'Sin fecha';
  const today = new Date();
  const exp = new Date(domain.expiration_date);
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '<span class="alert-dot critica"></span>Vencido';
  if (diff <= 7) return '<span class="alert-dot urgente"></span>Urgente';
  if (diff <= 30) return '<span class="alert-dot importante"></span>Próximo';
  return '<span class="alert-dot preventiva"></span>OK';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function renderDomains() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filterPayment = document.getElementById('filterPayment').value;
  const filterExp = document.getElementById('filterExpiration').value;

  let filtered = domains.filter(d => {
    if (filterPayment && d.payment_status !== filterPayment) return false;

    if (filterExp) {
      const diff = daysUntil(d.expiration_date);
      if (filterExp === 'no-date') return !d.expiration_date;
      if (filterExp === 'expired') return diff !== null && diff < 0;
      if (filterExp === '7days') return diff !== null && diff >= 0 && diff <= 7;
      if (filterExp === '30days') return diff !== null && diff >= 0 && diff <= 30;
      if (filterExp === '90days') return diff !== null && diff >= 0 && diff <= 90;
    }

    if (search) {
      const q = search.toLowerCase();
      return (d.domain && d.domain.toLowerCase().includes(q)) ||
             (d.client_name && d.client_name.toLowerCase().includes(q)) ||
             (d.client_email && d.client_email.toLowerCase().includes(q)) ||
             (d.client_phone && d.client_phone.toLowerCase().includes(q));
    }
    return true;
  });

  document.getElementById('domainsLoading').style.display = 'none';

  if (filtered.length === 0) {
    document.getElementById('domainsTable').style.display = 'none';
    document.getElementById('domainsEmpty').style.display = 'block';
    return;
  }

  document.getElementById('domainsTable').style.display = '';
  document.getElementById('domainsEmpty').style.display = 'none';

  const tbody = document.getElementById('domainsBody');
  tbody.innerHTML = filtered.map(d => {
    const waLink = d.client_whatsapp
      ? `<a href="https://wa.me/${d.client_whatsapp.replace(/[^\d]/g, '')}" target="_blank" title="Enviar WhatsApp">📱</a>`
      : '';
    return `<tr class="${d.is_active ? '' : 'inactive'}">
      <td><span class="domain-name" onclick="openEditModal(${d.id}, 'profile')">${d.domain}</span></td>
      <td>${d.client_name || '-'}</td>
      <td>${d.client_email || '-'}</td>
      <td>${d.client_whatsapp || '-'} ${waLink}</td>
      <td style="${getExpirationColor(d.expiration_date)}">${d.expiration_date || '-'}</td>
      <td>${getPaymentBadge(d.payment_status)}</td>
      <td>${getStatusBadge(d.is_active)}</td>
      <td>${getAlertSummary(d)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openEditModal(${d.id}, 'profile')" title="Editar">✏️</button>
        <button class="btn btn-sm btn-outline" onclick="openEditModal(${d.id}, 'payment')" title="Pago">💰</button>
        <button class="btn btn-sm btn-outline" onclick="sendWhatsApp(${d.id})" title="WhatsApp">📱</button>
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteDomain(${d.id}, '${d.domain}')" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function confirmDeleteDomain(id, domain) {
  if (confirm(`¿Estás seguro de eliminar el dominio "${domain}"?\nEsta acción no se puede deshacer.`)) {
    deleteDomain(id);
  }
}

async function deleteDomain(id) {
  const res = await api(`/api/domains/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Dominio eliminado', 'success');
    await loadDomains();
    await loadDashboard();
  } else {
    showToast('Error al eliminar: ' + (res.message || 'desconocido'), 'error');
  }
}

async function openEditModal(id, tab = 'profile') {
  currentDomainId = id;
  const res = await api(`/api/domains/${id}`);
  if (!res.ok) { showToast('Error al cargar dominio', 'error'); return; }
  const d = res.data;

  document.getElementById('editDomain').value = d.domain || '';
  document.getElementById('editClientName').value = d.client_name || '';
  document.getElementById('editClientCompany').value = d.client_company || '';
  document.getElementById('editClientEmail').value = d.client_email || '';
  document.getElementById('editClientPhone').value = d.client_phone || '';
  document.getElementById('editClientWhatsapp').value = d.client_whatsapp || '';
  document.getElementById('editNotes').value = d.notes || '';
  document.getElementById('editExpirationDate').value = d.expiration_date || '';
  document.getElementById('editPaymentStatus').value = d.payment_status || 'pending';
  document.getElementById('editAmountDue').value = d.amount_due || '';
  document.getElementById('editCurrency').value = d.currency || 'USD';
  document.getElementById('editLastPaymentDate').value = d.last_payment_date || '';
  document.getElementById('editNextPaymentDue').value = d.next_payment_due || '';
  document.getElementById('editPaymentNotes').value = d.payment_notes || '';
  document.getElementById('editAlertsEnabled').checked = d.alerts_enabled === 1;
  document.getElementById('editAlertEmailEnabled').checked = d.alert_email_enabled === 1;
  document.getElementById('editAlertWhatsappEnabled').checked = d.alert_whatsapp_enabled === 1;

  document.querySelectorAll('#modalTabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  const tabEl = document.querySelector(`#modalTabs .tab[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');

  openModal('domainModal');
}

async function saveProfile() {
  const body = {
    client_name: document.getElementById('editClientName').value,
    client_company: document.getElementById('editClientCompany').value,
    client_email: document.getElementById('editClientEmail').value,
    client_phone: document.getElementById('editClientPhone').value,
    client_whatsapp: document.getElementById('editClientWhatsapp').value,
    notes: document.getElementById('editNotes').value
  };
  const res = await api(`/api/domains/${currentDomainId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
  if (res.ok) {
    showToast('Perfil guardado', 'success');
    closeModal('domainModal');
    await loadDomains();
  } else {
    showToast('Error al guardar: ' + (res.message || 'desconocido'), 'error');
  }
}

async function saveExpiration() {
  const expiration_date = document.getElementById('editExpirationDate').value;
  if (!expiration_date) {
    showToast('Selecciona una fecha de vencimiento', 'error');
    return;
  }
  const res = await api(`/api/domains/${currentDomainId}/expiration`, {
    method: 'PUT',
    body: JSON.stringify({ expiration_date })
  });
  if (res.ok) {
    showToast('Vencimiento guardado', 'success');
    closeModal('domainModal');
    await loadDomains();
    await loadDashboard();
  } else {
    showToast('Error al guardar: ' + (res.message || 'desconocido'), 'error');
  }
}

async function savePayment() {
  const body = {
    payment_status: document.getElementById('editPaymentStatus').value,
    amount_due: document.getElementById('editAmountDue').value ? parseFloat(document.getElementById('editAmountDue').value) : null,
    currency: document.getElementById('editCurrency').value,
    last_payment_date: document.getElementById('editLastPaymentDate').value || null,
    next_payment_due: document.getElementById('editNextPaymentDue').value || null,
    payment_notes: document.getElementById('editPaymentNotes').value
  };
  const res = await api(`/api/domains/${currentDomainId}/payment`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
  if (res.ok) {
    showToast('Pago guardado', 'success');
    closeModal('domainModal');
    await loadDomains();
    await loadDashboard();
  } else {
    showToast('Error al guardar: ' + (res.message || 'desconocido'), 'error');
  }
}

async function saveAlerts() {
  const body = {
    alerts_enabled: document.getElementById('editAlertsEnabled').checked,
    alert_email_enabled: document.getElementById('editAlertEmailEnabled').checked,
    alert_whatsapp_enabled: document.getElementById('editAlertWhatsappEnabled').checked
  };
  const res = await api(`/api/domains/${currentDomainId}/alerts`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
  if (res.ok) {
    showToast('Alertas guardadas', 'success');
    closeModal('domainModal');
    await loadDomains();
  } else {
    showToast('Error al guardar: ' + (res.message || 'desconocido'), 'error');
  }
}

async function sendWhatsApp(domainId) {
  const res = await api(`/api/domains/${domainId}`);
  if (!res.ok) { showToast('Error al cargar dominio', 'error'); return; }
  const d = res.data;
  if (!d.client_whatsapp) {
    showToast('Este dominio no tiene número de WhatsApp configurado', 'error');
    return;
  }
  const msg = `Hola ${d.client_name || 'cliente'},\n\nLe informamos que el dominio ${d.domain} vence el día ${d.expiration_date || 'próximamente'}.\n\nEstado de pago actual: ${d.payment_status || 'pendiente'}.\n\nPara evitar interrupciones, favor confirmar la renovación.\n\nGracias.`;
  const phone = d.client_whatsapp.replace(/[^\d]/g, '');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function syncWithSPanel() {
  const btn = document.getElementById('syncBtn');
  btn.disabled = true;
  btn.textContent = 'Sincronizando...';
  const res = await api('/api/sync/spanel', { method: 'POST' });
  btn.disabled = false;
  btn.textContent = '🔄 Sincronizar SPanel';
  if (res.ok) {
    showToast(res.message, 'success');
    document.getElementById('syncResult').innerHTML = `<div style="padding:12px;background:#dcfce7;border-radius:8px;color:#166534;">${res.message}</div>`;
    await loadDomains();
    await loadDashboard();
    await loadSyncLogs();
  } else {
    showToast('Error: ' + (res.message || 'Error al sincronizar'), 'error');
    document.getElementById('syncResult').innerHTML = `<div style="padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b;">Error: ${res.message || 'No se pudo sincronizar'}</div>`;
  }
}

async function loadSyncLogs() {
  document.getElementById('syncLogsLoading').style.display = 'block';
  document.getElementById('syncLogsContainer').style.display = 'none';
  const res = await api('/api/sync/logs');
  if (!res.ok) return;
  document.getElementById('syncLogsLoading').style.display = 'none';
  if (res.data.length === 0) return;
  document.getElementById('syncLogsContainer').style.display = '';
  document.getElementById('syncLogsBody').innerHTML = res.data.map(l =>
    `<tr>
      <td style="white-space:nowrap;">${l.created_at}</td>
      <td>${l.source}</td>
      <td><span class="badge ${l.status === 'completado' ? 'badge-green' : l.status === 'error' ? 'badge-red' : 'badge-yellow'}">${l.status}</span></td>
      <td>${l.message}</td>
    </tr>`
  ).join('');
}

async function loadAlerts() {
  const res = await api('/api/alerts');
  if (!res.ok) return;
  const container = document.getElementById('alertsContainer');
  if (res.data.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No hay alertas</h3><p>Genera alertas para ver notificaciones de vencimientos y pagos.</p></div>';
    return;
  }
  container.innerHTML = res.data.map(a => {
    const sevClass = a.severity || 'preventiva';
    const sentClass = a.status === 'sent' ? 'sent' : '';
    const waBtn = a.client_whatsapp
      ? `<button class="btn btn-sm btn-success" onclick="sendAlertWhatsApp(${a.id})">📱 WA</button>`
      : '';
    return `<div class="alert-item ${sevClass} ${sentClass}">
      <div class="alert-content">
        <div class="alert-domain">${getAlertSeverityDot(sevClass)} ${a.domain || 'N/A'}</div>
        <div class="alert-message">${a.message}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">
          ${a.severity} · ${a.alert_type} · ${a.created_at}
        </div>
      </div>
      <div class="alert-actions">
        ${a.status === 'pending' ? `<button class="btn btn-sm btn-outline" onclick="markAlertSent(${a.id})">✅</button>` : ''}
        ${waBtn}
      </div>
    </div>`;
  }).join('');
}

async function generateAlerts() {
  const res = await api('/api/alerts/generate', { method: 'POST' });
  if (res.ok) {
    showToast(`${res.created} alertas generadas`, 'success');
    await loadAlerts();
    await loadDashboard();
  } else {
    showToast('Error al generar alertas', 'error');
  }
}

async function markAlertSent(id) {
  const res = await api(`/api/alerts/${id}/send-email`, { method: 'POST' });
  if (res.ok) {
    showToast('Alerta marcada como enviada', 'success');
    await loadAlerts();
  }
}

async function sendAlertWhatsApp(id) {
  const res = await api(`/api/alerts/${id}/send-whatsapp-link`, { method: 'POST' });
  if (res.ok && res.whatsappLink) {
    window.open(res.whatsappLink, '_blank');
    showToast('Enlace de WhatsApp generado', 'success');
    await loadAlerts();
  } else {
    showToast(res.message || 'Error al generar enlace', 'error');
  }
}

async function loadPayments() {
  const res = await api('/api/payments');
  if (!res.ok) return;
  const tbody = document.getElementById('paymentsBody');
  const table = document.getElementById('paymentsTable');
  const empty = document.getElementById('paymentsEmpty');
  if (res.data.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  table.style.display = '';
  empty.style.display = 'none';
  tbody.innerHTML = res.data.map(p =>
    `<tr>
      <td>${p.domain || '-'}</td>
      <td>${p.client_name || '-'}</td>
      <td>$${Number(p.amount).toFixed(2)} ${p.currency || 'USD'}</td>
      <td>${p.method || '-'}</td>
      <td>${p.paid_at || '-'}</td>
      <td>${p.reference || '-'}</td>
      <td>${p.notes || '-'}</td>
    </tr>`
  ).join('');
}

function openAddPayment() {
  const select = document.getElementById('paymentDomain');
  select.innerHTML = '<option value="">Seleccionar dominio...</option>';
  domains.forEach(d => {
    select.innerHTML += `<option value="${d.id}">${d.domain}${d.client_name ? ' - ' + d.client_name : ''}</option>`;
  });
  document.getElementById('paymentAmount').value = '';
  document.getElementById('paymentMethod').value = '';
  document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('paymentReference').value = '';
  document.getElementById('paymentNotes').value = '';
  openModal('paymentModal');
}

async function savePaymentRecord() {
  const body = {
    domain_id: document.getElementById('paymentDomain').value || null,
    amount: document.getElementById('paymentAmount').value || 0,
    method: document.getElementById('paymentMethod').value,
    paid_at: document.getElementById('paymentDate').value,
    reference: document.getElementById('paymentReference').value,
    notes: document.getElementById('paymentNotes').value
  };
  if (!body.domain_id) { showToast('Selecciona un dominio', 'error'); return; }
  const res = await api('/api/payments', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (res.ok) {
    showToast('Pago registrado', 'success');
    closeModal('paymentModal');
    await loadPayments();
  } else {
    showToast('Error al registrar pago', 'error');
  }
}

function openAddDomain() {
  document.getElementById('manualDomain').value = '';
  document.getElementById('manualClient').value = '';
  openModal('addDomainModal');
}

async function addManualDomain() {
  const domain = document.getElementById('manualDomain').value.trim();
  const client = document.getElementById('manualClient').value.trim();
  if (!domain) { showToast('El dominio es obligatorio', 'error'); return; }
  const body = { domain, client_name: client || null };
  const res = await api('/api/domains', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (res.ok) {
    showToast('Dominio añadido', 'success');
    closeModal('addDomainModal');
    await loadDomains();
    await loadDashboard();
  } else {
    showToast('Error al añadir dominio: ' + (res.message || ''), 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
