import axios from 'axios';

const SPANEL_API_URL = process.env.SPANEL_API_URL;
const SPANEL_API_TOKEN = process.env.SPANEL_API_TOKEN;

if (!SPANEL_API_URL) {
  throw new Error('SPANEL_API_URL no está definido');
}

if (!SPANEL_API_TOKEN) {
  throw new Error('SPANEL_API_TOKEN no está definido');
}

function maskSecret(value) {
  if (!value) return '';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function spanelRequest(action, params = {}, options = {}) {
  if (!action || typeof action !== 'string') {
    throw new Error('La acción de SPanel es obligatoria');
  }

  const form = new URLSearchParams();
  form.append('token', SPANEL_API_TOKEN);
  form.append('action', action);

  if (options.accountuser) {
    form.append('accountuser', options.accountuser);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  }

  try {
    const response = await axios.post(SPANEL_API_URL, form, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 500
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`SPanel respondió HTTP ${response.status}`);
    }

    if (!response.data) {
      throw new Error('SPanel respondió vacío');
    }

    if (response.data.errors) {
      throw new Error(`Error SPanel: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data;
  } catch (error) {
    console.error('[SPanel] Error llamando SPanel', {
      action,
      accountuser: options.accountuser || null,
      endpoint: SPANEL_API_URL,
      token: maskSecret(SPANEL_API_TOKEN),
      message: error.message
    });

    if (error.response) {
      console.error('[SPanel] Respuesta:', {
        status: error.response.status,
        data: error.response.data
      });
    }

    throw new Error('No se pudo completar la comunicación con SPanel');
  }
}
