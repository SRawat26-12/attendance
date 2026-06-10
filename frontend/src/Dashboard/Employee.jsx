import { useRef, useState, useEffect } from "react";

const OFFICE_LAT = 28.6139; 
const OFFICE_LNG = 77.2090; 
const ALLOWED_RADIUS_METERS = 100000000000; 

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Employee() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchAction, setPunchAction] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [liveStreamTime, setLiveStreamTime] = useState("00h 00m 00s");
  const [otHours, setOtHours] = useState("");
  const [otSuccess, setOtSuccess] = useState(false);

  // 📄 Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5); // Default 5 entries per page

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;
  const userId = user?.id || user?._id;

  useEffect(() => {
    if (!userId || userId === "mock_userid_998877") {
      setError("Invalid Session. Please login with a valid account.");
      return;
    }
    checkPunchStatus();
    fetchHistory();
  }, [userId]);

  useEffect(() => {
    let interval = null;
    if (isPunchedIn && todayRecord?.punchInTime) {
      interval = setInterval(() => {
        const punchInDate = new Date(todayRecord.punchInTime);
        const diffMs = new Date() - punchInDate; 
        
        if (diffMs > 0) {
          const secs = Math.floor((diffMs / 1000) % 60);
          const mins = Math.floor((diffMs / (1000 * 60)) % 60);
          const hours = Math.floor((diffMs / (1000 * 60 * 60)));
          
          setLiveStreamTime(
            `${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`
          );
        }
      }, 1000);
    } else {
      setLiveStreamTime("00h 00m 00s");
    }
    return () => clearInterval(interval);
  }, [isPunchedIn, todayRecord]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const checkPunchStatus = async () => {
    try {
      const token = localStorage.getItem("token"); 
      const res = await fetch(`http://localhost:5000/api/punch/status/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` } 
      });
      const data = await res.json();

      if (res.ok) {
        setIsPunchedIn(!!data.isPunchedIn);
        setTodayRecord(data.record || null);
      }
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token"); 
      const res = await fetch(`http://localhost:5000/api/punch/gethistory/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(Array.isArray(data) ? data : (data.history || []));
        setCurrentPage(1); // Reset to first page on data reload
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const openCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
      throw err;
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraOn]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    setCameraOn(false);
    setPunchAction(null);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error("Location access denied. Turn on GPS.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  const startPunch = async (action) => {
    setPunchAction(action);
    setError(null);
    try {
      await openCamera();
    } catch (err) {
      setPunchAction(null);
    }
  };

  const confirmPunch = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const [selfie, location] = await Promise.all([
        Promise.resolve(captureSelfie()),
        getLocation()
      ]);

      if (!selfie) throw new Error("Failed to capture image.");

      const distance = getDistanceInMeters(location.lat, location.lng, OFFICE_LAT, OFFICE_LNG);
      if (distance > ALLOWED_RADIUS_METERS) {
        throw new Error(`Out of Range! You are ${Math.round(distance)}m away.`);
      }

      const res = await fetch(`http://localhost:5000/api/punch/punch${punchAction === "in" ? "In" : "Out"}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ userId, selfie, lat: location.lat, lng: location.lng }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Punch failed");

      stopCamera();
      await checkPunchStatus();
      await fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVReport = () => {
    if (history.length === 0) return alert("No records available to export!");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Punch In Time,Punch Out Time,Active Hours,Shift Status,Verification Status\n";

    history.forEach((log) => {
      const date = formatDate(log.punchInTime);
      const clockIn = formatTime(log.punchInTime);
      const clockOut = log.punchOutTime ? formatTime(log.punchOutTime) : "N/A";
      const totalHours = formatHours(log.totalHours);
      const shiftStatus = log.totalHours >= 8 ? "Completed" : "Incomplete";
      const verification = log.verificationStatus || "Pending";

      csvContent += `"${date}","${clockIn}","${clockOut}","${totalHours}","${shiftStatus}","${verification}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${user?.name || "Employee"}_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOTRequest = async (e) => {
    e.preventDefault();
    if (!todayRecord?._id || !otHours) return;
  
    const token = localStorage.getItem("token"); 

    try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/punch/overtimeRequest", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                attendanceId: todayRecord._id, 
                hoursRequested: Number(otHours) 
            }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        setOtSuccess(true);
        setTodayRecord(data.attendance);
        fetchHistory();
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "--:--";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No Date";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "No Date" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatHours = (hours) => {
    if (!hours || isNaN(hours)) return "0h 0m";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // 🧮 Pagination Slicing Core Logic
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistoryChunks = history.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 antialiased">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-200">
              {user?.name?.charAt(0)?.toUpperCase() || "E"}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Welcome, {user?.name || "Employee"}</h1>
              <p className="text-xs text-gray-500 font-medium">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-gray-100 px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 tracking-wider">
              EMPLOYEE PORTAL
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition shadow-xs"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-6 shadow-xs">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
              <span>⚠️ Status/Alert:</span>
              <p className="font-normal">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Shift Metrics</h2>
                  <p className="text-xs text-gray-400">Real-time update of your contemporary punch logs.</p>
                </div>
                {isPunchedIn && (
                  <span className="animate-pulse px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-black tracking-wide">
                    ⏱️ Session: {liveStreamTime}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Clock In</p>
                  <p className="text-xl font-bold text-gray-900">{formatTime(todayRecord?.punchInTime)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Clock Out</p>
                  <p className="text-xl font-bold text-gray-900">{formatTime(todayRecord?.punchOutTime)}</p>
                </div>
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-50">
                  <p className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">Total Active Hours</p>
                  <p className="text-xl font-bold text-blue-900">{formatHours(todayRecord?.totalHours)}</p>
                </div>
              </div>
            </div>

            {cameraOn && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm overflow-hidden">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Identity & Biometric Verification</h3>
                <div className="relative max-w-xl mx-auto rounded-xl overflow-hidden border border-gray-200 bg-black shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto aspect-video object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                    <button
                      onClick={stopCamera}
                      disabled={loading}
                      className="px-5 py-2.5 bg-gray-900/90 text-white rounded-xl font-medium text-sm backdrop-blur-xs hover:bg-gray-800 transition shadow-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmPunch}
                      disabled={loading}
                      className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg ${punchAction === "in" ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"}`}
                    >
                      {loading ? "Verifying Perimeter..." : punchAction === "in" ? "Verify Punch In" : "Verify Punch Out"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!cameraOn && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">Attendance Terminal</h3>
                    <p className="text-xs text-gray-400 mb-6">Initiate your workplace presence verification sequence (Range: 200m).</p>
                  </div>
                  
                  <div className="space-y-3">
                    {!isPunchedIn ? (
                      <button
                        onClick={() => startPunch("in")}
                        disabled={loading}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-green-100 flex items-center justify-center gap-2"
                      >
                        📥 Punch In Shift
                      </button>
                    ) : (
                      <button
                        onClick={() => startPunch("out")}
                        disabled={loading}
                        className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-40 shadow-md shadow-red-100 flex items-center justify-center gap-2"
                      >
                        📤 Punch Out Shift
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm border border-gray-200"
                    >
                      🚪 Exit & Logout
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-base mb-1">Overtime Settlement</h3>
                  <p className="text-xs text-gray-400 mb-4">File claims for supplementary hours worked post-shift.</p>

                  {todayRecord?.punchOutTime ? (
                    <>
                      {todayRecord?.totalHours >= 0 ? (
                        <>
                          {(!todayRecord.overtimeStatus || todayRecord.overtimeStatus === "none") ? (
                            <form onSubmit={handleOTRequest} className="space-y-3">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="0.5"
                                  max="8"
                                  step="0.5"
                                  placeholder="Hours (e.g. 1.5)"
                                  value={otHours}
                                  onChange={(e) => setOtHours(e.target.value)}
                                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                  required
                                />
                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition text-sm disabled:opacity-50 shadow-md shadow-blue-100"
                                >
                                  File Claim
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-blue-500 font-medium">Requested Volume:</span>
                                <strong className="text-blue-900 font-bold">{todayRecord.overtimeRequested} hrs</strong>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-blue-500 font-medium">Workflow Status:</span>
                                <span className="capitalize px-2.5 py-0.5 bg-white text-blue-700 rounded-full font-bold shadow-xs border border-blue-200">
                                  {todayRecord.overtimeStatus}
                                </span>
                              </div>
                            </div>
                          )}
                          {otSuccess && <p className="text-green-600 text-xs mt-2 font-medium flex items-center gap-1">✓ Request pipeline activated successfully.</p>}
                        </>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs text-amber-800 font-medium leading-relaxed">
                            ⚠️ <strong>Overtime Locked:</strong> Eligible only after standard 8-hour shift.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-28 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center p-4 text-center">
                      <p className="text-xs text-gray-400 font-medium">Available dynamically upon executing your Shift Punch Out.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historical Ledger Section with Active Pagination */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between min-h-[520px]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Historical Ledger</h3>
                    <p className="text-xs text-gray-400">Timeline statements logs.</p>
                  </div>
                  <button 
                    onClick={downloadCSVReport}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    📥 Export
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-100 rounded-xl">
                    <p className="text-xs text-gray-400 font-medium">No ledger accounts registered.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Sliced data dynamic rendering */}
                    {currentHistoryChunks.map((log, index) => (
                      <div key={log?._id || index} className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-900">{formatDate(log?.punchInTime)}</p>
                            <p className="text-[11px] text-gray-400 font-medium">
                              {formatTime(log?.punchInTime)} — {log?.punchOutTime ? formatTime(log.punchOutTime) : "Active"}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-xs font-extrabold text-gray-800">{formatHours(log?.totalHours)}</p>
                            <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              log?.totalHours >= 8 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {log?.totalHours >= 8 ? "Completed" : "Incomplete"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-medium">Status:</span>
                          <span className={`font-bold capitalize ${
                            log?.verificationStatus === "valid" ? "text-green-600" : 
                            log?.verificationStatus === "invalid" ? "text-red-600" : "text-amber-600"
                          }`}>
                            {log?.verificationStatus === "valid" ? "✓ Validated" : 
                             log?.verificationStatus === "invalid" ? "⚠️ Invalid/Fake" : "⏳ Pending Verification"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🛠️ Pagination Control Footer Interface */}
              {history.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
                  {/* Select Items Rows Limit */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">Rows per page:</span>
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Rows size change hone par back to page 1
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-md p-1 font-semibold text-gray-700 focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400">
                      Page <strong className="text-gray-700">{currentPage}</strong> of <strong className="text-gray-700">{totalPages || 1}</strong>
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 transition disabled:opacity-40 disabled:hover:bg-white"
                      >
                        ◀ Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-2.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 transition disabled:opacity-40 disabled:hover:bg-white"
                      >
                        Next ▶
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}