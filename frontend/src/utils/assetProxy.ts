import { API_BASE_URL, TOKEN_KEY } from '@/config/api.config';

export const getAssetViewUrl = (
  src: string,
  disposition: 'inline' | 'attachment' = 'inline',
  options: { format?: string; filename?: string } = {},
) => {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  const params = new URLSearchParams({ src, token, disposition });
  if (options.format) params.set('format', options.format);
  if (options.filename) params.set('filename', options.filename);
  return `${API_BASE_URL}/assets/view?${params.toString()}`;
};

