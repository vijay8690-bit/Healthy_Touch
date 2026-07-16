import re
with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/AuthPage.tsx', 'r') as f:
    code = f.read()

# Expand formData
f_data_old = """  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    otp: ['', '', '', '', '', ''],
  });"""
f_data_new = """  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    otp: ['', '', '', '', '', ''],
    // Ambulance Specific Fields
    ambulanceType: '',
    medicalEquipment: [] as string[],
    vehicleNumber: '',
    vehicleModel: '',
    vehicleYear: '',
    driverLicenseNumber: '',
    driverName: '',
    driverMobileNo: '',
    availabilityType: '',
    baseCharges: '',
    perKmCharge: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    policeVerificationStatus: '',
  });"""
code = code.replace(f_data_old, f_data_new)

# Add state for all files
file_state_old = """  const [aadhaarFiles, setAadhaarFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);"""

file_state_new = """  const [aadhaarFiles, setAadhaarFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [ambulanceFiles, setAmbulanceFiles] = useState<{
    rcDocument?: File;
    driverLicenseDocument?: File;
    ambulancePhoto?: File;
    panCardPhoto?: File;
    cancelledChequePhoto?: File;
    policeVerificationDocument?: File;
  }>({});"""

code = code.replace(file_state_old, file_state_new)

with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/AuthPage.tsx', 'w') as f:
    f.write(code)
print("done frontend state patch")
