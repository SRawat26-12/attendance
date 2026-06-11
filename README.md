# 📊 Attendance Management System

A full-stack web application designed to manage and track user attendance efficiently. This project features a secure Admin Dashboard, user authentication, and attendance logging capabilities.

## 🔗 Live Links
* **Frontend (Live App):** [https://attendance-inky-zeta.vercel.app](https://attendance-inky-zeta.vercel.app)
* **Backend API Base URL:** [https://attendance-2-u2pa.onrender.com/api](https://attendance-2-u2pa.onrender.com/api)

---

## 🏗️ Architecture Overview
The application follows a client-server architecture:

* **Frontend:** Built with **React.js** and **Vite**, hosted on **Vercel**. It manages client-side routing (React Router) and communicates with the backend securely via REST APIs.
* **Backend:** Built with **Node.js** and **Express.js**, hosted on **Render**. It handles routing, JWT authentication, business logic, and database operations.
* **Database:** **MongoDB** (NoSQL) is used for storing user profiles, admin credentials, and structured attendance logs.

---

## 🛠️ Features Implemented
* **🔐 Secure Authentication:** Robust JWT-based login system for Admins and Users to protect sensitive routes.
* **📅 Attendance Tracking:** Admins can filter, track, and monitor daily, monthly, and yearly attendance records seamlessly.
* **👥 User Management:** Complete CRUD capabilities for admins to add, view, and manage user profiles.
* **📥 Data Export:** Feature to export comprehensive attendance records into downloadable **CSV format**.
* **📱 Responsive UI:** Modern, clean, and fully intuitive interface optimized for both desktop and mobile screens.

---

## 📋 Setup Instructions

### Prerequisites
* **Node.js** (v16 or higher recommended) installed on your local machine.
* **MongoDB** connection string (Atlas or Local community server).

### Steps to Run Locally

#### 1. Clone the repository
```bash
git clone [https://github.com/SRawat26-12/attendance.git](https://github.com/SRawat26-12/attendance.git)
cd attendance
2. Setup Backend
Navigate to the backend folder:

Bash
cd backend
Create a .env file in the root of the backend folder and configure the following variables (Use placeholders for safety):

Code snippet
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
Install dependencies and start the local development server:

Bash
npm install
node index.js
3. Setup Frontend
Open a new terminal and navigate to the frontend folder:

Bash
cd frontend
Create a .env file in the root of the frontend folder and add your local API endpoint:

Code snippet
VITE_API_URL=http://localhost:5000/api
Install dependencies and launch the Vite development environment:

Bash
npm install
npm run dev
## 🔑 Demo Login Credentials
For testing purposes, you can use the following credentials:
* **Email:** admin@email.com
* **Password:** 12345678
💡 Assumptions Made
Role Hierarchy: The system assumes a single Admin role with absolute privileges for managing all user records.

User Onboarding: Users do not self-register; they are pre-registered/created in the database directly by the administrator.

Time Zone Alignment: Attendance logs are recorded based on the server's local time zone configuration.

User Onboarding: Users do not self-register; they are pre-registered in the database by the administrator.

Time Zone Alignment: Attendance logs are recorded based on the server's local time zone.
