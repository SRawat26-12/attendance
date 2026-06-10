import { useState, useEffect } from "react";
import { ShieldCheck, Users, FileText, CheckCircle, XCircle, LogOut, Plus, X, UserMinus, AlertCircle, Activity } from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState([]);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "employee", manager: "" });
  const [stats, setStats] = useState({ totalUsers: 0, pendingVerifications: 0, activePunches: 0 });
  const [selectedSelfie, setSelectedSelfie] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [remarks, setRemarks] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentData = data.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(data.length / rowsPerPage);


  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchData = async () => {
    const endpoint = activeTab === "attendance"
      ? `/api/admin/all-attendance?month=${selectedMonth}&year=${selectedYear}`
      : "/api/admin/getusers";

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const json = await res.json();
      setData(activeTab === "attendance" ? (json.records || []) : (json.users || []));
    } catch (err) {
      console.error("Error fetching data:", err);
      setData([]);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/dashboardstats", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const json = await res.json();
      if (json.success) setStats(json.stats);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

 const fetchManagers = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/admin/getmanager", {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
    
    if (res.status === 401) {
      alert("Session expired! Please login again.");
      handleLogout();
      return;
    }

    const json = await res.json();
    setManagers(json.managers || []);
  } catch (err) {
    console.error("Error fetching managers:", err);
  }
};

  useEffect(() => {
    fetchData();
    fetchDashboardStats();
    if (activeTab === "users") fetchManagers();
  }, [activeTab, selectedMonth, selectedYear]);

  const handleExportCSV = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/downloadcsv?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Attendance_Report_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("Failed to export CSV");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Error exporting CSV");
    }
  };

  const handleToggleStatus = async (userId, userName, currentStatus) => {
    const action = currentStatus === false ? "activate" : "deactivate";
    if (window.confirm(`Are you sure you want to ${action} ${userName}?`)) {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/deactivate/${userId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ isActive: !currentStatus })
        });
        if (res.ok) {
          alert(`User ${action}d successfully!`);
          fetchData();
        }
      } catch (err) {
        console.error("Error:", err);
      }
    }
  };

  const handleAction = async (payload, recordId) => {
    const actionRemarks = remarks[recordId] || "";
    try {
      const res = await fetch(`http://localhost:5000/api/admin/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ ...payload, remarks: actionRemarks })
      });

      if (res.ok) {
        alert("Attendance Status Updated!");
        setRemarks(prev => ({ ...prev, [recordId]: "" }));
        fetchData();
        fetchDashboardStats();
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Action error:", err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("User Created Successfully!");
        setShowModal(false);
        setFormData({ name: "", email: "", password: "", role: "employee", manager: "" });
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to create user.");
      }
    } catch (err) {
      console.error("Create user error:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 🏙️ Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="text-2xl font-bold mb-10 text-blue-400 flex items-center gap-2">
            <ShieldCheck /> Admin Panel
          </div>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            >
              <FileText size={20} /> Attendance Log
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            >
              <Users size={20} /> Manage Users
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full p-3 rounded-lg flex items-center gap-3 text-red-400 hover:bg-red-900/30 transition mt-auto"
        >
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* 📂 Main Content */}
      <main className="flex-1 p-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.totalUsers}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg"><AlertCircle size={24} /></div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Verifications</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.pendingVerifications}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Activity size={24} /></div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Active Punches (Today)</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.activePunches}</h3>
            </div>
          </div>
        </div>

        {/* Header Actions Container */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold capitalize text-slate-800">{activeTab} Management</h1>

          {/* 🗓️ Attendance Filters */}
          {activeTab === "attendance" && (
            <div className="flex gap-2 bg-white p-2 rounded-lg border shadow-sm">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="p-1 text-sm border-none bg-transparent cursor-pointer font-medium text-slate-700 focus:ring-0"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="p-1 text-sm border-none bg-transparent cursor-pointer font-medium text-slate-700 focus:ring-0"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = 2026 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm font-semibold text-sm h-full"
              >
                <FileText size={16} /> Export
              </button>
            </div>
          )}

          {/* ➕ Add New User Button */}
          {activeTab === "users" && (

            <button
              onClick={() => {
                fetchManagers(); // Modal khulte hi fetch karein
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm font-semibold"
            >
              <Plus size={20} /> Add New User
            </button>
          )}
        </div>

        {/* 📑 Dynamic Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="p-4">User Details</th>
                <th className="p-4">{activeTab === "attendance" ? "Manager Assigned" : "Role"}</th>
                {activeTab === "attendance" && <th className="p-4">Status & Remarks</th>}
                <th className="p-4">Selfie</th>
                <th className="p-4">{activeTab === "attendance" ? "Timestamp" : "Joined Date"}</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "attendance" ? 6 : 5} className="p-8 text-center text-slate-400">
                    No records found
                  </td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    {/* User Profile */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.user?.name || item.name}</div>
                      <div className="text-xs text-slate-400">{item.user?.email || item.email}</div>
                    </td>

                    {/* Role / Manager column */}
                    <td className="p-4">
                      {activeTab === "attendance" ? (
                        <span className="text-slate-600">{item.user?.manager?.name || "N/A"}</span>
                      ) : (
                        <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600">
                          {item.role}
                        </span>
                      )}
                    </td>

                    {/* Status & Remarks (Only for Attendance) */}
                    {activeTab === "attendance" && (
                      <td className="p-4">
                        <span className={`inline-block mb-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${item.verificationStatus === 'valid' ? 'bg-green-100 text-green-700' :
                          item.verificationStatus === 'invalid' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                          {item.verificationStatus || "pending"}
                        </span>
                        <input
                          type="text"
                          placeholder="Add remark..."
                          value={remarks[item._id] || ""}
                          className="block mt-1 p-1 border rounded w-40 text-xs focus:outline-blue-500 bg-slate-50"
                          onChange={e => setRemarks({ ...remarks, [item._id]: e.target.value })}
                        />
                      </td>
                    )}

                    {/* Selfie Preview Button Cell */}
                    {/* Replace the current Selfie <td> with this: */}
                    <td className="p-4 flex gap-2">
                      {item.selfieIn && (
                        <button
                          onClick={() => setSelectedSelfie(item.selfieIn)}
                          className="text-blue-600 hover:underline text-xs font-semibold"
                        >
                          View In
                        </button>
                      )}
                      {item.selfieOut && (
                        <button
                          onClick={() => setSelectedSelfie(item.selfieOut)}
                          className="text-purple-600 hover:underline text-xs font-semibold"
                        >
                          View Out
                        </button>
                      )}
                      {!item.selfieIn && !item.selfieOut && <span className="text-slate-400 text-xs">No Photo</span>}
                    </td>

                    {/* Timestamp / Date */}
                    <td className="p-4 text-slate-500">
                      {activeTab === "attendance" ? (
                        new Date(item.createdAt).toLocaleString()
                      ) : (
                        item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"
                      )}
                    </td>

                    {/* Actions Row */}
                    <td className="p-4 text-center">
                      {activeTab === "attendance" ? (
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => handleAction({ attendanceId: item._id, status: "valid" }, item._id)}
                            className="text-green-600 hover:scale-110 transition" title="Mark Valid"
                          >
                            <CheckCircle size={22} />
                          </button>
                          <button
                            onClick={() => handleAction({ attendanceId: item._id, status: "invalid" }, item._id)}
                            className="text-red-600 hover:scale-110 transition" title="Mark Invalid"
                          >
                            <XCircle size={22} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(item._id, item.name, item.isActive)}
                          className={`transition ${item.isActive ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}
                          title={item.isActive ? "Deactivate User" : "Activate User"}
                        >
                          {item.isActive ? <UserMinus size={20} /> : <CheckCircle size={20} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center p-4 border-t bg-slate-50">
            <p className="text-sm text-slate-500">
              Showing {Math.min(indexOfFirstRow + 1, data.length)} to {Math.min(indexOfLastRow, data.length)} of {data.length} results
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 bg-white border rounded disabled:opacity-50 hover:bg-slate-100"
              >
                Prev
              </button>
              <span className="px-3 py-1 bg-blue-600 text-white rounded font-bold">
                {currentPage}
              </span>
              <button
                disabled={currentPage >= totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 bg-white border rounded disabled:opacity-50 hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* 📸 Selfie Preview Modal */}
        {selectedSelfie && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 shadow-xl max-w-sm w-full relative">
              <button
                onClick={() => setSelectedSelfie(null)}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold mb-3 text-center text-slate-800">User Selfie</h3>
              <img
                src={selectedSelfie}
                alt="Employee Selfie"
                className="w-full h-auto rounded-lg border max-h-[60vh] object-cover"
              />
            </div>
          </div>
        )}

        {/* 📝 Create User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Create New User</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <input
                  required
                  placeholder="Full Name"
                  value={formData.name}
                  className="w-full p-3 border rounded-lg focus:outline-blue-500"
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  className="w-full p-3 border rounded-lg focus:outline-blue-500"
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  required
                  type="password"
                  placeholder="Secure Password"
                  value={formData.password}
                  className="w-full p-3 border rounded-lg focus:outline-blue-500"
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />

                <select
                  value={formData.role}
                  className="w-full p-3 border rounded-lg bg-white focus:outline-blue-500"
                  onChange={e => setFormData({ ...formData, role: e.target.value, manager: "" })}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>

                {formData.role === 'employee' && (
                  <select
                    required
                    value={formData.manager}
                    className="w-full p-3 border rounded-lg bg-white focus:outline-blue-500"
                    onChange={e => setFormData({ ...formData, manager: e.target.value })}
                  >
                    <option value="">Select Reporting Manager</option>
                    {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                )}

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition shadow-sm">
                  Create Account
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}