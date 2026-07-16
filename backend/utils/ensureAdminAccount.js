import User from '../models/User.js';

export const ensureAdminAccount = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@healthytouch.com').trim().toLowerCase();
  const adminMobile = (process.env.ADMIN_MOBILE || '9887894498').trim();
  const adminName = (process.env.ADMIN_NAME || 'Admin').trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existingAdmin = await User.findOne({
    role: 'admin',
    $or: [{ email: adminEmail }, { mobile: adminMobile }],
  });

  if (existingAdmin) return existingAdmin;

  const admin = await User.create({
    name: adminName,
    email: adminEmail,
    mobile: adminMobile,
    password: adminPassword,
    role: 'admin',
    isVerified: true,
  });

  return admin;
};
