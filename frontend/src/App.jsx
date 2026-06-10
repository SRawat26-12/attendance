import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./Dashboard/Admin";
import Employee from "./Dashboard/Employee";
import Manager from "./Dashboard/Manager";


const ProtectedRoute = ({ children, allowedRole }) => {

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const role = user?.role; 

  if (!user || !role) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Employee */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRole="employee">
              <Employee />
            </ProtectedRoute>
          }
        />

        {/* Manager */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRole="manager">
              <Manager />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Unauthorized */}
        <Route
          path="/unauthorized"
          element={
            <div className="flex items-center justify-center h-screen text-red-500 text-xl">
              Access Denied 🚫
            </div>
          }
        />

      </Routes>
    </BrowserRouter>
  );
};

export default App;