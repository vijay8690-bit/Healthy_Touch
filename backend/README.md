# 🏥 Healthy Touch Backend API Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Email Templates](#email-templates)
- [Middleware](#middleware)
- [Error Handling](#error-handling)

---

## 🎯 Overview

Healthy Touch is a comprehensive healthcare platform backend API that connects patients with healthcare providers. The system provides secure authentication, appointment booking, payment processing, medical records management, and review system.

### Key Highlights
- 🔐 Secure JWT-based authentication with OTP verification
- 👨‍⚕️ Provider profile management with specialization
- 📅 Complete appointment booking & scheduling system
- 💳 Payment processing with platform fee & payout tracking
- 📋 Medical records management with document storage
- ⭐ Review & rating system for providers
- 🔒 Role-based authorization (Patient/Provider)
- ✅ Complete validation and error handling
- 📧 Email notifications via Nodemailer

---

## ✨ Features

### 1. **Authentication System**
- User registration (Patient/Provider roles)
- Email verification with 6-digit OTP
- OTP expiry (10 minutes) & resend functionality
- Secure login with JWT tokens
- Password hashing with bcrypt
- Token-based logout

### 2. **Provider Management**
- Create & update provider profiles
- Specialization & category management
- Service fees configuration
- Availability schedule setting
- Document upload (certificates, licenses)
- Approval status tracking
- Public provider listing & search

### 3. **Appointment System**
- Book appointments with time slots
- View appointments (Patient & Provider specific)
- Provider can confirm/cancel appointments
- Patient can cancel appointments
- Available time slots checking
- Appointment status tracking (pending, confirmed, cancelled, completed)
- Reason & notes for appointments

### 4. **Payment Processing**
- Create payments for appointments
- Multiple payment methods (Cash, Card, UPI, Net Banking, Wallet)
- Automatic platform fee calculation (10%)
- Payment status tracking
- Provider earnings dashboard
- Payout management system
- Transaction ID tracking
- Payment history for patients & providers

### 5. **Medical Records**
- Provider adds records after completed appointments
- Diagnosis & prescription management
- Medical document storage
- Patient access to own records
- Provider access to patient records
- Update & delete capabilities
- Secure authorization checks

### 6. **Review & Rating System**
- Patients review completed appointments
- 5-star rating system
- Comment/feedback submission
- Average rating calculation
- One review per appointment policy
- Update & delete own reviews
- Public provider reviews display

### 7. **Email Notification System** 📧
- Automated email notifications for all major actions
- Professional HTML email templates
- Provider approval/rejection emails (sent from admin)
- Account suspension/reactivation notices
- Appointment confirmation emails to patients
- Unsuspension request emails to admin
- Beautiful, mobile-responsive email designs
- All admin actions send emails from admin@healthytouch.com

### 8. **Suspension Management System** 🚫
- Admin can suspend/unsuspend users and providers
- Suspended users cannot access protected routes
- Automatic appointment cancellation on provider suspension
- Users can request unsuspension via email
- Suspension reasons tracked and communicated
- Comprehensive suspension history
- Email notifications for all suspension actions

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM for MongoDB |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Nodemailer** | Email sending |
| **dotenv** | Environment variables |
| **CORS** | Cross-origin resource sharing |

---

## 📁 Project Structure

```
backend/
│
├── config/
│   └── DB.js                          # MongoDB connection configuration
│
├── controllers/
│   ├── AuthController.js              # Authentication (Register, Login, OTP, etc.)
│   ├── ProviderController.js          # Provider profile management
│   ├── AppointmentController.js       # Appointment booking & management
│   ├── ReviewController.js            # Review & rating system
│   ├── MedicalRecordController.js     # Medical records management
│   └── PaymentController.js           # Payment processing & payouts
│
├── middlewares/
│   └── Auth.js                        # JWT authentication & authorization
│
├── models/
│   ├── User.js                        # User schema (Patient/Provider)
│   ├── Provider.js                    # Provider profile schema
│   ├── Appointment.js                 # Appointment schema
│   ├── Review.js                      # Review & rating schema
│   ├── MedicalRecord.js               # Medical records schema
│   └── Payment.js                     # Payment & payout schema
│
├── routes/
│   ├── authRoutes.js                  # Authentication routes
│   ├── ProviderRoutes.js              # Provider routes
│   ├── appointmentRoutes.js           # Appointment routes
│   ├── reviewRoutes.js                # Review routes
│   ├── medicalRecordRoutes.js         # Medical records routes
│   └── paymentRoutes.js               # Payment routes
│
├── utils/
│   └── sendEmail.js                   # Email sending utility
│
├── .env                               # Environment variables
├── package.json                       # Dependencies
├── server.js                          # Entry point
├── API_DOCUMENTATION.md               # Complete API documentation
└── README.md                          # This file
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB
- Gmail account (for sending emails)

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_jwt_secret_key

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

### Step 4: Get Gmail App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable **2-Step Verification**
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Generate a new app password for "Mail"
5. Copy and paste it in `.env` as `EMAIL_PASSWORD`

### Step 5: Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will run on: `https://api.healthytouch24.com`

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port number | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `SECRET_KEY` | JWT secret key for token generation | `your_secret_key_here` |
| `EMAIL_USER` | Gmail address for sending emails | `youremail@gmail.com` |
| `EMAIL_PASSWORD` | Gmail app password (not regular password) | `abcd efgh ijkl mnop` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your_api_secret` |

---

## 🔄 Complete Platform Workflow

### 📋 Complete User Journey

```
┌──────────────────────────────────────────────────────────────────────┐
│                    HEALTHY TOUCH PLATFORM WORKFLOW                    │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: REGISTRATION & AUTHENTICATION                                │
└─────────────────────────────────────────────────────────────────────┘

Patient/Provider Registration
        │
        ├──► Email with OTP sent (6-digit, valid 10 min)
        │
        ├──► Verify OTP ──► Account Verified ✓
        │
        └──► Login ──► JWT Token Generated
                      │
                      ▼
              ┌──────────────────┐
              │ Choose User Path │
              └──────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
   PATIENT PATH              PROVIDER PATH


┌─────────────────────────────────────────────────────────────────────┐
│ PROVIDER PATH WORKFLOW                                               │
└─────────────────────────────────────────────────────────────────────┘

1. Create Provider Profile
   ├── Category (Doctor, Nurse, Physiotherapist, etc.)
   ├── Specialization
   ├── Service Fees
   ├── Experience Years
   ├── Complete Address
   ├── Bio/Description
   ├── Availability Schedule
   └── Upload Documents (certificates) → 📤 CLOUDINARY
   
2. Profile Status: Pending → Admin Approval → Approved/Rejected
   
3. Receive Appointment Requests
   ├── View pending appointments
   ├── Confirm or Cancel
   └── Mark as Completed
   
4. Add Medical Records (after completion)
   ├── Diagnosis
   ├── Prescription
   ├── Upload reports/documents → 📤 CLOUDINARY
   └── Save for patient
   
5. View Earnings Dashboard
   ├── Total earnings
   ├── Pending payouts
   ├── Completed payouts
   └── Payment history


┌─────────────────────────────────────────────────────────────────────┐
│ PATIENT PATH WORKFLOW                                                │
└─────────────────────────────────────────────────────────────────────┘

1. Browse Providers
   ├── Search by category
   ├── View provider details
   ├── Check reviews & ratings
   └── See availability
   
2. Book Appointment
   ├── Select date
   ├── Choose available time slot
   ├── Add reason & notes
   └── Submit booking (Status: Pending)
   
3. Make Payment
   ├── Select payment method (UPI/Card/Cash/etc.)
   ├── Enter transaction details
   ├── Platform fee: 10% deducted
   └── Payment Status: Completed
   
4. Appointment Confirmation
   └── Provider confirms → Status: Confirmed
   
5. Appointment Completion
   └── Provider marks complete → Status: Completed
   
6. View Medical Records
   ├── Diagnosis from provider
   ├── Prescription details
   └── Download documents
   
7. Leave Review (for completed appointments)
   ├── Rate provider (1-5 stars)
   ├── Write comment
   └── Submit review


┌─────────────────────────────────────────────────────────────────────┐
│ APPOINTMENT STATUS FLOW                                              │
└─────────────────────────────────────────────────────────────────────┘

       PENDING ──────► CONFIRMED ──────► COMPLETED
          │                │                  │
          │                │                  │
          └────► CANCELLED ◄────┘             │
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ Medical Record   │
                                    │ Added            │
                                    └──────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ Patient Reviews  │
                                    │ Provider         │
                                    └──────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│ PAYMENT & PAYOUT FLOW                                                │
└─────────────────────────────────────────────────────────────────────┘

Patient Payment (₹500)
        │
        ├──► Platform Fee: ₹50 (10%)
        │
        ├──► Provider Amount: ₹450 (90%)
        │
        ▼
Payment Status: PENDING → COMPLETED
        │
        ▼
Payout Status: PENDING → PROCESSING → COMPLETED
        │
        ▼
Provider Receives: ₹450
```

### 🔐 Authentication Flow Detail

```
Registration → OTP Email → Verify OTP → Login → JWT Token
     │              │            │          │         │
     │              │            │          │         ▼
     │              │            │          │    Access Protected
     │              │            │          │    API Endpoints
     │              │            │          │
     └──► Expires 10 min ────────┘          │
                 │                           │
                 ▼                           │
            Resend OTP ──────────────────────┘
```

---

## 📡 API Endpoints Summary

### Base URL
```
https://api.healthytouch24.com/api
```

### 📍 All Endpoints Overview

| Module | Method | Endpoint | Access | Description |
|--------|--------|----------|--------|-------------|
| **AUTH** | POST | `/auth/register` | Public | Register new user |
| | POST | `/auth/verify-otp` | Public | Verify OTP |
| | POST | `/auth/resend-otp` | Public | Resend OTP |
| | POST | `/auth/login` | Public | User login |
| | POST | `/auth/forgot-password` | Public | Password reset |
| | POST | `/auth/request-unsuspend` | Public | Request unsuspension |
| | POST | `/auth/logout` | Private | User logout |
| **PROVIDER** | POST | `/provider/profile` | Provider | Create profile |
| | GET | `/provider/profile` | Provider | Get own profile |
| | PUT | `/provider/profile` | Provider | Update profile |
| | DELETE | `/provider/profile` | Provider | Delete profile |
| | GET | `/provider/all` | Public | Get all providers |
| | GET | `/provider/category/:category` | Public | Get by category |
| | GET | `/provider/:id` | Public | Get single provider |
| **APPOINTMENT** | POST | `/appointments` | Patient | Book appointment |
| | GET | `/appointments/my-appointments` | Private | Get my appointments |
| | GET | `/appointments/:id` | Private | Get single appointment |
| | PUT | `/appointments/:id/status` | Provider | Update status |
| | PUT | `/appointments/:id/cancel` | Patient | Cancel appointment |
| | GET | `/appointments/slots/:providerId/:date` | Public | Get available slots |
| **REVIEW** | POST | `/reviews` | Patient | Add review |
| | GET | `/reviews/provider/:providerId` | Public | Get provider reviews |
| | GET | `/reviews/my-reviews` | Patient | Get my reviews |
| | PUT | `/reviews/:id` | Patient | Update review |
| | DELETE | `/reviews/:id` | Patient | Delete review |
| **MEDICAL RECORDS** | POST | `/medical-records` | Provider | Create record |
| | GET | `/medical-records/my-records` | Patient | Get my records |
| | GET | `/medical-records/patient/:patientId` | Private | Get patient records |
| | GET | `/medical-records/:id` | Private | Get single record |
| | PUT | `/medical-records/:id` | Provider | Update record |
| | DELETE | `/medical-records/:id` | Provider | Delete record |
| **PAYMENT** | POST | `/payments` | Patient | Create payment |
| | PUT | `/payments/:id/status` | Admin | Update payment status |
| | PUT | `/payments/:id/payout` | Admin | Update payout status |
| | GET | `/payments/appointment/:appointmentId` | Private | Get payment by appointment |
| | GET | `/payments/my-payments` | Patient | Get my payments |
| | GET | `/payments/earnings` | Provider | Get earnings |
| | GET | `/payments/all` | Admin | Get all payments |
| **ADMIN** | GET | `/admin/dashboard` | Admin | Dashboard stats |
| | GET | `/admin/users` | Admin | Get all users |
| | GET | `/admin/users/:id` | Admin | Get user details |
| | PUT | `/admin/users/:id/suspend` | Admin | Suspend user account |
| | PUT | `/admin/users/:id/unsuspend` | Admin | Unsuspend user account |
| | DELETE | `/admin/users/:id` | Admin | Delete user |
| | PUT | `/admin/users/:id/verification` | Admin | Toggle verification |
| | GET | `/admin/appointments` | Admin | Get all appointments |
| | GET | `/admin/revenue` | Admin | Revenue report |
| **PROVIDER ADMIN** | GET | `/provider/admin/pending` | Admin | Pending providers |
| | PUT | `/provider/admin/:id/status` | Admin | Approve/Reject provider |
| | PUT | `/provider/admin/:id/suspend` | Admin | Suspend provider account |
| | PUT | `/provider/admin/:id/unsuspend` | Admin | Unsuspend provider account |
| | GET | `/provider/admin/all` | Admin | All providers (admin view) |
| | DELETE | `/provider/admin/:id` | Admin | Delete provider |
| | GET | `/provider/admin/stats` | Admin | Provider statistics |
| **UPLOAD** | POST | `/upload/single` | Private | Upload single file |
| | POST | `/upload/multiple` | Private | Upload multiple files |
| | DELETE | `/upload` | Private | Delete file from cloud |

**Total Endpoints: 56** (includes suspension management)

---

## 📡 Detailed API Documentation

For complete API documentation with request/response examples, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Quick Examples

#### 1. Register User

---

### 1. 📝 User Registration

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user and send OTP verification email.

**Request Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "johndoe@example.com",
  "mobile": "9887894498",
  "password": "SecurePass123",
  "role": "patient"
}
```

**Field Validations:**
- `name`: Required, String
- `email`: Required, String, Unique, Valid email format
- `mobile`: Required, String, Unique
- `password`: Required, String, Minimum 8 characters
- `role`: Required, Enum: `"patient"` or `"provider"`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for OTP verification.",
  "userId": "6756f8a9b1234567890abcde",
  "email": "johndoe@example.com"
}
```

**Error Responses:**

**400 - Missing Fields:**
```json
{
  "success": false,
  "message": "Please provide all required fields"
}
```

**400 - User Already Exists:**
```json
{
  "success": false,
  "message": "User already exists with this email or mobile"
}
```

**500 - Email Sending Failed:**
```json
{
  "success": false,
  "message": "Failed to send verification email. Please try again.",
  "error": "Error details"
}
```

---

### 2. ✅ Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Description:** Verify user account using OTP received via email.

**Request Body:**
```json
{
  "userId": "6756f8a9b1234567890abcde",
  "otp": "123456"
}
```

**Field Validations:**
- `userId`: Required, Valid MongoDB ObjectId
- `otp`: Required, 6-digit String

**Success Response (200):**
```json
{
  "success": true,
  "message": "Account verified successfully! You can now login.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6756f8a9b1234567890abcde",
    "name": "John Doe",
    "email": "johndoe@example.com",
    "mobile": "9887894498",
    "role": "patient"
  }
}
```

**Error Responses:**

**400 - Missing Fields:**
```json
{
  "success": false,
  "message": "Please provide userId and OTP"
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**400 - Already Verified:**
```json
{
  "success": false,
  "message": "User is already verified. Please login."
}
```

**400 - Invalid OTP:**
```json
{
  "success": false,
  "message": "Invalid OTP. Please check and try again."
}
```

**400 - Expired OTP:**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP."
}
```

---

### 3. 🔄 Resend OTP

**Endpoint:** `POST /api/auth/resend-otp`

**Description:** Request a new OTP if the previous one expired or wasn't received.

**Request Body:**
```json
{
  "userId": "6756f8a9b1234567890abcde"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "New OTP has been sent to your email successfully!",
  "email": "johndoe@example.com"
}
```

**Error Responses:**

**400 - Missing userId:**
```json
{
  "success": false,
  "message": "Please provide userId"
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**400 - Already Verified:**
```json
{
  "success": false,
  "message": "User is already verified. Please login."
}
```

**500 - Email Failed:**
```json
{
  "success": false,
  "message": "Failed to send OTP email. Please try again.",
  "error": "Error details"
}
```

---

### 4. 🔓 User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Login with verified account credentials.

**Request Body:**
```json
{
  "email": "johndoe@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6756f8a9b1234567890abcde",
    "name": "John Doe",
    "email": "johndoe@example.com",
    "mobile": "9887894498",
    "role": "patient"
  }
}
```

**Error Responses:**

**400 - Missing Credentials:**
```json
{
  "success": false,
  "message": "Please provide email and password"
}
```

**404 - User Not Found:**
```json
{
  "success": false,
  "message": "User not found. Please register first."
}
```

**403 - Not Verified:**
```json
{
  "success": false,
  "message": "Please verify your account first. Check your email for OTP.",
  "userId": "6756f8a9b1234567890abcde"
}
```

**401 - Invalid Password:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 5. 🚪 User Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout user (Protected route - requires authentication).

**Request Headers:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

**Error Responses:**

**401 - No Token:**
```json
{
  "success": false,
  "message": "No token provided"
}
```

**401 - Invalid Token:**
```json
{
  "message": "Not authorized, token failed"
}
```

---

## 🗄 Database Schema

### 1. User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  mobile: String (required, unique),
  password: String (required, hashed),
  role: Enum ['patient', 'provider'] (required),
  isVerified: Boolean (default: false),
  otp: {
    code: String,
    expiresAt: Date
  },
  timestamps: true
}
```

### 2. Provider Model
```javascript
{
  userId: ObjectId (ref: User),
  category: String (required),
  specialization: String (required),
  fees: Number (required),
  availability: [
    {
      day: String,
      startTime: String,
      endTime: String
    }
  ],
  status: Enum ['pending', 'approved', 'rejected'] (default: pending),
  documents: [String],
  timestamps: true
}
```

### 3. Appointment Model
```javascript
{
  patientId: ObjectId (ref: User),
  providerId: ObjectId (ref: Provider),
  date: Date (required),
  timeSlot: String (required),
  status: Enum ['pending', 'confirmed', 'cancelled', 'completed'] (default: pending),
  reason: String (required),
  notes: String,
  cancelledBy: Enum ['patient', 'provider', 'admin'],
  cancellationReason: String,
  timestamps: true
}
```

### 4. Review Model
```javascript
{
  patientId: ObjectId (ref: User),
  providerId: ObjectId (ref: Provider),
  appointmentId: ObjectId (ref: Appointment, unique),
  rating: Number (1-5, required),
  comment: String (required),
  isVerified: Boolean (default: true),
  timestamps: true
}
```

### 5. MedicalRecord Model
```javascript
{
  patientId: ObjectId (ref: User),
  providerId: ObjectId (ref: Provider),
  appointmentId: ObjectId (ref: Appointment),
  remarks: String (required),
  diagnosis: String,
  prescription: String,
  documents: [String],
  timestamps: true
}
```

### 6. Payment Model
```javascript
{
  appointmentId: ObjectId (ref: Appointment, unique),
  patientId: ObjectId (ref: User),
  providerId: ObjectId (ref: Provider),
  amount: Number (required),
  status: Enum ['pending', 'completed', 'failed', 'refunded'] (default: pending),
  paymentMethod: Enum ['cash', 'card', 'upi', 'net_banking', 'wallet'],
  transactionId: String,
  payoutStatus: Enum ['pending', 'processing', 'completed', 'failed'] (default: pending),
  payoutDate: Date,
  platformFee: Number (default: 0),
  providerAmount: Number (auto-calculated),
  timestamps: true
}
```

**Key Features:**
- Auto-calculated provider amount (amount - platformFee)
- Indexes on frequently queried fields
- Referential integrity with ObjectId references
- Timestamp tracking on all models

---

## 📧 Email Templates

### OTP Verification Email

The system sends a beautifully designed HTML email with:

**Design Features:**
- 🎨 Gradient header with Healthy Touch branding
- 📦 Clean, centered OTP display box
- ⏰ Clear expiry time (10 minutes)
- ⚠️ Security warnings and best practices
- 📱 Mobile-responsive design
- 🎯 Professional footer with contact info

**Email Preview:**

```
┌──────────────────────────────────────┐
│      🏥 Healthy Touch                │
│   (Purple Gradient Header)           │
├──────────────────────────────────────┤
│                                      │
│  Welcome to Healthy Touch!           │
│                                      │
│  Thank you for registering with us.  │
│  Please verify your account using    │
│  the OTP below:                      │
│                                      │
│  ╔════════════════════╗             │
│  ║    1 2 3 4 5 6     ║             │
│  ╚════════════════════╝             │
│                                      │
│  Valid for 10 minutes                │
│                                      │
│  ⚠️ Security Notice:                 │
│  • Never share this OTP              │
│  • We never ask for OTP via phone    │
│  • Ignore if you didn't request      │
│                                      │
├──────────────────────────────────────┤
│  Healthy Touch - Your Healthcare     │
│  Partner                             │
│  support@healthytouch.com            │
│  © 2025 All rights reserved          │
└──────────────────────────────────────┘
```

---

## 🛡 Middleware

### 1. Authentication Middleware (`auth`)

**File:** `middlewares/Auth.js`

**Purpose:** Verify JWT token and authenticate user

**Usage:**
```javascript
import { auth } from '../middlewares/Auth.js';

router.post('/logout', auth, Logout);
```

**How it works:**
1. Extracts token from `Authorization: Bearer <token>` header
2. Verifies token using `JWT_SECRET`
3. Fetches user from database (excludes password)
4. Attaches user to `req.user`
5. Calls `next()` to proceed

**Error Responses:**
- `401`: "Not authorized, no token"
- `401`: "Not authorized, token failed"

---

### 2. AuthorizatiComplete Platform

### Complete Test Workflow

#### **STEP 1: Register as Provider**
```http
POST https://api.healthytouch24.com/api/auth/register
Content-Type: application/json

{
  "name": "Dr. John Doe",
  "email": "doctor@example.com",
  "mobile": "9887894498",
  "password": "password123",
  "role": "provider"
}
```

#### **STEP 2: Verify OTP & Login**
```http
POST https://api.healthytouch24.com/api/auth/verify-otp
{
  "userId": "user_id_here",
  "otp": "123456"
}
```

#### **STEP 3: Create Provider Profile**
```http
POST https://api.healthytouch24.com/api/provider/profile
Authorization: Bearer <provider_token>
Content-Type: application/json

{
  "category": "Doctor",
  "specialization": "Cardiologist",
  "fees": 500,
  "availability": [
    {
      "day": "Monday",
      "startTime": "09:00 AM",
      "endTime": "05:00 PM"
    }
  ]
}
```

#### **STEP 4: Register as Patient**
```http
POST https://api.healthytouch24.com/api/auth/register
{
  "name": "Jane Patient",
  "email": "patient@example.com",
  "mobile": "9887894498",
  "password": "password123",
  "role": "patient"
}
```

#### **STEP 5: Book Appointment (as Patient)**
```http
POST https://api.healthytouch24.com/api/appointments
Authorization: Bearer <patient_token>

{
  "providerId": "provider_id_here",
  "date": "2025-12-20",
  "timeSlot": "10:00 AM",
  "reason": "Regular checkup"
}
```

#### **STEP 6: Confirm Appointment (as Provider)**
```http
PUT https://api.healthytouch24.com/api/appointments/{appointment_id}/status
Authorization: Bearer <provider_token>

{
  "status": "confirmed"
}
### Authentication
- [ ] Forgot Password with OTP
- [ ] Email change with verification
- [ ] Phone number verification via SMS
- [ ] Social login (Google, Facebook)
- [ ] Two-factor authentication (2FA)
- [ ] Refresh token mechanism

### Platform Features
- [ ] Admin dashboard for platform management
- [ ] Provider verification workflow
- [ ] Real-time chat between patient & provider
- [ ] Video consultation integration
- [ ] Important Notes

### Authentication
1. **OTP Expiry:** OTPs expire after 10 minutes
2. **Token Expiry:** JWT tokens expire after 30 days
3. **Password Security:** Minimum 8 characters, hashed with bcrypt (10 salt rounds)

### Appointments
4. **Time Slots:** Pre-defined slots from 9 AM to 6 PM (30-minute intervals)
5. **Booking Prevention:** Duplicate slot booking is prevented
6. **Cancellation:** Both patients and providers can cancel appointments

### Payments
7. **Platform Fee:** 10% automatically deducted from provider fees
8. **Payment Methods:** Cash, Card, UPI, Net Banking, Wallet
9. **Payout:** Provider receives 90% of the payment amount

### Medical Records
10. **Access Control:** Only completed appointments can have medical records
11. **Document Storage:** URLs stored (integrate with Cloudinary for actual uploads)

### Reviews
12. � Project Statistics

- **Total Models:** 6 (User, Provider, Appointment, Review, MedicalRecord, Payment)
- **Total Controllers:** 6
- **Total Routes:** 6 route files
- **Total API Endpoints:** 37
- **Authentication:** JWT-based
- **Database:** MongoDB with Mongoose ODM
- **Email Service:** Nodemailer with Gmail

## 👨‍💻 Developer Information

**Project:** Healthy Touch - Complete Healthcare Platform API  
**Version:** 2.0.0  
**Node Version:** 14+  
**Database:** MongoDB 4.4+  
**License:** ISC  

### Tech Stack
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Bcrypt Password Hashing
- Nodemailer Email Service
- CORS Supportnfigure allowed origins in `server.js`
    ```javascript
    app.use(cors({ origin: 'https://yourdomain.com' }));
    ```

16. **Environment Variables:** Never commit `.env` file to version control

17. **Database Indexes:** Automatically created for frequently queried fields

18. **Email Service:** Currently Gmail configured. Change in `utils/sendEmail.js` for other providersPopular providers ranking

### Security
- [ ] Rate limiting on API endpoints
- [ ] Account lockout after failed attempts
- [ ] IP-based access control
- [ ] Data encryption at rest
- [ ] HIPAA compliance features
- [ ] Audit logging
  "paymentMethod": "upi",
  "transactionId": "TXN123456"
}
```

#### **STEP 8: Complete Appointment (as Provider)**
```http
PUT https://api.healthytouch24.com/api/appointments/{appointment_id}/status
Authorization: Bearer <provider_token>

{
  "status": "completed"
}
```

#### **STEP 9: Add Medical Record (as Provider)**
```http
POST https://api.healthytouch24.com/api/medical-records
Authorization: Bearer <provider_token>

{
  "patientId": "patient_id_here",
  "appointmentId": "appointment_id_here",
  "remarks": "Patient is healthy",
  "diagnosis": "No issues found",
  "prescription": "Multivitamins daily"
}
```

#### **STEP 10: Leave Review (as Patient)**
```http
POST https://api.healthytouch24.com/api/reviews
Authorization: Bearer <patient_token>

{
  "providerId": "provider_id_here",
  "appointmentId": "appointment_id_here",
  "rating": 5,
  "comment": "Excellent service!"
}ge",
  "error": "Technical error details (optional)"
}
```

---

## 🧪 Testing the API

### Using Postman/Thunder Client

#### 1. **Register a New User**
```
POST https://api.healthytouch24.com/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "mobile": "9887894498",
  "password": "password123",
  "role": "patient"
}
```

#### 2. **Check Email for OTP**
Check the inbox of `test@example.com` for 6-digit OTP

#### 3. **Verify OTP**
```
POST https://api.healthytouch24.com/api/auth/verify-otp
Content-Type: application/json

{
  "userId": "<userId_from_registration>",
  "otp": "123456"
}
```

#### 4. **Login**
```
POST https://api.healthytouch24.com/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

#### 5. **Access Protected Route**
```
POST https://api.healthytouch24.com/api/auth/logout
Authorization: Bearer <token_from_login>
```

---

## � Email Notifications System

The platform now includes a comprehensive automated email notification system for all major actions.

### Email Features

✅ **Professional HTML Templates**
- Beautiful, mobile-responsive email designs
- Consistent branding across all notifications
- Clear call-to-action buttons
- Professional layout and styling

✅ **Automated Notifications**
- Provider approval confirmation emails
- Provider rejection notices with reasons
- Account suspension notifications
- Account reactivation emails
- Appointment confirmation to patients
- Unsuspension request alerts to admin

### Email Configuration

Set up the following environment variables:

```env
EMAIL_USER=admin@healthytouch.com
EMAIL_PASSWORD=your_gmail_app_password
FRONTEND_URL=https://healthytouch24.com
```

### Email Triggers

| Action | Recipient | Template Used |
|--------|-----------|---------------|
| Provider Approved | Provider | Provider Approval |
| Provider Rejected | Provider | Provider Rejection |
| User Suspended | User | Suspension Notice |
| Provider Suspended | Provider | Suspension Notice |
| Account Reactivated | User/Provider | Account Reactivation |
| Appointment Confirmed | Patient | Appointment Confirmation |
| Unsuspension Requested | Admin | Unsuspension Request |

**All admin-triggered emails are sent from admin@healthytouch.com**

For complete email documentation, see: [EMAIL_NOTIFICATIONS_GUIDE.md](./EMAIL_NOTIFICATIONS_GUIDE.md)

---

## 🚫 Suspension Management System

Admins can now suspend and unsuspend user and provider accounts with full email notifications.

### Suspension Features

✅ **User Suspension**
- Admin provides suspension reason
- User account immediately locked
- Suspension email sent to user
- User sees suspension message on login
- User can request unsuspension

✅ **Provider Suspension**
- All pending appointments automatically cancelled
- Provider cannot receive new bookings
- Patients notified of cancellations
- Suspension email sent to provider

✅ **Unsuspension Process**
- User requests unsuspension via public route
- Email sent to admin with request details
- Admin reviews and can approve
- Reactivation email sent to user

### Suspension API Endpoints

#### Suspend User
```http
PUT /api/admin/users/:userId/suspend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Violation of platform policies"
}
```

#### Unsuspend User
```http
PUT /api/admin/users/:userId/unsuspend
Authorization: Bearer <admin_token>
```

#### Request Unsuspension (Public)
```http
POST /api/auth/request-unsuspend
Content-Type: application/json

{
  "email": "user@example.com",
  "reason": "I understand the violation and will comply"
}
```

### Suspension Data Model

```javascript
// User Model includes:
{
  isSuspended: Boolean,
  suspension: {
    reason: String,
    suspendedAt: Date,
    suspendedBy: ObjectId (Admin User)
  }
}
```

### Access Control

Suspended users:
- ❌ Cannot login
- ❌ Cannot access protected routes
- ❌ Cannot book/receive appointments
- ✅ Can request unsuspension
- ✅ Can view suspension reason

---

## �🔒 Security Features

1. **Password Hashing**
   - Passwords hashed with bcrypt (10 salt rounds)
   - Never stored in plain text

2. **JWT Tokens**
   - Expire after 30 days
   - Signed with secret key
   - Contains user ID and role

3. **OTP Security**
   - 6-digit random OTP
   - Expires in 10 minutes
   - Deleted after verification

4. **Input Validation**
   - All fields validated before processing
   - Unique email/mobile checks
   - Password minimum length: 8 characters

5. **Error Messages**
   - Generic messages to prevent information leakage
   - Detailed logs for debugging (server-side only)

---

## � Document Upload Workflow (Cloudinary)

### Provider Document Upload Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CLOUDINARY DOCUMENT UPLOAD WORKFLOW                 │
└─────────────────────────────────────────────────────────────────────┘

FRONTEND (React/Next.js)
    │
    ├─► User selects file(s) from device
    │   (Certificates, Licenses, Reports, etc.)
    │
    ├─► FormData created with file(s)
    │   const formData = new FormData();
    │   formData.append('file', selectedFile);
    │   formData.append('folder', 'provider-documents');
    │
    └─► POST to /api/upload/single or /api/upload/multiple
        │
        │ Headers: { Authorization: Bearer <token> }
        │
        ▼

BACKEND (Express + Multer)
    │
    ├─► Auth middleware verifies JWT token
    │
    ├─► Multer middleware intercepts file(s)
    │   ├─► File validation (type, size)
    │   │   Allowed: JPEG, PNG, WEBP, PDF, DOC, DOCX
    │   │   Max size: 5MB per file
    │   │   Max files: 10 at once
    │   │
    │   └─► Store in memory as Buffer (not disk)
    │
    ├─► UploadController receives file buffer
    │   ├─► Convert buffer to Base64 string
    │   │   data:image/jpeg;base64,/9j/4AAQ...
    │   │
    │   └─► Call uploadToCloudinary utility
    │       │
    │       ▼

CLOUDINARY SERVICE
    │
    ├─► Upload file to Cloudinary cloud
    │   ├─► Folder: healthy-touch/provider-documents
    │   │            healthy-touch/medical-records
    │   │
    │   ├─► Auto-optimization for images
    │   │   - Resize: max 1000x1000px
    │   │   - Quality: auto (smart compression)
    │   │
    │   └─► Generate secure URL
    │       https://res.cloudinary.com/your-cloud/image/upload/v123/...
    │
    └─► Return response
        {
          secure_url: "https://...",
          public_id: "healthy-touch/provider-documents/abc123"
        }
        │
        ▼

BACKEND RESPONSE
    │
    └─► Return URL to frontend
        {
          success: true,
          url: "https://res.cloudinary.com/...",
          publicId: "..."
        }
        │
        ▼

FRONTEND
    │
    ├─► Save URL in state
    │   const [documentUrls, setDocumentUrls] = useState([url]);
    │
    └─► Submit to provider profile creation
        POST /api/provider/profile
        {
          category: "Doctor",
          specialization: "Cardiology",
          ...
          documents: [url1, url2, url3]  ← Cloudinary URLs
        }
        │
        ▼

DATABASE (MongoDB)
    │
    └─► Provider document saved with URLs
        {
          userId: "...",
          category: "Doctor",
          documents: [
            "https://res.cloudinary.com/.../certificate1.pdf",
            "https://res.cloudinary.com/.../license.jpg"
          ]
        }
```

### Medical Records Upload (Same Flow)

```
1. Provider completes appointment
2. Goes to add medical record
3. Uploads patient reports/prescriptions
4. Files → Cloudinary → URLs stored
5. Patient can view/download from secure URLs
```

### File Delete Workflow

```
1. Frontend sends DELETE /api/upload
2. Body: { publicId: "healthy-touch/documents/abc123" }
3. Backend calls Cloudinary delete API
4. File removed from cloud
5. Frontend removes URL from database
```

---

## 🚧 Future Enhancements

- [ ] Forgot Password with OTP
- [ ] Email change with verification
- [ ] Phone number verification via SMS
- [ ] Rate limiting on OTP requests
- [ ] Account lockout after failed attempts
- [ ] Refresh token mechanism
- [ ] Social login (Google, Facebook)
- [ ] Two-factor authentication (2FA)
- [ ] User profile management
- [ ] File compression before upload
- [ ] Video consultation integration
- [ ] In-app notifications (Socket.io)

---

## 📝 Notes

1. **OTP Expiry:** OTPs expire after 10 minutes. Users must request a new OTP using the resend endpoint.

2. **Email Service:** Currently configured for Gmail. To use other email services:
   - Change `service: 'gmail'` in `utils/sendEmail.js`
   - Update credentials in `.env`

3. **Token Expiry:** JWT tokens expire after 30 days. Adjust in `AuthController.js`:
   ```javascript
   jwt.sign({ id, role }, SECRET_KEY, { expiresIn: '30d' })
   ```

4. **Database:** MongoDB indexes are created automatically for unique fields (email, mobile).

5. **CORS:** Currently allows all origins. For production, specify allowed origins in `server.js`:
   ```javascript
   app.use(cors({ origin: 'https://yourdomain.com' }));
   ```

---

## 👨‍💻 Developer Information

**Project:** Healthy Touch Backend API  
**Version:** 1.0.0  
**Node Version:** 14+  
**License:** ISC  

---

## 📞 Support

For issues or questions:
- 📧 Email: support@healthytouch.com
- 🐛 Issues: Create an issue in the repository

---

## 📄 License

This project is licensed under the ISC License.

---

**Built with ❤️ for Healthy Touch**
