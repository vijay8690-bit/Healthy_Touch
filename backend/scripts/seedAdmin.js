import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const seedAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (adminExists) {
            console.log('⚠ Admin user already exists!');
            console.log('Email:', adminExists.email);
            console.log('To reset password, delete the admin user and run this script again.');
            process.exit(0);
        }

        // Create default admin user
        const adminData = {
            name: process.env.ADMIN_NAME || 'Admin',
            email: (process.env.ADMIN_EMAIL || 'admin@healthytouch.com').trim().toLowerCase(),
            mobile: process.env.ADMIN_MOBILE || '9887894498',
            password: process.env.ADMIN_PASSWORD || 'Admin@123',
            role: 'admin',
            isVerified: true,
        };

        // Create admin user (password will be hashed by pre-save hook)
        const admin = await User.create(adminData);

        console.log('✓ Admin user created successfully!');
        console.log('=====================================');
        console.log('Admin Credentials:');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);
        console.log('=====================================');
        console.log('⚠ IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('✗ Error seeding admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
