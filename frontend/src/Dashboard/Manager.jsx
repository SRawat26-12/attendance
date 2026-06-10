import { useState, useEffect } from "react";
import { Users, Clock, LogOut, ShieldAlert, Camera, MapPin, CheckCircle, XCircle, Download } from "lucide-react";
const API_URL = import.meta.env.VITE_API_URL;
export default function Manager() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [selectedSelfie, setSelectedSelfie] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  const [remarks, setRemarks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;


  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentData = teamAttendance.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(teamAttendance.length / rowsPerPage);


  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth, selectedYear]);


  useEffect(() => {
    setRemarks({});
    if (activeTab === "attendance") {
      fetchTeamData();
    } else {
      fetchPendingOvertime();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/manager/getTeamAttendance?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setTeamAttendance(data.records || []);
    } catch (err) { console.error("Error:", err); }
  };

  const fetchPendingOvertime = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/manager/getPendingOvertime`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setTeamAttendance(data.records || []);
    } catch (err) { console.error("Error fetching OT:", err); }
  };

  const handleAction = async (endpoint, payload, recordId) => {

    const actionRemarks = remarks[recordId] || "";
    const finalPayload = { ...payload, remarks: actionRemarks };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/manager/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(finalPayload),
      });

      if (res.ok) {
        alert("Action successful!");

        setRemarks(prev => ({ ...prev, [recordId]: "" }));
        activeTab === "attendance" ? fetchTeamData() : fetchPendingOvertime();
      }
    } catch (err) { console.error("Action error:", err); }
  };

  const handleRemarkChange = (recordId, value) => {
    setRemarks(prev => ({
      ...prev,
      [recordId]: value
    }));
  };

  const downloadCSV = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/manager/downloadcsv?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Team_Report_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("CSV failed");
      }
    } catch (err) { console.error("CSV Export error:", err); }
  };

  const logout = () => { localStorage.clear(); window.location.href = "/login"; };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2"><ShieldAlert className="text-purple-400" /> Manager</h2>
        <nav className="space-y-4">
          <button onClick={() => setActiveTab("attendance")} className={`w-full p-3 rounded-lg text-left ${activeTab === 'attendance' ? 'bg-purple-600' : 'hover:bg-slate-800'}`}>Attendance Log</button>
          <button onClick={() => setActiveTab("overtime")} className={`w-full p-3 rounded-lg text-left ${activeTab === 'overtime' ? 'bg-purple-600' : 'hover:bg-slate-800'}`}>Overtime Requests</button>
          <button onClick={downloadCSV} className="w-full p-3 rounded-lg text-left text-blue-400 hover:bg-slate-800">Export CSV</button>
        </nav>
        <button onClick={logout} className="mt-10 w-full p-3 bg-red-900 rounded-lg">Logout</button>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold capitalize">{activeTab} Management</h1>

          {activeTab === 'attendance' && (
            <div className="flex gap-2 bg-white p-2 rounded-lg border shadow-sm">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="p-1 text-sm border-none focus:ring-0 cursor-pointer font-medium text-slate-700 bg-transparent"
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="p-1 text-sm border-none focus:ring-0 cursor-pointer font-medium text-slate-700 bg-transparent"
              >
                {Array.from({ length: 15 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Shift Details</th>
                <th className="p-4">Status</th>
                <th className="p-4">Evidence</th>
                <th className="p-4 text-center w-64">Actions & Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {currentData.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No records found</td></tr>
              ) : (
                currentData.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="p-4 font-semibold">{r.user?.email}</td>
                    <td className="p-4">
                      <div>In: {new Date(r.punchInTime).toLocaleTimeString()}</div>
                      <div>Out: {r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString() : "Ongoing"}</div>
                      <div className={`font-bold ${r.totalHours >= 8 ? "text-green-600" : "text-amber-600"}`}>
                        {r.totalHours?.toFixed(1) || 0} Hrs
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.verificationStatus === 'valid' ? 'bg-green-100 text-green-700' :
                        r.verificationStatus === 'invalid' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                        {r.verificationStatus || "pending"}
                      </span>

                      {r.remarks && <div className="text-xs text-slate-500 mt-1 italic max-w-[150px] truncate" title={r.remarks}>Note: {r.remarks}</div>}
                    </td>

                    <td className="p-4 space-y-1">
                      {r.selfieIn && <button onClick={() => setSelectedSelfie(r.selfieIn)} className="text-purple-600 flex items-center gap-1 text-xs underline">In-Selfie</button>}
                      {r.selfieOut && <button onClick={() => setSelectedSelfie(r.selfieOut)} className="text-blue-600 flex items-center gap-1 text-xs underline">Out-Selfie</button>}
                      <div className="text-[10px] text-slate-400"><MapPin size={10} /> Loc: {r.locationIn?.lat?.toFixed(2) || 0}, {r.locationIn?.lng?.toFixed(2) || 0}</div>
                    </td>


                    <td className="p-4 bg-slate-50/50">
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Reason / Remark..."
                          value={remarks[r._id] || ""}
                          onChange={(e) => handleRemarkChange(r._id, e.target.value)}
                          className="p-1.5 text-xs border rounded-md bg-white focus:outline-purple-500 w-full"
                        />

                        {activeTab === 'attendance' ? (
                          <div className="flex justify-center gap-4 pt-1">
                            <button
                              onClick={() => handleAction("validate", { attendanceId: r._id, status: "valid" }, r._id)}
                              className="text-green-600 hover:scale-110 transition"
                              title="Mark Valid"
                            >
                              <CheckCircle size={22} />
                            </button>
                            <button
                              onClick={() => handleAction("validate", { attendanceId: r._id, status: "invalid" }, r._id)}
                              className="text-red-600 hover:scale-110 transition"
                              title="Mark Invalid"
                            >
                              <XCircle size={22} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAction("overtimeAction", { attendanceId: r._id, action: "approved" }, r._id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 rounded-md text-xs font-bold transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction("overtimeAction", { attendanceId: r._id, action: "rejected" }, r._id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1 rounded-md text-xs font-bold transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center p-4 border-t bg-white">
            <p className="text-sm text-slate-500">
              Showing {Math.min(indexOfFirstRow + 1, teamAttendance.length)} to {Math.min(indexOfLastRow, teamAttendance.length)} of {teamAttendance.length} records
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50 hover:bg-slate-200"
              >
                Prev
              </button>
              <span className="px-3 py-1 bg-purple-600 text-white rounded font-bold">
                {currentPage}
              </span>
              <button
                disabled={currentPage >= totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50 hover:bg-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {selectedSelfie && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSelfie(null)}>
          <img src={selectedSelfie} className="max-h-[80vh] rounded-xl shadow-2xl border-4 border-white" alt="Evidence" />
        </div>
      )}
    </div>
  );
}