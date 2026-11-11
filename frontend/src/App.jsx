
import { useState, useEffect } from "react";
import "./App.css";

const API = "http://127.0.0.1:8001";

// ================= LEAVE CALENDAR =================

function LeaveCalendar({ leaves }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  function changeMonth(amount) {
    setCurrentDate(new Date(year, month + amount, 1));
  }

  function getLeaveStatus(day) {
    const currentDay = new Date(year, month, day);

    const leave = leaves.find((item) => {
      const start = new Date(`${item.start_date}T00:00:00`);
      const end = new Date(`${item.end_date}T00:00:00`);

      return currentDay >= start && currentDay <= end;
    });

    return leave ? leave.status.toLowerCase() : "";
  }

  return (
    <section className="calendar-section" id="leave-calendar">
      <div className="calendar-header">
        <div>
          <h2>Leave Calendar</h2>
          <p>View your leave dates and their status.</p>
        </div>

        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)}>
            ‹
          </button>

          <strong>{monthName}</strong>

          <button type="button" onClick={() => changeMonth(1)}>
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => (
            <div className="calendar-day-name" key={day}>
              {day}
            </div>
          )
        )}

        {Array.from({ length: firstDay }).map((_, index) => (
          <div
            className="calendar-date empty"
            key={`empty-${index}`}
          />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const status = getLeaveStatus(day);

          return (
            <div
              className={`calendar-date ${status}`}
              key={day}
            >
              <span>{day}</span>
              {status && <small>{status}</small>}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span className="approved">Approved</span>
        <span className="pending">Pending</span>
        <span className="rejected">Rejected</span>
      </div>
    </section>
  );
}

// ================= MAIN APP =================

function App() {
  const [isRegister, setIsRegister] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("leave_user") || "null");
    } catch {
      return null;
    }
  });

  // ================= EMPLOYEE STATES =================

  const [leaveForm, setLeaveForm] = useState({
    start_date: "",
    end_date: "",
    reason: ""
  });

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ================= MANAGER STATES =================

  const [managerRequests, setManagerRequests] = useState([]);
  const [managerMessage, setManagerMessage] = useState("");
  const [remarks, setRemarks] = useState({});
  const [managerLoading, setManagerLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Search and filter
  const [managerSearch, setManagerSearch] = useState("");
  const [managerStatusFilter, setManagerStatusFilter] = useState("All");

  // ================= EMPLOYEE STATISTICS =================

  const employeeTotal = leaveHistory.length;

  const employeeApproved = leaveHistory.filter(
    (leave) => leave.status === "Approved"
  ).length;

  const employeePending = leaveHistory.filter(
    (leave) => leave.status === "Pending"
  ).length;

  // ================= MANAGER STATISTICS =================

  const managerTotal = managerRequests.length;

  const managerApproved = managerRequests.filter(
    (request) => request.status === "Approved"
  ).length;

  const managerPending = managerRequests.filter(
    (request) => request.status === "Pending"
  ).length;

  const managerRejected = managerRequests.filter(
    (request) => request.status === "Rejected"
  ).length;

  // ================= MANAGER SEARCH AND FILTER =================

  const filteredManagerRequests = managerRequests.filter((request) => {
    const search = managerSearch.trim().toLowerCase();

    const matchesSearch =
      (request.employee_name || "").toLowerCase().includes(search) ||
      (request.employee_email || "").toLowerCase().includes(search) ||
      String(request.employee_id).includes(search);

    const matchesStatus =
      managerStatusFilter === "All" ||
      request.status === managerStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // ================= LOGIN FORM CHANGES =================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // ================= LOGIN AND REGISTRATION =================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    const endpoint = isRegister
      ? "/api/auth/register"
      : "/api/auth/login";

    try {
      const response = await fetch(API + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Something went wrong"
        );
      }

      if (isRegister) {
        setMessage("Registration successful! Please log in.");
        setIsRegister(false);

        setForm({
          full_name: "",
          email: form.email,
          password: ""
        });
      } else {
        localStorage.setItem("leave_token", data.access_token);

        localStorage.setItem(
          "leave_user",
          JSON.stringify(data.employee)
        );

        setUser(data.employee);
        setMessage("Login successful!");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= LOGOUT =================

  const logout = () => {
    localStorage.removeItem("leave_token");
    localStorage.removeItem("leave_user");

    setUser(null);
    setLeaveHistory([]);
    setManagerRequests([]);
    setLeaveMessage("");
    setManagerMessage("");
    setRemarks({});
    setManagerSearch("");
    setManagerStatusFilter("All");
  };

  // ================= LOAD EMPLOYEE HISTORY =================

  const loadLeaveHistory = async () => {
    const token = localStorage.getItem("leave_token");

    if (!token) return;

    setHistoryLoading(true);

    try {
      const response = await fetch(
        API + "/api/leaves/history",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load leave history"
        );
      }

      setLeaveHistory(data.leave_history || []);

      setUser((previousUser) => {
        if (!previousUser) return previousUser;

        const updatedUser = {
          ...previousUser,
          leave_balance: data.leave_balance
        };

        localStorage.setItem(
          "leave_user",
          JSON.stringify(updatedUser)
        );

        return updatedUser;
      });
    } catch (error) {
      setLeaveMessage(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ================= LOAD MANAGER REQUESTS =================

  const loadManagerRequests = async () => {
    const token = localStorage.getItem("leave_token");

    if (!token) return;

    setManagerLoading(true);
    setManagerMessage("");

    try {
      const response = await fetch(
        API + "/api/leaves/manager/requests",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load employee requests"
        );
      }

      setManagerRequests(data.requests || []);
    } catch (error) {
      setManagerMessage(error.message);
    } finally {
      setManagerLoading(false);
    }
  };

  // ================= LOAD DASHBOARD DATA =================

  useEffect(() => {
    if (user?.role === "employee") {
      loadLeaveHistory();
    }

    if (user?.role === "manager") {
      loadManagerRequests();
    }
  }, [user?.role]);

  // ================= LEAVE FORM CHANGES =================

  const handleLeaveChange = (e) => {
    setLeaveForm({
      ...leaveForm,
      [e.target.name]: e.target.value
    });
  };

  // ================= APPLY FOR LEAVE =================

  const applyLeave = async (e) => {
    e.preventDefault();

    setLeaveMessage("");
    setLeaveLoading(true);

    const token = localStorage.getItem("leave_token");

    try {
      if (leaveForm.start_date > leaveForm.end_date) {
        throw new Error(
          "End date cannot be before start date."
        );
      }

      const response = await fetch(
        API + "/api/leaves/apply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(leaveForm)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Leave application failed"
        );
      }

      setLeaveMessage(
        data.message || "Leave request submitted successfully!"
      );

      setLeaveForm({
        start_date: "",
        end_date: "",
        reason: ""
      });

      await loadLeaveHistory();
    } catch (error) {
      setLeaveMessage(error.message);
    } finally {
      setLeaveLoading(false);
    }
  };

  // ================= MANAGER REMARKS =================

  const handleRemarksChange = (leaveId, value) => {
    setRemarks((previousRemarks) => ({
      ...previousRemarks,
      [leaveId]: value
    }));
  };

  // ================= APPROVE OR REJECT =================

  const handleDecision = async (leaveId, decision) => {
    const token = localStorage.getItem("leave_token");

    setManagerMessage("");
    setDecisionLoading(true);

    try {
      const response = await fetch(
        `${API}/api/leaves/manager/${decision}/${leaveId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            remarks: remarks[leaveId] || ""
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to process leave request"
        );
      }

      setManagerMessage(
        data.message || `Leave ${decision}d successfully.`
      );

      await loadManagerRequests();
    } catch (error) {
      setManagerMessage(error.message);
    } finally {
      setDecisionLoading(false);
    }
  };

  // ================= SIDEBAR NAVIGATION =================

  const scrollToSection = (sectionId) => {
    if (sectionId === "dashboard-top") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  // ================= EMPLOYEE AND MANAGER DASHBOARD =================

  if (user) {
    return (
      <div className="dashboard-layout">

        {/* SIDEBAR */}

        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">L</div>

            <div>
              <h2>LeaveFlow</h2>
              <p>HR Workspace</p>
            </div>
          </div>

          <p className="sidebar-heading">MENU</p>

          <nav className="sidebar-nav">
            <button
              className="sidebar-link active"
              onClick={() => scrollToSection("dashboard-top")}
            >
              <span>▦</span>
              Dashboard
            </button>

            {user.role === "employee" && (
              <>
                <button
                  className="sidebar-link"
                  onClick={() => scrollToSection("apply-leave")}
                >
                  <span>＋</span>
                  Apply Leave
                </button>

                <button
                  className="sidebar-link"
                  onClick={() => scrollToSection("leave-history")}
                >
                  <span>▤</span>
                  Leave History
                </button>

                <button
                  className="sidebar-link"
                  onClick={() => scrollToSection("leave-calendar")}
                >
                  <span>▦</span>
                  Leave Calendar
                </button>
              </>
            )}

            {user.role === "manager" && (
              <button
                className="sidebar-link"
                onClick={() => scrollToSection("manager-requests")}
              >
                <span>☷</span>
                Leave Requests
              </button>
            )}
          </nav>

          <div className="sidebar-footer">
            <p>Signed in as</p>

            <strong>
              {user.name || user.full_name}
            </strong>

            <small>{user.role}</small>
          </div>
        </aside>

        {/* MAIN DASHBOARD */}

        <main className="dashboard" id="dashboard-top">

          {/* DASHBOARD HEADER */}

          <div className="dashboard-header">
            <div>
              <h1>
                Welcome, {user.name || user.full_name}
              </h1>

              <p className="dashboard-subtitle">
                Here's your leave management overview.
              </p>
            </div>

            <button
              className="logout-button"
              onClick={logout}
            >
              Logout
            </button>
          </div>

          {/* USER PROFILE */}

          <section className="profile-section">
            <div className="profile-avatar">
              {(user.name || user.full_name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-details">
              <h2>{user.name || user.full_name}</h2>
              <p>{user.email}</p>

              <div className="profile-info">
                <div>
                  <span>Employee ID</span>
                  <strong>{user.id ?? "Not available"}</strong>
                </div>

                <div>
                  <span>Account Role</span>
                  <strong>{user.role}</strong>
                </div>

                <div>
                  <span>Leave Balance</span>
                  <strong>
                    {user.leave_balance ?? 12} Days
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* EMPLOYEE LEAVE CALENDAR */}

          {user.role === "employee" && (
            <LeaveCalendar leaves={leaveHistory} />
          )}

          {/* BASIC STATISTICS */}

          <div className="dashboard-card">
            <h3>Your Role</h3>
            <p>{user.role}</p>
          </div>

          <div className="dashboard-card">
            <h3>Available Leave Balance</h3>
            <p>{user.leave_balance ?? 12} Days</p>
          </div>

          {/* EMPLOYEE DASHBOARD */}

          {user.role === "employee" && (
            <>
              <div className="dashboard-card">
                <h3>Total Leave Requests</h3>
                <p>{employeeTotal}</p>
              </div>

              <div className="dashboard-card">
                <h3>Approved Requests</h3>
                <p>{employeeApproved}</p>
              </div>

              <div className="dashboard-card">
                <h3>Pending Requests</h3>
                <p>{employeePending}</p>
              </div>

              {/* APPLY LEAVE */}

              <section
                className="leave-section"
                id="apply-leave"
              >
                <h2>Apply for Leave</h2>

                <p className="section-description">
                  Submit a new leave request.
                </p>

                <form
                  className="leave-form"
                  onSubmit={applyLeave}
                >
                  <label>Start Date</label>

                  <input
                    type="date"
                    name="start_date"
                    value={leaveForm.start_date}
                    onChange={handleLeaveChange}
                    min={new Date().toLocaleDateString("en-CA")}
                    required
                  />

                  <label>End Date</label>

                  <input
                    type="date"
                    name="end_date"
                    value={leaveForm.end_date}
                    onChange={handleLeaveChange}
                    min={
                      leaveForm.start_date ||
                      new Date().toLocaleDateString("en-CA")
                    }
                    required
                  />

                  <label>Reason for Leave</label>

                  <textarea
                    name="reason"
                    placeholder="Enter your reason for leave"
                    value={leaveForm.reason}
                    onChange={handleLeaveChange}
                    required
                  />

                  <button
                    type="submit"
                    disabled={leaveLoading}
                  >
                    {leaveLoading
                      ? "Submitting..."
                      : "Submit Leave Request"}
                  </button>
                </form>

                {leaveMessage && (
                  <p className="message">{leaveMessage}</p>
                )}
              </section>

              {/* EMPLOYEE LEAVE HISTORY */}

              <section
                className="leave-section"
                id="leave-history"
              >
                <h2>My Leave History</h2>

                <p className="section-description">
                  View the status of your leave applications.
                </p>

                {historyLoading ? (
                  <p>Loading leave history...</p>
                ) : leaveHistory.length === 0 ? (
                  <p>No leave requests found.</p>
                ) : (
                  <div className="history-list">
                    {leaveHistory.map((leave) => (
                      <div
                        className="history-card"
                        key={leave.leave_id}
                      >
                        <h3>
                          Leave Request #{leave.leave_id}
                        </h3>

                        <p>
                          <strong>Start Date:</strong>{" "}
                          {leave.start_date}
                        </p>

                        <p>
                          <strong>End Date:</strong>{" "}
                          {leave.end_date}
                        </p>

                        <p>
                          <strong>Total Days:</strong>{" "}
                          {leave.total_days}
                        </p>

                        <p>
                          <strong>Reason:</strong>{" "}
                          {leave.reason}
                        </p>

                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            className={`status-badge ${leave.status.toLowerCase()}`}
                          >
                            {leave.status}
                          </span>
                        </p>

                        <p>
                          <strong>Manager Remarks:</strong>{" "}
                          {leave.manager_remarks || "Not available"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={loadLeaveHistory}
                  disabled={historyLoading}
                >
                  {historyLoading
                    ? "Refreshing..."
                    : "Refresh History"}
                </button>
              </section>
            </>
          )}

          {/* MANAGER DASHBOARD */}

          {user.role === "manager" && (
            <>
              <div className="dashboard-card">
                <h3>Total Requests</h3>
                <p>{managerTotal}</p>
              </div>

              <div className="dashboard-card">
                <h3>Pending Requests</h3>
                <p>{managerPending}</p>
              </div>

              <div className="dashboard-card">
                <h3>Approved Requests</h3>
                <p>{managerApproved}</p>
              </div>

              <div className="dashboard-card">
                <h3>Rejected Requests</h3>
                <p>{managerRejected}</p>
              </div>

              {/* MANAGER REQUESTS */}

              <section
                className="leave-section"
                id="manager-requests"
              >
                <h2>Manager Dashboard</h2>

                <p className="section-description">
                  Review and manage employee leave requests.
                </p>

                {managerMessage && (
                  <p className="message">{managerMessage}</p>
                )}

                {/* SEARCH AND FILTER */}

                <div className="manager-filters">
                  <input
                    type="text"
                    placeholder="Search employee name, email or ID..."
                    value={managerSearch}
                    onChange={(e) =>
                      setManagerSearch(e.target.value)
                    }
                  />

                  <select
                    value={managerStatusFilter}
                    onChange={(e) =>
                      setManagerStatusFilter(e.target.value)
                    }
                  >
                    <option value="All">All Requests</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {managerLoading ? (
                  <p>Loading employee requests...</p>
                ) : filteredManagerRequests.length === 0 ? (
                  <p>No matching leave requests found.</p>
                ) : (
                  <div className="history-list">
                    {filteredManagerRequests.map((request) => (
                      <div
                        className="history-card manager-request-card"
                        key={request.leave_id}
                      >
                        <h3>
                          Leave Request #{request.leave_id}
                        </h3>

                        {/* EMPLOYEE DETAILS */}

                        <div className="employee-details">
                          <h4>Employee Information</h4>

                          <p>
                            <strong>Employee Name:</strong>{" "}
                            {request.employee_name || "Not available"}
                          </p>

                          <p>
                            <strong>Email:</strong>{" "}
                            {request.employee_email || "Not available"}
                          </p>

                          <p>
                            <strong>Employee ID:</strong>{" "}
                            {request.employee_id}
                          </p>
                        </div>

                        {/* LEAVE DETAILS */}

                        <div className="leave-details">
                          <h4>Leave Information</h4>

                          <p>
                            <strong>Start Date:</strong>{" "}
                            {request.start_date}
                          </p>

                          <p>
                            <strong>End Date:</strong>{" "}
                            {request.end_date}
                          </p>

                          <p>
                            <strong>Total Days:</strong>{" "}
                            {request.total_days}
                          </p>

                          <p>
                            <strong>Reason:</strong>{" "}
                            {request.reason}
                          </p>
                        </div>

                        {/* STATUS */}

                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            className={`status-badge ${request.status.toLowerCase()}`}
                          >
                            {request.status}
                          </span>
                        </p>

                        {/* APPROVE AND REJECT */}

                        {request.status === "Pending" && (
                          <>
                            <label>Manager Remarks</label>

                            <textarea
                              placeholder="Enter your remarks"
                              value={remarks[request.leave_id] || ""}
                              onChange={(e) =>
                                handleRemarksChange(
                                  request.leave_id,
                                  e.target.value
                                )
                              }
                            />

                            <button
                              type="button"
                              disabled={decisionLoading}
                              onClick={() =>
                                handleDecision(
                                  request.leave_id,
                                  "approve"
                                )
                              }
                            >
                              {decisionLoading
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              disabled={decisionLoading}
                              onClick={() =>
                                handleDecision(
                                  request.leave_id,
                                  "reject"
                                )
                              }
                              style={{
                                background: "#dc2626",
                                marginTop: "10px"
                              }}
                            >
                              {decisionLoading
                                ? "Processing..."
                                : "Reject"}
                            </button>
                          </>
                        )}

                        {/* MANAGER REMARKS */}

                        {request.manager_remarks && (
                          <p>
                            <strong>Manager Remarks:</strong>{" "}
                            {request.manager_remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={loadManagerRequests}
                  disabled={managerLoading}
                >
                  {managerLoading
                    ? "Refreshing..."
                    : "Refresh Requests"}
                </button>
              </section>
            </>
          )}
        </main>
      </div>
    );
  }

  // ================= LOGIN AND REGISTRATION PAGE =================

  return (
    <div className="app-container">
      <div className="login-card">
        <div className="logo">LMS</div>

        <h1>Leave Management</h1>

        <p className="subtitle">
          Employee Leave Management System
        </p>

        <h2>
          {isRegister ? "Create Account" : "Welcome Back"}
        </h2>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              name="full_name"
              placeholder="Full Name"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "Register"
              : "Login"}
          </button>
        </form>

        {message && (
          <p className="message">{message}</p>
        )}

        <p className="switch-text">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage("");
            }}
          >
            {isRegister ? " Login" : " Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;
