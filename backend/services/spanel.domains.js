export function extractDomainsFromAccount(account) {
  if (!account || !account.domain) return [];

  return [{
    domain: account.domain,
    spanelUser: account.user,
    isMainDomain: true,
    suspended: account.suspended === '1'
  }];
}

export async function listSPanelDomains(accountuser) {
  if (!accountuser) return [];
  try {
    const { spanelRequest } = await import('./spanel.service.js');
    const result = await spanelRequest(
      'domain/listdomains',
      {},
      { accountuser }
    );
    if (result.data && Array.isArray(result.data)) {
      return result.data.map(item => ({
        domain: item.domain,
        documentRoot: item.documentroot || item.documentRoot || null,
        isMainDomain: item.maindomain === '1' || item.mainDomain === '1',
        modSecurity: item.modsecurity || null,
        spanelUser: accountuser
      }));
    }
  } catch (e) {
    // domain/listdomains no disponible en esta versión de SPanel
  }
  return [];
}
