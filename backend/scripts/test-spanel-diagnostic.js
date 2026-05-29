import 'dotenv/config';
import { spanelRequest } from '../services/spanel.service.js';

async function main() {
  console.log('=== ACCOUNTS LIST ===');
  const accts = await spanelRequest('accounts/listaccounts');
  console.log('data type:', typeof accts.data, 'isArray:', Array.isArray(accts.data));
  if (accts.data) {
    if (Array.isArray(accts.data)) {
      console.log('count:', accts.data.length);
      if (accts.data.length > 0) {
        console.log('first account keys:', Object.keys(accts.data[0]));
        console.log('first account:', JSON.stringify(accts.data[0], null, 2));
      }
    } else {
      console.log('object keys sample:', Object.keys(accts.data).slice(0,15));
      const firstKey = Object.keys(accts.data)[0];
      console.log('first entry:', firstKey, '->', JSON.stringify(accts.data[firstKey]).slice(0,300));
    }
  } else {
    console.log('Full response:', JSON.stringify(accts, null, 2).slice(0,2000));
  }

  console.log('\n=== DOMAIN LIST (first account) ===');
  if (Array.isArray(accts.data) && accts.data.length > 0) {
    const a = accts.data[0];
    const user = a.user || a.username || a.name;
    console.log('trying user:', user);
    try {
      const doms = await spanelRequest('domain/listdomains', {}, { accountuser: user });
      console.log('response:', JSON.stringify(doms, null, 2).slice(0,2000));
    } catch(e) {
      console.log('domain err:', e.message);
    }
  }
}
main().catch(e => console.error(e));
