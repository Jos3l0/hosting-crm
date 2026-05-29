CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT UNIQUE NOT NULL,
  spanel_user TEXT,
  spanel_account_id TEXT,
  is_primary INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_seen_in_spanel DATETIME,
  client_name TEXT,
  client_company TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_whatsapp TEXT,
  expiration_date DATE,
  expiration_source TEXT DEFAULT 'manual',
  payment_status TEXT DEFAULT 'pending',
  amount_due DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  last_payment_date DATE,
  next_payment_due DATE,
  payment_notes TEXT,
  alerts_enabled INTEGER DEFAULT 1,
  alert_email_enabled INTEGER DEFAULT 1,
  alert_whatsapp_enabled INTEGER DEFAULT 0,
  alert_sms_enabled INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  client_id INTEGER,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  method TEXT,
  paid_at DATE,
  reference TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(domain_id) REFERENCES domains(id),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER,
  client_id INTEGER,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  due_date DATE,
  sent_email INTEGER DEFAULT 0,
  sent_whatsapp INTEGER DEFAULT 0,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(domain_id) REFERENCES domains(id),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  status TEXT,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
