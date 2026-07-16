export const cleanLabCodeCity = (city = '') => (
  String(city || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
);

export const getProviderLabCodeCity = (provider = {}) => (
  provider.address?.city ||
  provider.labServiceArea ||
  provider.location?.city ||
  ''
);

export const generateLabCode = (provider = {}) => {
  const cityPart = (cleanLabCodeCity(getProviderLabCodeCity(provider)).slice(0, 2) || 'XX').padEnd(2, 'X');
  const providerPart = String(provider._id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, '0');
  return `HT${cityPart}${providerPart}`.toUpperCase();
};

export const ensureProviderLabCode = (provider) => {
  if (!provider || provider.category !== 'Lab Technician') {
    return provider;
  }

  const nextLabCode = generateLabCode(provider);

  if (provider.labCode !== nextLabCode) {
    provider.labCode = nextLabCode;
  }

  return provider;
};
