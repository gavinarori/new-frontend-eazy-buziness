# Business Management System

A comprehensive multi-role business management application built with React, TypeScript, and Firebase.

## Features

- **Multi-Role Authentication**: Super Admin, Shop Admin, and Staff roles
- **Shop Management**: Create and manage multiple business locations
- **Product Management**: Add/edit products with images and inventory tracking
- **Invoice System**: Generate invoices with payment tracking
- **Supply Management**: Track inventory supplies and suppliers
- **Reports & Analytics**: Comprehensive business insights and charts
- **Notifications**: Real-time alerts and updates
- **User Management**: Role-based user creation and permissions

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd business-management-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Email/Password
   - Create a Firestore database
   - Enable Storage for file uploads
   - Copy your Firebase configuration

4. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Replace the placeholder values with your actual Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## User Roles

### Super Admin
- Manage all shops and businesses
- Onboard new businesses
- Manage shop administrators
- View system-wide analytics

### Shop Admin
- Manage their assigned shop
- Add and manage staff members
- Handle products, invoices, and supplies
- View shop-specific reports

### Staff
- Create and manage invoices
- Manage products (based on permissions)
- View assigned tasks and notifications

## Default Demo Accounts

For testing purposes, you can use these demo accounts:

- **Super Admin**: admin@demo.com / admin123
- **Shop Admin**: shop@demo.com / shop123
- **Staff**: staff@demo.com / staff123

## Security

- Firebase credentials are stored in environment variables
- Role-based access control throughout the application
- Secure authentication with Firebase Auth
- Data validation and sanitization

## Technologies Used

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Forms**: React Hook Form
- **Date Handling**: date-fns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.