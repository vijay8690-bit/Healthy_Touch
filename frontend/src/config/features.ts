export const FEATURES = {
  DOCTOR_MODULE: false,
  LAB_MODULE: true,
  AMBULANCE_MODULE: false,
};

export const isProviderCategoryEnabled = (category?: string | null) => {
  const normalizedCategory = String(category || '').trim().toLowerCase();

  if (normalizedCategory === 'doctor') return FEATURES.DOCTOR_MODULE;
  if (normalizedCategory === 'ambulance') return FEATURES.AMBULANCE_MODULE;

  return true;
};
