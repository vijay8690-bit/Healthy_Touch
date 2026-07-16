# Healthy Touch Portal - User Features Documentation

## 📋 Table of Contents
- [Patient Features](#patient-features)
- [Provider Features](#provider-features)
- [Admin Features](#admin-features)

---

## 👤 Patient Features

### Registration & Authentication
- **User Registration**
  - Register with email and mobile number
  - Email OTP verification system
  - Location-based registration (mandatory)
  - Secure password authentication
  - Role-based access control

- **Login & Security**
  - Login with email or mobile number
  - Location verification at login
  - Session management with JWT tokens
  - Secure password hashing

### Provider Discovery & Booking
- **Find Providers**
  - Browse all available healthcare providers
  - Search providers by name, category, or specialization
  - Filter by provider type (Doctor, Nurse, Physiotherapist, Lab Technician)
  - View provider ratings and reviews
  - See provider location and distance
  - Real-time availability status

- **Provider Details**
  - View detailed provider profile
  - Check qualifications and experience
  - See professional certificates and documents
  - View verified Aadhaar card documents
  - Read provider bio and specialization
  - Check consultation fees
  - See average ratings and total reviews

- **Appointment Booking**
  - Select preferred date and time slot
  - Provide appointment reason/notes
  - Upload medical documents (optional)
  - Integrated payment gateway (Razorpay)
  - Instant booking confirmation
  - Email notifications for booking

### Appointment Management
- **View Appointments**
  - See all appointments (pending, confirmed, completed)
  - Filter appointments by status
  - Search appointments by provider name
  - View appointment details and history
  - Download appointment receipts

- **Appointment Actions**
  - Cancel appointments (if allowed)
  - Reschedule appointments
  - View provider contact information
  - Access provider documents from appointment

### Reviews & Ratings
- **Rate Providers**
  - Rate completed appointments (1-5 stars)
  - Write detailed review comments
  - Edit existing reviews
  - View all your submitted reviews

### Medical Records
- **Record Management**
  - Upload medical records and reports
  - Categorize records (Lab Report, Prescription, X-Ray, etc.)
  - Add notes and descriptions
  - View all uploaded records
  - Download records anytime
  - Share records with providers during appointments

### Profile & Settings
- **Profile Management**
  - Update personal information
  - Change profile picture
  - Update contact details
  - Manage emergency contacts
  - View account statistics

- **Location Services**
  - Update home location
  - View location on map
  - GPS-based location capture
  - Address auto-fill from coordinates

- **Notifications**
  - Real-time notification center
  - Appointment reminders
  - Booking confirmations
  - Review requests
  - System announcements
  - Mark notifications as read

### Payment & Transactions
- **Payment Integration**
  - Secure Razorpay payment gateway
  - Multiple payment methods (UPI, Card, Netbanking, Wallet)
  - Instant payment confirmation
  - Payment history
  - Download payment receipts

### Support & Help
- **Customer Support**
  - 24/7 WhatsApp support (9887894498)
  - Call support button
  - Contact form submission
  - Email support
  - FAQ access

---

## 🏥 Provider Features

### Registration & Onboarding
- **Provider Registration**
  - Register with complete profile information
  - Select provider category (Doctor, Nurse, Physiotherapist, Lab Technician)
  - Specify specialization
  - Upload multiple Aadhaar card files (image/PDF)
  - Upload professional documents (certificates, licenses - image/PDF)
  - Location-based registration
  - Email OTP verification

- **Document Upload**
  - Support for image formats (JPG, PNG, WEBP)
  - Support for PDF documents
  - Multiple file uploads (up to 5 Aadhaar, 10 professional docs)
  - Size limits: Images ≤ 3MB, PDFs ≤ 5MB
  - Secure cloud storage (Cloudinary)

### Approval Process
- **Pending Approval**
  - View pending approval status
  - Track application progress
  - Receive email notifications on status change
  - View rejection reasons (if rejected)
  - Resubmit documents if needed

### Profile Management
- **Profile Customization**
  - Update profile picture
  - Edit bio and description
  - Update qualification details
  - Set years of experience
  - Update specialization
  - Change consultation fees

- **Availability Management**
  - Toggle availability status (online/offline)
  - Set weekly availability schedule
  - Define time slots for each day
  - Show/hide profile from patients
  - Emergency unavailability toggle

### Appointment Management
- **View Appointments**
  - See all booked appointments
  - Filter by status (pending, confirmed, completed, cancelled)
  - Search appointments by patient name
  - View chronological appointment history
  - Access patient contact information

- **Appointment Details**
  - View patient medical records
  - See appointment reason and notes
  - Access uploaded patient documents
  - View payment status
  - Add appointment notes

### Document & Credential Display
- **Professional Documents**
  - View all uploaded certificates
  - Download documents
  - Display credentials to patients
  - PDF and image preview support
  - Verified badge display

- **Identity Verification**
  - Display Aadhaar documents (secured)
  - Admin-verified badge
  - Professional license display
  - Trust indicators for patients

### Earnings & Payouts
- **Financial Dashboard**
  - View total earnings
  - Track pending payouts
  - See completed payouts
  - Payment history
  - Graphical earnings reports

- **Bank Account Management**
  - Add/update bank details
  - IFSC code validation
  - Account number verification
  - UPI ID setup
  - Payment preferences

- **Payout Requests**
  - Request payout withdrawals
  - Track payout status
  - View payout history
  - Receive payout confirmations
  - Download payout receipts

### Reviews & Ratings
- **Performance Metrics**
  - View average rating
  - See total review count
  - Read patient reviews
  - Track rating trends
  - Respond to reviews (if enabled)

### Notifications
- **Real-time Alerts**
  - New appointment bookings
  - Appointment cancellations
  - Payment confirmations
  - Payout updates
  - Profile approval status
  - Review notifications
  - System announcements

### Profile Analytics
- **Performance Tracking**
  - Total appointments completed
  - Average rating score
  - Total reviews received
  - Earnings summary
  - Patient retention rate

---

## 👨‍💼 Admin Features

### Dashboard & Overview
- **Admin Dashboard**
  - System-wide statistics
  - User growth metrics
  - Revenue analytics
  - Appointment trends
  - Provider approval queue
  - Recent activities

### User Management
- **Patient Management**
  - View all registered patients
  - Search patients by name, email, mobile
  - View patient details and profiles
  - See patient appointment history
  - Access patient medical records
  - Manage patient accounts
  - Export patient data

- **Provider Management**
  - View all providers (pending, approved, rejected)
  - Filter by category and status
  - Search providers by name, specialization
  - View detailed provider profiles
  - Access provider documents
  - Review ratings and reviews

### Provider Approval System
- **Document Verification**
  - Review uploaded Aadhaar documents (PDF/Image)
  - Verify professional certificates
  - Check qualification credentials
  - Validate medical licenses
  - Preview documents inline
  - Download documents for detailed review

- **Approval Actions**
  - Approve provider applications
  - Reject with detailed reasons
  - Request additional documentation
  - Send email notifications
  - Track approval history
  - Bulk approval operations

### Appointment Oversight
- **Appointment Management**
  - View all appointments across platform
  - Filter by status, date, provider, patient
  - Search appointments
  - View appointment details
  - Monitor appointment trends
  - Generate appointment reports
  - Cancel/reschedule if needed

### Financial Management
- **Payment Oversight**
  - View all payment transactions
  - Track payment success/failure rates
  - Monitor revenue streams
  - Generate financial reports
  - Export payment data
  - Refund management

- **Provider Payouts**
  - Review payout requests
  - Verify payout amounts
  - Process manual payouts
  - Razorpay payout integration
  - Bank transfer management
  - Payout history tracking
  - Generate payout reports

- **Refund Management**
  - Process refund requests
  - Review refund reasons
  - Approve/reject refunds
  - Track refund status
  - Refund history logs
  - Financial reconciliation

### Caretaker Management
- **Caretaker Operations**
  - Add new caretakers
  - Edit caretaker details
  - View caretaker profiles
  - Assign caretakers to appointments
  - Track caretaker availability
  - Manage caretaker credentials

### Communication Management
- **Contact Queries**
  - View all contact form submissions
  - Filter by status (pending, resolved)
  - Respond to queries
  - Mark queries as resolved
  - Export query data
  - Track response times

- **Notifications System**
  - Send system-wide notifications
  - Create targeted notifications (by role)
  - Schedule notifications
  - View notification history
  - Track notification delivery
  - Manage notification templates

### System Settings
- **Platform Configuration**
  - Update site name and branding
  - Configure contact information
  - Set support email and phone
  - Manage social media links
  - Email verification toggle
  - Payment gateway settings
  - Upload site logo

- **Feature Toggles**
  - Enable/disable email verification
  - Configure appointment settings
  - Set commission rates
  - Manage service categories
  - Update terms and policies

### Location & Analytics
- **Location Dashboard**
  - View user locations on map
  - Track provider distribution
  - Analyze service coverage areas
  - Monitor location-based bookings
  - Geographic heatmaps
  - Distance analytics

### Review Management
- **Review Oversight**
  - View all reviews across platform
  - Filter by rating, provider, patient
  - Monitor review trends
  - Flag inappropriate reviews
  - Respond to reviews (on behalf of platform)
  - Generate review reports

### System Administration
- **Admin Account Management**
  - Create new admin users
  - Assign admin roles/permissions
  - Manage admin access levels
  - View admin activity logs
  - Update admin credentials

- **Database Operations**
  - Seed initial admin account
  - Backup database
  - Data export/import
  - System health monitoring

### Reports & Analytics
- **Data Insights**
  - User acquisition reports
  - Provider performance metrics
  - Revenue analytics
  - Appointment statistics
  - Geographic analysis
  - Trend forecasting
  - Custom report generation
  - Data export (CSV, Excel, PDF)

### Asset Management
- **File Management**
  - View all uploaded files
  - Secure asset delivery
  - Cloudinary integration
  - Storage monitoring
  - File type validation
  - Download permissions

---

## 🔐 Security Features (All Roles)

### Authentication & Authorization
- **JWT Token Authentication**
  - Secure token generation
  - Token expiration management
  - Role-based access control
  - Session management

### Data Protection
- **Password Security**
  - Bcrypt password hashing
  - Minimum password requirements
  - Password reset functionality
  - Secure password storage

### Document Security
- **Cloudinary Integration**
  - Secure file upload
  - Encrypted storage
  - Access-controlled URLs
  - Automatic format detection
  - Size limit enforcement

### Location Privacy
- **GPS Security**
  - Encrypted location data
  - Location verification
  - Privacy controls
  - Secure coordinate storage

---

## 📱 Support & Contact

### Customer Support Channels
- **Phone Support**: 9887894498
- **WhatsApp Support**: 9887894498 (24/7 available)
- **Email**: care@healthytouch.in (Response within 24 hours)
- **Emergency Support**: Available round the clock

### Technical Support
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge
- **Mobile Responsive**: Full mobile support
- **Payment Support**: Razorpay customer care
- **Document Upload**: Support for PDF and images

---

## 🚀 Platform Highlights

### Key Features
- ✅ Location-based provider matching
- ✅ Real-time appointment booking
- ✅ Secure payment gateway integration
- ✅ Document verification system
- ✅ Rating and review system
- ✅ Mobile-responsive design
- ✅ 24/7 customer support
- ✅ Multi-role dashboard
- ✅ Email notification system
- ✅ Cloud-based document storage

### Service Categories
- 🩺 **Doctors** - Home consultations
- 💉 **Nurses** - Home nursing care
- 🏃 **Physiotherapists** - Home physiotherapy
- 🔬 **Lab Technicians** - Home sample collection

---

**Version**: 1.0  
**Last Updated**: March 12, 2026  
**Support Contact**: 9887894498 (Call/WhatsApp)
