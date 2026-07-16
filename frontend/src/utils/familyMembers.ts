export type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  gender: string;
  dateOfBirth?: string;
  age?: string;
  mobile: string;
  email?: string;
  medicalNotes?: string;
};

export const getFamilyStorageKey = (user: any) =>
  `healthy-touch-family-members-${user?._id || user?.email || 'guest'}`;

export const getSelfMember = (user: any): FamilyMember => ({
  id: 'self',
  name: user?.name || 'Patient',
  relation: 'Self',
  gender: '',
  dateOfBirth: '',
  age: '',
  mobile: user?.mobile || '',
  email: user?.email || '',
  medicalNotes: '',
});

export const readFamilyMembers = (user: any): FamilyMember[] => {
  const storageKey = getFamilyStorageKey(user);
  const savedMembers = localStorage.getItem(storageKey);
  if (savedMembers) {
    try {
      const parsed = JSON.parse(savedMembers);
      return Array.isArray(parsed) ? parsed : [getSelfMember(user)];
    } catch {
      return [getSelfMember(user)];
    }
  }
  return [getSelfMember(user)];
};

export const writeFamilyMembers = (user: any, members: FamilyMember[]) => {
  localStorage.setItem(getFamilyStorageKey(user), JSON.stringify(members));
};

