"use client";

import React, { useState, useEffect, useCallback } from "react";

// ============================================================================
// SHARED INTERFACES (Linked with Student/Customer Page)
// ============================================================================
export interface StudentAccount {
  id: string;
  email: string;
  phoneMasked: string;
  phoneHash: string;
  branch: string;
  year: string;
  authProvider: "google_oauth" | "email_otp";
  idCardImage: string;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  status?: "pending" | "verified" | "rejected";
  submittedAt?: string;
}

export interface StudentProfile {
  id: string;
  alias: string;
  avatar: string;
  yearDept: string;
  bio: string;
  interests: string[];
  compatibility?: number;
  status: "pending" | "approved" | "flagged";
  dob?: string;
  email?: string;
  phoneMasked?: string;
  idCardImage?: string;
}

type DesignMode = "bento" | "kanban" | "terminal";
type ActiveSection = "verifications" | "students" | "reports" | "events";

const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: "stu_101",
    alias: "MidnightCoder",
    avatar: "🦉",
    yearDept: "3rd Year • CS",
    bio: "Surviving on cold brew and last-minute assignments. Looking for someone to grab late-night campus Maggi with.",
    interests: ["Indie Music", "Hackathons", "Late-Night Walks"],
    compatibility: 94,
    status: "pending",
    dob: "2005-06-15",
    email: "arjun.cs23@college.edu",
  },
  {
    id: "stu_102",
    alias: "VelvetSketch",
    avatar: "🦊",
    yearDept: "2nd Year • Design",
    bio: "I rate campus cafes by their playlist. Tell me your most controversial movie opinion.",
    interests: ["Thrifting", "Iced Matcha", "Sci-Fi Films"],
    compatibility: 89,
    status: "approved",
    dob: "2006-09-21",
    email: "riya.des24@college.edu",
  },
  {
    id: "stu_103",
    alias: "CosmicRhythm",
    avatar: "🐼",
    yearDept: "4th Year • ECE",
    bio: "Guitarist who knows 4 chords really well. Down for library study dates or spontaneous road trips.",
    interests: ["Acoustic Guitar", "Street Food", "Badminton"],
    compatibility: 84,
    status: "approved",
    dob: "2004-11-03",
    email: "kabir.ece22@college.edu",
  },
  {
    id: "stu_104",
    alias: "ShadowWolf99",
    avatar: "🐯",
    yearDept: "1st Year • BBA",
    bio: "DM me your Insta handle immediately, no time for blind chat rules.",
    interests: ["Parties", "Gaming"],
    compatibility: 61,
    status: "flagged",
    dob: "2007-02-19",
    email: "rohan.bba25@college.edu",
  },
];

export default function AdminDashboardVariants() {
  // --- Auth & UI Design Mode ---
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [designMode, setDesignMode] = useState<DesignMode>("bento");
  const [activeSection, setActiveSection] = useState<ActiveSection>("verifications");

  // --- Shared Student & ID Verification Queue State ---
  const [students, setStudents] = useState<StudentProfile[]>(INITIAL_STUDENTS);
  const [verificationQueue, setVerificationQueue] = useState<StudentAccount[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("stu_101");
  const [previewIdImage, setPreviewIdImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // --- Live Event & Icebreaker Controls ---
  const [speedDatingLive, setSpeedDatingLive] = useState<boolean>(false);
  const [revealThreshold, setRevealThreshold] = useState<number>(25);
  const [icebreaker, setIcebreaker] = useState<string>(
    "What is your most controversial campus canteen food opinion?"
  );

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Sync both "heartlink_admin_verification_queue" and "college_dating_all_users"
  const syncFromCustomerApp = useCallback(() => {
    // 1. Sync College ID Verification Queue
    const rawQueue = localStorage.getItem("heartlink_admin_verification_queue");
    if (rawQueue) {
      try {
        const parsedQueue: StudentAccount[] = JSON.parse(rawQueue);
        setVerificationQueue(parsedQueue);
      } catch {
        // Ignore malformed JSON
      }
    }

    // 2. Sync All Student Profiles
    const savedUsers = localStorage.getItem("college_dating_all_users");
    if (savedUsers) {
      try {
        const parsedUsers: StudentProfile[] = JSON.parse(savedUsers);
        if (parsedUsers.length > 0) {
          setStudents((prev) => {
            const byId = new Map<string, StudentProfile>();
            prev.forEach((s) => byId.set(s.id, s));
            parsedUsers.forEach((p) => {
              const existing = byId.get(p.id);
              byId.set(p.id, { ...existing, ...p });
            });
            return Array.from(byId.values());
          });
        }
      } catch {
        // Ignore malformed JSON
      }
    }
  }, []);

  useEffect(() => {
    syncFromCustomerApp();

    const handleStorageChange = () => syncFromCustomerApp();
    window.addEventListener("storage", handleStorageChange);

    // Poll every 2 seconds so even same-window or rapid updates sync immediately
    const interval = setInterval(syncFromCustomerApp, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [syncFromCustomerApp]);

  // Approve or Reject a Student's College ID Verification Ticket
  const handleVerifyDecision = (
    ticketId: string,
    email: string,
    decision: "verified" | "rejected"
  ) => {
    // 1. Update heartlink_admin_verification_queue
    const updatedQueue = verificationQueue.map((item) =>
      item.id === ticketId || item.email === email
        ? { ...item, verificationStatus: decision, status: decision }
        : item
    );
    setVerificationQueue(updatedQueue);
    localStorage.setItem(
      "heartlink_admin_verification_queue",
      JSON.stringify(updatedQueue)
    );

    // 2. If this student is also the currently logged-in account in the same browser, update their session directly
    const currentCustomerAcc = localStorage.getItem("heartlink_student_account");
    if (currentCustomerAcc) {
      try {
        const parsedAcc: StudentAccount = JSON.parse(currentCustomerAcc);
        if (parsedAcc.id === ticketId || parsedAcc.email === email) {
          const updatedAcc: StudentAccount = {
            ...parsedAcc,
            verificationStatus: decision,
          };
          localStorage.setItem(
            "heartlink_student_account",
            JSON.stringify(updatedAcc)
          );
        }
      } catch {
        // Ignore
      }
    }

    // 3. Also sync status in college_dating_all_users
    const mappedProfileStatus: "approved" | "flagged" =
      decision === "verified" ? "approved" : "flagged";
    const updatedStudents = students.map((s) =>
      s.id === ticketId || s.email === email
        ? { ...s, status: mappedProfileStatus }
        : s
    );
    setStudents(updatedStudents);
    localStorage.setItem(
      "college_dating_all_users",
      JSON.stringify(updatedStudents)
    );

    triggerToast(
      decision === "verified"
        ? `Approved College ID for ${email}! Student can now enter the app.`
        : `Rejected College ID for ${email}.`
    );
  };

  // Update Student Profile Status (Pending / Approved / Flagged) & Sync with ID Queue
  const updateStudentStatus = (
    id: string,
    newStatus: "pending" | "approved" | "flagged"
  ) => {
    const target = students.find((s) => s.id === id);
    const updated = students.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s
    );
    setStudents(updated);
    localStorage.setItem("college_dating_all_users", JSON.stringify(updated));

    // Also update verification queue if linked
    const queueStatus: "pending" | "verified" | "rejected" =
      newStatus === "approved"
        ? "verified"
        : newStatus === "flagged"
        ? "rejected"
        : "pending";

    const updatedQueue = verificationQueue.map((item) =>
      item.id === id || (target?.email && item.email === target.email)
        ? { ...item, verificationStatus: queueStatus, status: queueStatus }
        : item
    );
    setVerificationQueue(updatedQueue);
    localStorage.setItem(
      "heartlink_admin_verification_queue",
      JSON.stringify(updatedQueue)
    );

    triggerToast(
      `${target?.alias || "Student"} moved to ${newStatus.toUpperCase()}!`
    );
  };

  // Delete / Ban Student Profile
  const deleteStudent = (id: string) => {
    const target = students.find((s) => s.id === id);
    const filtered = students.filter((s) => s.id !== id);
    setStudents(filtered);
    localStorage.setItem("college_dating_all_users", JSON.stringify(filtered));

    const filteredQueue = verificationQueue.filter((q) => q.id !== id);
    setVerificationQueue(filteredQueue);
    localStorage.setItem(
      "heartlink_admin_verification_queue",
      JSON.stringify(filteredQueue)
    );

    if (selectedStudentId === id && filtered.length > 0) {
      setSelectedStudentId(filtered[0].id);
    }
    triggerToast(`Banned & purged ${target?.alias || "student"} from CampusSpark.`);
  };

  // ============================================================================
  // LOGIN SCREEN
  // ============================================================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-600 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-pink-500/20">
              🎭
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Campus<span className="text-pink-500">Spark</span> Admin
              </h1>
              <p className="text-xs text-slate-400">Multi-Design Moderation Suite (18+)</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passcode === "admin123" || passcode === "1818") setIsUnlocked(true);
            }}
            className="space-y-4"
          >
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode: admin123"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
            >
              Unlock Admin Studio
            </button>
            <button
              type="button"
              onClick={() => setIsUnlocked(true)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition cursor-pointer"
            >
              Quick Dev Bypass →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingVerifications = verificationQueue.filter(
    (q) => q.verificationStatus === "pending" || q.status === "pending"
  );
  const pendingList = students.filter((s) => s.status === "pending");
  const approvedList = students.filter((s) => s.status === "approved");
  const flaggedList = students.filter((s) => s.status === "flagged");
  const inspectedStudent =
    students.find((s) => s.id === selectedStudentId) || students[0];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        designMode === "terminal"
          ? "bg-black text-emerald-50 font-mono"
          : "bg-slate-950 text-slate-100 font-sans"
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-violet-600 text-white text-xs font-semibold shadow-2xl">
          ✨ {toast}
        </div>
      )}

      {/* Fullscreen College ID Image Lightbox Modal */}
      {previewIdImage && (
        <div
          onClick={() => setPreviewIdImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-pink-400">
                🪪 Uploaded Student College ID Card
              </span>
              <button
                onClick={() => setPreviewIdImage(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>
            <img
              src={previewIdImage}
              alt="Full College ID"
              className="w-full max-h-96 object-contain rounded-2xl bg-black border border-slate-800"
            />
          </div>
        </div>
      )}

      {/* ======================================================================
          TOP UNIVERSAL DESIGN SWITCHER & NAVIGATION BAR
      ====================================================================== */}
      <header className="border-b border-slate-800/80 bg-slate-900/75 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-lg ${
                designMode === "terminal"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : "bg-gradient-to-tr from-pink-600 to-violet-600 shadow-pink-500/20"
              }`}
            >
              🎭
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">
                Campus
                <span
                  className={
                    designMode === "terminal" ? "text-emerald-400" : "text-pink-500"
                  }
                >
                  Spark
                </span>
              </span>
              <span className="ml-2 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                Admin Control
              </span>
            </div>
          </div>

          {/* Center Section Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              {
                id: "verifications",
                label: `🪪 ID Requests (${pendingVerifications.length})`,
              },
              { id: "students", label: `Students (${students.length})` },
              { id: "reports", label: `Flagged (${flaggedList.length})` },
              { id: "events", label: "Live Campus Config" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as ActiveSection)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeSection === tab.id
                    ? designMode === "terminal"
                      ? "bg-emerald-600 text-black"
                      : "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Live Design Theme Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">UI Design:</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: "bento", label: "✨ Neon Bento" },
                  { id: "kanban", label: "📋 Kanban" },
                  { id: "terminal", label: "🛡️ Cyber-Ops" },
                ] as { id: DesignMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setDesignMode(mode.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    designMode === mode.id
                      ? "bg-slate-800 text-pink-400 border border-pink-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <button
              onClick={syncFromCustomerApp}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition cursor-pointer"
              title="Refresh incoming verifications from Customer Page"
            >
              🔄 Sync Now
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================================
          MAIN CONTENT CONTAINER
      ====================================================================== */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Incoming ID Queue</p>
            <p className="text-3xl font-bold mt-1 text-amber-400">
              {pendingVerifications.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              From Customer Verification Gate
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Approved on Feed</p>
            <p className="text-3xl font-bold mt-1 text-emerald-400">{approvedList.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Visible in Blind Discovery</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Flagged Profiles</p>
            <p className="text-3xl font-bold mt-1 text-rose-400">{flaggedList.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Hidden from student swipe deck</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Mutual Reveal Rule</p>
            <p className="text-3xl font-bold mt-1 text-violet-400">{revealThreshold} msgs</p>
            <p className="text-[11px] text-slate-500 mt-1">Required before unmasking</p>
          </div>
        </div>

        {/* ====================================================================
            SECTION 0: INCOMING COLLEGE ID VERIFICATION REQUESTS (FROM CUSTOMER PAGE)
        ==================================================================== */}
        {activeSection === "verifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  🪪 Live College ID Verification Queue
                </h2>
                <p className="text-xs text-slate-400">
                  Every time a student submits their Email OTP, 10-digit Phone, Degree &amp; College ID on the Customer Page, it appears here immediately.
                </p>
              </div>
            </div>

            {verificationQueue.length === 0 ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
                <div className="text-4xl">🪪</div>
                <h3 className="font-bold text-base">No College ID Submissions Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Open the Customer Page, complete the Email OTP login, and upload a College ID card. It will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {verificationQueue.map((req) => {
                  const currentStatus = req.verificationStatus || req.status || "pending";
                  return (
                    <div
                      key={req.id}
                      className="bg-slate-900 border border-slate-800 hover:border-pink-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-pink-400">
                            {req.id}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
                              currentStatus === "verified"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : currentStatus === "pending"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-sm text-white truncate">{req.email}</p>
                          <p className="text-slate-300">
                            {req.year} • <span className="text-pink-400">{req.branch}</span>
                          </p>
                          <p className="text-slate-400">
                            Phone: <span className="font-mono">{req.phoneMasked}</span> • Submitted:{" "}
                            {req.submittedAt || "Just now"}
                          </p>
                        </div>

                        {/* Uploaded College ID Card Preview */}
                        {req.idCardImage && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Uploaded College ID Card:</span>
                              <button
                                onClick={() => setPreviewIdImage(req.idCardImage)}
                                className="text-pink-400 hover:underline cursor-pointer"
                              >
                                🔍 Enlarge ID
                              </button>
                            </div>
                            <img
                              src={req.idCardImage}
                              alt="Student College ID"
                              onClick={() => setPreviewIdImage(req.idCardImage)}
                              className="w-full h-36 object-cover rounded-2xl border border-slate-700 cursor-pointer hover:opacity-90 transition"
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex gap-2">
                        <button
                          onClick={() =>
                            handleVerifyDecision(req.id, req.email, "verified")
                          }
                          disabled={currentStatus === "verified"}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            currentStatus === "verified"
                              ? "bg-emerald-950 text-emerald-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg"
                          }`}
                        >
                          {currentStatus === "verified" ? "✓ Approved" : "✓ Approve ID"}
                        </button>
                        <button
                          onClick={() =>
                            handleVerifyDecision(req.id, req.email, "rejected")
                          }
                          disabled={currentStatus === "rejected"}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            SECTION 1: STUDENTS MODERATION (Renders in Chosen Design Mode)
        ==================================================================== */}
        {activeSection === "students" && (
          <>
            {/* DESIGN 1: NEON BENTO GRID */}
            {designMode === "bento" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {students.map((stu) => (
                  <div
                    key={stu.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-13 h-13 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl shadow-inner">
                            {stu.avatar}
                          </div>
                          <div>
                            <h3 className="font-bold text-base">{stu.alias}</h3>
                            <p className="text-xs text-slate-400">{stu.yearDept}</p>
                            {stu.email && (
                              <p className="text-[11px] text-slate-500">{stu.email}</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
                            stu.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : stu.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {stu.status}
                        </span>
                      </div>

                      {stu.idCardImage && (
                        <div className="mb-3">
                          <img
                            src={stu.idCardImage}
                            alt="College ID"
                            onClick={() => setPreviewIdImage(stu.idCardImage!)}
                            className="w-full h-28 object-cover rounded-xl border border-slate-700 cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-pink-400 font-semibold mb-1">
                          Student Confession Bio
                        </p>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          &ldquo;{stu.bio}&rdquo;
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {stu.interests.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                      {stu.status !== "approved" && (
                        <button
                          onClick={() => updateStudentStatus(stu.id, "approved")}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {stu.status !== "flagged" && (
                        <button
                          onClick={() => updateStudentStatus(stu.id, "flagged")}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold cursor-pointer"
                        >
                          Flag
                        </button>
                      )}
                      <button
                        onClick={() => deleteStudent(stu.id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                        title="Ban Student"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DESIGN 2: 3-COLUMN KANBAN PIPELINE BOARD */}
            {designMode === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(
                  [
                    {
                      key: "pending",
                      title: "⏳ Pending 18+ Verification",
                      color: "border-amber-500/40",
                      items: pendingList,
                    },
                    {
                      key: "approved",
                      title: "✅ Live on Student Feed",
                      color: "border-emerald-500/40",
                      items: approvedList,
                    },
                    {
                      key: "flagged",
                      title: "🚨 Flagged / Under Review",
                      color: "border-rose-500/40",
                      items: flaggedList,
                    },
                  ] as const
                ).map((col) => (
                  <div
                    key={col.key}
                    className={`bg-slate-900/70 border-t-4 ${col.color} border border-slate-800 rounded-2xl p-4 space-y-3`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="font-bold text-sm">{col.title}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800">
                        {col.items.length}
                      </span>
                    </div>

                    {col.items.map((stu) => (
                      <div
                        key={stu.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{stu.avatar}</span>
                            <div>
                              <p className="font-semibold text-sm">{stu.alias}</p>
                              <p className="text-[11px] text-slate-400">{stu.yearDept}</p>
                            </div>
                          </div>
                        </div>
                        {stu.idCardImage && (
                          <img
                            src={stu.idCardImage}
                            alt="College ID"
                            onClick={() => setPreviewIdImage(stu.idCardImage!)}
                            className="w-full h-24 object-cover rounded-lg border border-slate-700 cursor-pointer"
                          />
                        )}
                        <p className="text-xs text-slate-300 italic">&ldquo;{stu.bio}&rdquo;</p>
                        <div className="flex gap-1.5 pt-1">
                          {col.key !== "approved" && (
                            <button
                              onClick={() => updateStudentStatus(stu.id, "approved")}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold cursor-pointer"
                            >
                              Move to Approved
                            </button>
                          )}
                          {col.key !== "flagged" && (
                            <button
                              onClick={() => updateStudentStatus(stu.id, "flagged")}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-[11px] font-semibold cursor-pointer"
                            >
                              Flag
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* DESIGN 3: CYBER-SEC SPLIT INSPECTOR (TERMINAL MODE) */}
            {designMode === "terminal" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-slate-950 border border-emerald-500/30 rounded-2xl overflow-hidden">
                  <div className="p-3.5 bg-emerald-950/30 border-b border-emerald-500/30 text-xs text-emerald-300 font-bold">
                    &gt; CAMPUS_NODES_DIRECTORY // CLICK ROW TO INSPECT
                  </div>
                  <div className="divide-y divide-slate-800">
                    {students.map((stu) => (
                      <div
                        key={stu.id}
                        onClick={() => setSelectedStudentId(stu.id)}
                        className={`p-4 flex items-center justify-between cursor-pointer transition ${
                          selectedStudentId === stu.id
                            ? "bg-emerald-500/10 border-l-4 border-emerald-400"
                            : "hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{stu.avatar}</span>
                          <div>
                            <p className="text-sm font-bold text-emerald-200">{stu.alias}</p>
                            <p className="text-xs text-slate-400">
                              {stu.yearDept} • {stu.email || "verified@college.edu"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs uppercase px-2.5 py-1 rounded bg-slate-900 border border-slate-700">
                          [{stu.status}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {inspectedStudent && (
                  <div className="lg:col-span-5 bg-slate-950 border border-emerald-500/40 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-3xl">
                          {inspectedStudent.avatar}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-emerald-300">
                            {inspectedStudent.alias}
                          </h3>
                          <p className="text-xs text-slate-400">ID: {inspectedStudent.id}</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded">
                        18+ VERIFIED
                      </span>
                    </div>

                    {inspectedStudent.idCardImage && (
                      <img
                        src={inspectedStudent.idCardImage}
                        alt="College ID"
                        onClick={() => setPreviewIdImage(inspectedStudent.idCardImage!)}
                        className="w-full h-36 object-cover rounded-xl border border-emerald-500/40 cursor-pointer"
                      />
                    )}

                    <div className="space-y-2 text-xs">
                      <p className="text-slate-400">
                        DEPARTMENT:{" "}
                        <span className="text-slate-100">{inspectedStudent.yearDept}</span>
                      </p>
                      <p className="text-slate-400">
                        EMAIL:{" "}
                        <span className="text-slate-100">
                          {inspectedStudent.email || "verified@college.edu"}
                        </span>
                      </p>
                      <p className="text-slate-400">
                        CONFESSION BIO:{" "}
                        <span className="text-emerald-200">&ldquo;{inspectedStudent.bio}&rdquo;</span>
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => updateStudentStatus(inspectedStudent.id, "approved")}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                      >
                        [APPROVE_NODE]
                      </button>
                      <button
                        onClick={() => updateStudentStatus(inspectedStudent.id, "flagged")}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer"
                      >
                        [FLAG_NODE]
                      </button>
                      <button
                        onClick={() => deleteStudent(inspectedStudent.id)}
                        className="px-4 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-pointer"
                      >
                        [PURGE]
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ====================================================================
            SECTION 2: FLAGGED & SAFETY QUEUE
        ==================================================================== */}
        {activeSection === "reports" && (
          <div className="space-y-4">
            {flaggedList.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                Zero flagged student profiles right now!
              </div>
            ) : (
              flaggedList.map((stu) => (
                <div
                  key={stu.id}
                  className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl">
                      {stu.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-rose-400">{stu.alias}</h3>
                      <p className="text-xs text-slate-400">{stu.yearDept}</p>
                      <p className="text-xs text-slate-200 mt-1">&ldquo;{stu.bio}&rdquo;</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStudentStatus(stu.id, "approved")}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-xs font-semibold cursor-pointer"
                    >
                      Restore to Feed
                    </button>
                    <button
                      onClick={() => deleteStudent(stu.id)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold cursor-pointer"
                    >
                      Permanent Ban
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====================================================================
            SECTION 3: LIVE CAMPUS EVENT & ICEBREAKER CONTROLS
        ==================================================================== */}
        {activeSection === "events" && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="font-bold text-base mb-1">Daily Campus Icebreaker Prompt</h3>
              <p className="text-xs text-slate-400 mb-3">
                Displayed on your friend&apos;s Student Onboarding &amp; Chat screens.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={icebreaker}
                  onChange={(e) => setIcebreaker(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                />
                <button
                  onClick={() => {
                    localStorage.setItem("campus_spark_icebreaker", icebreaker);
                    triggerToast("Campus Icebreaker synced!");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 text-xs font-semibold cursor-pointer"
                >
                  Publish
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>Messages Required Before &ldquo;Request Reveal&rdquo; Unlocks</span>
                <span className="text-pink-400">{revealThreshold} messages</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={revealThreshold}
                onChange={(e) => setRevealThreshold(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">⚡ 9:00 PM Blind Speed-Dating Mode</p>
                <p className="text-xs text-slate-400">
                  Pairs online college students for 5-minute anonymous chats.
                </p>
              </div>
              <button
                onClick={() => {
                  setSpeedDatingLive(!speedDatingLive);
                  triggerToast(
                    !speedDatingLive
                      ? "Blind Speed-Dating is LIVE!"
                      : "Speed-Dating Lobby closed."
                  );
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  speedDatingLive
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {speedDatingLive ? "Stop Event" : "Start Live Lobby"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}