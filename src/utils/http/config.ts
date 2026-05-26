export const BASE_URL = import.meta.env.VITE_APP_API_URL || '/aicg/';
export const TIMEOUT = 10000;

export const ContentType = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
};