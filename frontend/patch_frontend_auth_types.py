import re
with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/AuthPage.tsx', 'r') as f:
    code = f.read()

# Update ProviderType
code = code.replace("type ProviderType = 'doctor' | 'nurse' | 'Lab' | 'physiotherapy';", "type ProviderType = 'doctor' | 'nurse' | 'Lab' | 'physiotherapy' | 'ambulance';")

# Update provider description
code = code.replace("description: 'Doctor, Nurse, Lab or Physiotherapy - Offer your services',", "description: 'Doctor, Nurse, Lab, Physiotherapy or Ambulance - Offer your services',")

# Update providerTypes array
provider_array_old = """const providerTypes = [
  { type: 'doctor' as ProviderType, icon: Stethoscope, title: 'Doctor', description: 'Medical consultations' },
  { type: 'nurse' as ProviderType, icon: Heart, title: 'Nurse', description: 'Nursing care services' },
  { type: 'Lab' as ProviderType, icon: UserCheck, title: 'Lab', description: 'Diagnostic & lab services' },
  { type: 'physiotherapy' as ProviderType, icon: Activity, title: 'Physiotherapy', description: 'Physical therapy services' },
];"""

provider_array_new = """import { AmbulanceIcon } from 'lucide-react';\n\nconst providerTypes = [
  { type: 'doctor' as ProviderType, icon: Stethoscope, title: 'Doctor', description: 'Medical consultations' },
  { type: 'nurse' as ProviderType, icon: Heart, title: 'Nurse', description: 'Nursing care services' },
  { type: 'Lab' as ProviderType, icon: UserCheck, title: 'Lab', description: 'Diagnostic & lab services' },
  { type: 'physiotherapy' as ProviderType, icon: Activity, title: 'Physiotherapy', description: 'Physical therapy services' },
  { type: 'ambulance' as ProviderType, icon: AmbulanceIcon, title: 'Ambulance', description: 'Emergency & Transport Services' },
];"""
code = code.replace(provider_array_old, provider_array_new)

# Update categoryMappings
c_mapping_old = """        const categoryMapping: Record<ProviderType, string> = {
          'doctor': 'Doctor',
          'nurse': 'Nurse',
          'physiotherapy': 'Physiotherapist',
          'Lab': 'Lab ',
        };"""
c_mapping_new = """        const categoryMapping: Record<ProviderType, string> = {
          'doctor': 'Doctor',
          'nurse': 'Nurse',
          'physiotherapy': 'Physiotherapist',
          'Lab': 'Lab ',
          'ambulance': 'Ambulance',
        };"""
code = code.replace(c_mapping_old, c_mapping_new)

c_m2_old = """          const categoryMapping: Record<ProviderType, string> = {
            'doctor': 'Doctor',
            'nurse': 'Nurse',
            'physiotherapy': 'Physiotherapist',
            'Lab': 'Lab ',
          };"""
c_m2_new = """          const categoryMapping: Record<ProviderType, string> = {
            'doctor': 'Doctor',
            'nurse': 'Nurse',
            'physiotherapy': 'Physiotherapist',
            'Lab': 'Lab ',
            'ambulance': 'Ambulance',
          };"""
code = code.replace(c_m2_old, c_m2_new)


h_old = """    switch(type) {
      case 'doctor':"""
h_new = """    switch(type) {
      case 'ambulance':
        setHeroImage('https://images.unsplash.com/photo-1587559070757-f72a388edbba?w=800&h=600&fit=crop');
        break;
      case 'doctor':"""
code = code.replace(h_old, h_new)

# Find where formData is defined to figure out state
with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/AuthPage.tsx', 'w') as f:
    f.write(code)
print("done frontend types patch")
