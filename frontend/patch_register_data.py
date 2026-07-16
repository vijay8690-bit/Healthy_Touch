import re

with open('src/types/api.types.ts', 'r') as f:
    content = f.read()

replacement = """  // Lab Technician fields
  labServiceType?: string;
  labName?: string;
  availableTests?: string[];
  homeSampleCollection?: string;
  labExperience?: string;
  labServiceArea?: string;
  reportDeliveryTime?: string;
  certificationStatus?: string;
  contactPersonName?: string;
  labContactNumber?: string;
  labEmergencyContactNumber?: string;
  labRegistrationCertificate?: File;
  nablCertificate?: File[];

  rcDocument?: File;"""

content = content.replace("  rcDocument?: File;", replacement)

with open('src/types/api.types.ts', 'w') as f:
    f.write(content)
