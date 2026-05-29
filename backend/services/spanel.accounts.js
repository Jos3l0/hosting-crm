import { spanelRequest } from './spanel.service.js';

export async function listSPanelAccounts() {
  const result = await spanelRequest('accounts/listaccounts');

  if (!result.data || !Array.isArray(result.data)) {
    return [];
  }

  return result.data.map(account => ({
    domain: account.domain,
    user: account.user,
    ip: account.ip,
    disk: account.disk,
    inodes: account.inodes,
    suspended: account.suspended === '1',
    packageName: account.package,
    setupDate: account.setupDate,
    diskLimit: account.disklimit,
    emailsLimit: account.emailslimit,
    databasesLimit: account.databaseslimit
  }));
}
