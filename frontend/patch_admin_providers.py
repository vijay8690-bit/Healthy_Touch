import re
with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/admin/AdminProviders.tsx', 'r') as f:
    code = f.read()

r_old = """const providerCategories = [
  "Doctor",
  "Nurse",
  "Physiotherapist",
  "Lab"
];"""

r_new = """const providerCategories = [
  "Doctor",
  "Nurse",
  "Physiotherapist",
  "Lab",
  "Ambulance"
];"""

if r_old in code:
    code = code.replace(r_old, r_new)
    print("Patch applied.")
else:
    print("Could not find the target codeblock. It might be formatted differently.")

with open('/Users/pradhyumanpareek/Downloads/healthy-touch-portal-main/frontend/src/pages/admin/AdminProviders.tsx', 'w') as f:
    f.write(code)
