"use client";

import React, { useState, useEffect, useCallback } from "react";

// ============================================================================
// SHARED INTERFACES & COLLEGE LISTS
// ============================================================================
export interface StudentAccount {
  id: string;
  email: string;
  phone?: string;
  phoneMasked: string;
  phoneHash: string;
  branch: string;
  year: string;
  collegeName?: string;
  baseLocation?: "Bangalore" | "Mysore";
  fullName?: string;
  gender?: "Male" | "Female" | "Other";
  authProvider: "google_oauth" | "email_otp";
  idCardFrontImage: string;
  idCardBackImage: string;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected" | "blocked";
  status?: "pending" | "verified" | "rejected" | "blocked" | "flagged";
  submittedAt?: string;
  isDuplicateId?: boolean;
}

export interface StudentProfile {
  id: string;
  alias: string;
  avatar: string;
  yearDept: string;
  bio: string;
  interests: string[];
  compatibility?: number;
  status: "pending" | "approved" | "flagged" | "blocked";
  dob?: string;
  email?: string;
  phone?: string;
  collegeName?: string;
  baseLocation?: "Bangalore" | "Mysore";
  fullName?: string;
  gender?: "Male" | "Female" | "Other";
  idCardFrontImage?: string;
  idCardBackImage?: string;
}

export interface ChatReport {
  id: string;
  reporterAlias: string;
  reportedStudentId: string;
  reportedStudentName: string;
  reportedAlias: string;
  offensiveText: string;
  timestamp: string;
}

type DesignMode = "kanban" | "terminal" | "obsidian";
type ActiveSection = "verifications" | "students" | "flagged_apps" | "reports" | "blocked" | "events";

const BANGALORE_COLLEGES = [
  "RV College of Engineering (RVCE)",
  "BMS College of Engineering (BMSCE)",
  "M.S. Ramaiah Institute of Technology (MSRIT)",
  "PES University (PESU)",
  "BMS Institute of Technology and Management (BMSIT)",
  "Bangalore Institute of Technology (BIT)",
  "Dayananda Sagar College of Engineering (DSCE)",
  "Nitte Meenakshi Institute of Technology (NMIT)",
  "New Horizon College of Engineering (NHCE)",
  "CMR Institute of Technology (CMRIT)",
  "B.M.S. College for Women",
  "Acharya Institute of Technology",
  "Alliance University",
  "Atria Institute of Technology",
  "Christ University",
  "CMR University",
  "Dayananda Sagar University",
  "Don Bosco Institute of Technology",
  "Dr. Ambedkar Institute of Technology (Dr. AIT)",
  "East West Institute of Technology",
  "Global Academy of Technology",
  "HKBK College of Engineering",
  "Jain University",
  "JSS Academy of Technical Education",
  "K.S. Institute of Technology",
  "Kristu Jayanti College",
  "MS Ramaiah University of Applied Sciences",
  "MVJ College of Engineering",
  "Oxford College of Engineering",
  "Presidency University",
  "Reva University",
  "Sambhram Institute of Technology",
  "Sapthagiri College of Engineering",
  "Sir M. Visvesvaraya Institute of Technology (Sir MVIT)",
  "St. Joseph's University",
  "T. John Institute of Technology",
  "Vemana Institute of Technology",
  "RNS Institute of Technology (RNSIT)",
  "East Point College of Engineering and Technology",
  "ACS College of Engineering",
];

const MYSORE_COLLEGES = [
  "National Institute of Engineering (NIE Mysore)",
  "JSS Science and Technology University (SJCE Mysore)",
  "Vidya Vardhaka College of Engineering (VVCE Mysore)",
  "Mysore College of Engineering and Management (MYCEM)",
  "GSSS Institute of Engineering and Technology for Women",
  "Maharaja's College Mysore",
  "Yuvaraja's College Mysore",
  "JSS College of Arts, Commerce and Science",
  "St. Philomena's College Mysore",
  "All India Institute of Speech and Hearing (AIISH)",
  "Maharani's Science College for Women Mysore",
  "Mysore Medical College and Research Institute (MMCRI)",
  "Cauvery Institute of Technology",
  "Sharada Vilas Centenary Educational Institution",
];

const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: "stu_101",
    alias: "MidnightCoder",
    avatar: "🦉",
    yearDept: "3rd Year • CS",
    bio: "Surviving on cold brew and last-minute assignments.",
    interests: ["Indie Music", "Hackathons"],
    compatibility: 94,
    status: "approved",
    dob: "2005-06-15",
    fullName: "Tejas",
    gender: "Male",
    collegeName: "BMS College of Engineering (BMSCE)",
    baseLocation: "Bangalore",
    email: "tejas1@college.edu",
    phone: "9876543210",
    idCardFrontImage: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600",
    idCardBackImage: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600",
  },
];

const INITIAL_REPORTS: ChatReport[] = [
  {
    id: "rep_1",
    reporterAlias: "CosmicRhythm",
    reportedStudentId: "stu_101",
    reportedStudentName: "Tejas",
    reportedAlias: "MidnightCoder",
    offensiveText: "Sending inappropriate messages during anonymous chat.",
    timestamp: "10:42 AM",
  },
];

export default function AdminDashboardVariants() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [designMode, setDesignMode] = useState<DesignMode>("obsidian");
  const [activeSection, setActiveSection] = useState<ActiveSection>("verifications");

  const [students, setStudents] = useState<StudentProfile[]>(INITIAL_STUDENTS);
  const [verificationQueue, setVerificationQueue] = useState<StudentAccount[]>([]);
  const [chatReports, setChatReports] = useState<ChatReport[]>(INITIAL_REPORTS);
  const [previewIdImage, setPreviewIdImage] = useState<string | null>(null);
  
  // Modals
  const [sameNameModalData, setSameNameModalData] = useState<{ applicant: StudentAccount; matches: StudentProfile[] } | null>(null);
  const [modalFlaggedStudent, setModalFlaggedStudent] = useState<StudentProfile | null>(null);
  const [modalBlockedStudent, setModalBlockedStudent] = useState<StudentProfile | null>(null);
  const [managedStudent, setManagedStudent] = useState<StudentProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const [filterCollege, setFilterCollege] = useState<string>("All");
  const [filterGender, setFilterGender] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name");

  const [icebreaker, setIcebreaker] = useState<string>(
    "What is your most controversial campus canteen food opinion?"
  );

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const syncFromCustomerApp = useCallback(() => {
    const rawQueue = localStorage.getItem("heartlink_admin_verification_queue");
    const savedUsers = localStorage.getItem("college_dating_all_users");
    const rawReports = localStorage.getItem("heartlink_chat_reports");

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
        // Ignore
      }
    }

    if (rawQueue) {
      try {
        const parsedQueue: StudentAccount[] = JSON.parse(rawQueue);
        setVerificationQueue(parsedQueue);
      } catch {
        setVerificationQueue([]);
      }
    }

    if (rawReports) {
      try {
        const parsedReports: ChatReport[] = JSON.parse(rawReports);
        setChatReports(parsedReports);
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    syncFromCustomerApp();
    const handleStorageChange = () => syncFromCustomerApp();
    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(syncFromCustomerApp, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [syncFromCustomerApp]);

  const handleVerifyDecision = (
    ticketId: string,
    email: string,
    decision: "verified" | "rejected"
  ) => {
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
        ? `Approved College ID for ${email}!`
        : `Rejected College ID for ${email}.`
    );
  };

  const restoreStudentToQueue = (id: string) => {
    const updatedStudents = students.map((s) =>
      s.id === id ? { ...s, status: "pending" as const } : s
    );
    setStudents(updatedStudents);
    localStorage.setItem("college_dating_all_users", JSON.stringify(updatedStudents));

    const rawQueue = localStorage.getItem("heartlink_admin_verification_queue");
    if (rawQueue) {
      try {
        const q: StudentAccount[] = JSON.parse(rawQueue);
        const updatedQ = q.map((item) =>
          item.id === id
            ? { ...item, verificationStatus: "pending" as const, status: "pending" as const }
            : item
        );
        setVerificationQueue(updatedQ);
        localStorage.setItem("heartlink_admin_verification_queue", JSON.stringify(updatedQ));
      } catch {
        // Ignore
      }
    }

    setModalFlaggedStudent(null);
    triggerToast("Student sent back to ID Requests queue for re-verification!");
  };

  const blockStudent = (id: string) => {
    const updatedStudents = students.map((s) =>
      s.id === id ? { ...s, status: "blocked" as const } : s
    );
    setStudents(updatedStudents);
    localStorage.setItem("college_dating_all_users", JSON.stringify(updatedStudents));

    const rawQueue = localStorage.getItem("heartlink_admin_verification_queue");
    if (rawQueue) {
      try {
        const q: StudentAccount[] = JSON.parse(rawQueue);
        const updatedQ = q.map((item) =>
          item.id === id
            ? { ...item, verificationStatus: "blocked" as const, status: "blocked" as const }
            : item
        );
        setVerificationQueue(updatedQ);
        localStorage.setItem("heartlink_admin_verification_queue", JSON.stringify(updatedQ));
      } catch {
        // Ignore
      }
    }

    setManagedStudent(null);
    setModalBlockedStudent(null);
    triggerToast("Student ID has been permanently blocked.");
  };

  const unblockStudent = (id: string) => {
    const updatedStudents = students.map((s) =>
      s.id === id ? { ...s, status: "approved" as const } : s
    );
    setStudents(updatedStudents);
    localStorage.setItem("college_dating_all_users", JSON.stringify(updatedStudents));

    setModalBlockedStudent(null);
    triggerToast("Student unblocked and restored to active directory.");
  };

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

    setManagedStudent(null);
    setModalFlaggedStudent(null);
    setModalBlockedStudent(null);
    triggerToast(`Permanently deleted ${target?.fullName || "student"}.`);
  };

  const simulateNewStudent = () => {
    const avatars = ["🦋", "⚡", "🌙", "🔥", "🦊", "🦉"];
    const randomNum = Math.floor(Math.random() * 89 + 10);
    const newStu: StudentProfile = {
      id: `stu_${Date.now()}`,
      alias: `TejasSpark${randomNum}`,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      yearDept: "3rd Year • B.Tech CSE",
      bio: "Tech enthusiast looking for study partners.",
      interests: ["Coding", "Robotics"],
      compatibility: 95,
      status: "pending",
      dob: "2005-04-12",
      fullName: `Tejas`,
      gender: "Male",
      collegeName: "BMS College of Engineering (BMSCE)",
      baseLocation: "Bangalore",
      email: `tejas${randomNum}@college.edu`,
      phone: `98765${randomNum}12`,
    };
    const nextList = [newStu, ...students];
    setStudents(nextList);
    localStorage.setItem("college_dating_all_users", JSON.stringify(nextList));

    const queueEntry: StudentAccount = {
      id: newStu.id,
      email: newStu.email || "",
      phone: newStu.phone,
      phoneMasked: `******${(newStu.phone || "").slice(-4)}`,
      phoneHash: `HASH_${randomNum}`,
      branch: "B.Tech CSE",
      year: "3rd Year",
      collegeName: newStu.collegeName,
      baseLocation: newStu.baseLocation,
      fullName: newStu.fullName,
      gender: newStu.gender,
      authProvider: "email_otp",
      idCardFrontImage: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600",
      idCardBackImage: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600",
      verificationStatus: "pending",
      status: "pending",
      submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextQueue = [queueEntry, ...verificationQueue];
    setVerificationQueue(nextQueue);
    localStorage.setItem("heartlink_admin_verification_queue", JSON.stringify(nextQueue));

    triggerToast(`Simulated new student ${newStu.fullName} added to queue!`);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-600 to-violet-600 flex items-center justify-center text-xl shadow-lg">
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm shadow-lg cursor-pointer transition"
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
    (q) => (q.verificationStatus || q.status || "pending") === "pending"
  );
  const approvedList = students.filter((s) => s.status === "approved");
  const flaggedList = students.filter((s) => s.status === "flagged");
  const blockedList = students.filter((s) => s.status === "blocked");

  const availableCollegesForFilter =
    filterLocation === "Bangalore"
      ? BANGALORE_COLLEGES
      : filterLocation === "Mysore"
      ? MYSORE_COLLEGES
      : [...BANGALORE_COLLEGES, ...MYSORE_COLLEGES];

  const filteredStudents = students.filter((stu) => {
    if (stu.status === "blocked") return false;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (stu.fullName || "").toLowerCase().includes(q) ||
      (stu.email || "").toLowerCase().includes(q) ||
      (stu.phone || "").toLowerCase().includes(q) ||
      (stu.collegeName || "").toLowerCase().includes(q) ||
      (stu.baseLocation || "").toLowerCase().includes(q) ||
      (stu.alias || "").toLowerCase().includes(q) ||
      (stu.gender || "").toLowerCase().includes(q) ||
      (stu.yearDept || "").toLowerCase().includes(q);

    const matchLocation = filterLocation === "All" || stu.baseLocation === filterLocation;
    const matchCollege = filterCollege === "All" || stu.collegeName === filterCollege;
    const matchGender = filterGender === "All" || stu.gender === filterGender;

    return matchSearch && matchLocation && matchCollege && matchGender;
  }).sort((a, b) => {
    if (sortBy === "name") {
      return (a.fullName || "").localeCompare(b.fullName || "");
    } else if (sortBy === "college") {
      return (a.collegeName || "").localeCompare(b.collegeName || "");
    } else if (sortBy === "location") {
      return (a.baseLocation || "").localeCompare(b.baseLocation || "");
    }
    return 0;
  });

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        designMode === "terminal"
          ? "bg-black text-emerald-50 font-mono"
          : "bg-slate-950 text-slate-100 font-sans"
      }`}
    >
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-violet-600 text-white text-xs font-semibold shadow-2xl">
          ✨ {toast}
        </div>
      )}

      {/* Lightbox Modal */}
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
              <span className="text-xs font-bold uppercase text-pink-400">🪪 College ID Preview</span>
              <button onClick={() => setPreviewIdImage(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>
            <img src={previewIdImage} alt="Full College ID" className="w-full max-h-96 object-contain rounded-2xl bg-black border border-slate-800" />
          </div>
        </div>
      )}

      {/* Manage Student Modal */}
      {managedStudent && (
        <div
          onClick={() => setManagedStudent(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-pink-400">⚙️ Manage Student Details</h3>
              <button onClick={() => setManagedStudent(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{managedStudent.avatar}</span>
                <div>
                  <h4 className="font-bold text-sm text-white">{managedStudent.fullName} ({managedStudent.gender})</h4>
                  <p className="text-slate-400">Username: @{managedStudent.alias}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p><strong>Email:</strong> {managedStudent.email || "N/A"}</p>
                <p><strong>Mobile:</strong> {managedStudent.phone || "N/A"}</p>
                <p><strong>College:</strong> {managedStudent.collegeName || "N/A"}</p>
                <p><strong>Base Location:</strong> 📍 {managedStudent.baseLocation || "Bangalore"}</p>
                <p><strong>Department &amp; Year:</strong> {managedStudent.yearDept}</p>
                <p><strong>Account Status:</strong> <span className="uppercase text-emerald-400 font-bold">{managedStudent.status}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {managedStudent.idCardFrontImage && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Front ID:</span>
                    <img src={managedStudent.idCardFrontImage} alt="Front ID" onClick={() => setPreviewIdImage(managedStudent.idCardFrontImage || null)} className="w-full h-24 object-cover rounded-xl cursor-pointer border border-slate-700" />
                  </div>
                )}
                {managedStudent.idCardBackImage && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Back ID:</span>
                    <img src={managedStudent.idCardBackImage} alt="Back ID" onClick={() => setPreviewIdImage(managedStudent.idCardBackImage || null)} className="w-full h-24 object-cover rounded-xl cursor-pointer border border-slate-700" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => blockStudent(managedStudent.id)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                🚨 Block ID (Permanent Chat Block)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Same Name Modal */}
      {sameNameModalData && (
        <div
          onClick={() => setSameNameModalData(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-amber-400">
                  👥 Manual Comparison: Existing Students Named &quot;{sameNameModalData.applicant.fullName}&quot;
                </h3>
                <p className="text-[11px] text-slate-400">Matching fields between applicant and existing records are highlighted in yellow.</p>
              </div>
              <button onClick={() => setSameNameModalData(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>

            <div className="bg-slate-950 border border-pink-500/30 p-4 rounded-2xl space-y-1 text-xs">
              <p className="text-pink-400 font-bold uppercase">New Applicant Details:</p>
              <p><strong>Name:</strong> {sameNameModalData.applicant.fullName}</p>
              <p><strong>College:</strong> {sameNameModalData.applicant.collegeName}</p>
              <p><strong>Location:</strong> {sameNameModalData.applicant.baseLocation}</p>
              <p><strong>Gender:</strong> {sameNameModalData.applicant.gender}</p>
            </div>

            <div className="space-y-4">
              {sameNameModalData.matches.map((st, i) => {
                const isCollegeMatch = st.collegeName === sameNameModalData.applicant.collegeName;
                const isLocationMatch = st.baseLocation === sameNameModalData.applicant.baseLocation;
                const isGenderMatch = st.gender === sameNameModalData.applicant.gender;

                return (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-white">
                      <span>Existing Record #{i + 1}: {st.fullName}</span>
                      <span className="text-pink-400">{st.email}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p className={`p-1.5 rounded ${isCollegeMatch ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "text-slate-300"}`}>
                        College: {st.collegeName || "N/A"} {isCollegeMatch && "✨ (Match)"}
                      </p>
                      <p className={`p-1.5 rounded ${isLocationMatch ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "text-slate-300"}`}>
                        Location: {st.baseLocation || "N/A"} {isLocationMatch && "✨ (Match)"}
                      </p>
                      <p className={`p-1.5 rounded ${isGenderMatch ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "text-slate-300"}`}>
                        Gender: {st.gender || "N/A"} {isGenderMatch && "✨ (Match)"}
                      </p>
                      <p className="text-slate-400">Phone: {st.phone || "N/A"}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="text-[11px] text-slate-400 mb-1.5">Existing Student ID Cards (For Verification):</p>
                      <div className="grid grid-cols-2 gap-2">
                        {st.idCardFrontImage && (
                          <div>
                            <span className="text-[10px] text-slate-500">Front ID:</span>
                            <img src={st.idCardFrontImage} alt="Existing Front ID" onClick={() => setPreviewIdImage(st.idCardFrontImage || null)} className="w-full h-24 object-cover rounded-xl cursor-pointer border border-slate-700 hover:border-pink-500 transition" />
                          </div>
                        )}
                        {st.idCardBackImage && (
                          <div>
                            <span className="text-[10px] text-slate-500">Back ID:</span>
                            <img src={st.idCardBackImage} alt="Existing Back ID" onClick={() => setPreviewIdImage(st.idCardBackImage || null)} className="w-full h-24 object-cover rounded-xl cursor-pointer border border-slate-700 hover:border-pink-500 transition" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Flagged Modal */}
      {modalFlaggedStudent && (
        <div
          onClick={() => setModalFlaggedStudent(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-rose-400">❌ Rejected / Flagged Student Details</h3>
              <button onClick={() => setModalFlaggedStudent(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>

            <div className="space-y-3 text-xs">
              <p><strong>Full Name:</strong> {modalFlaggedStudent.fullName || "N/A"} ({modalFlaggedStudent.gender})</p>
              <p><strong>Email:</strong> {modalFlaggedStudent.email || "N/A"}</p>
              <p><strong>Mobile:</strong> {modalFlaggedStudent.phone || "N/A"}</p>
              <p><strong>College:</strong> {modalFlaggedStudent.collegeName || "N/A"} ({modalFlaggedStudent.baseLocation})</p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {modalFlaggedStudent.idCardFrontImage && (
                  <div>
                    <p className="text-slate-400 mb-1">Front ID:</p>
                    <img src={modalFlaggedStudent.idCardFrontImage} alt="Front ID" onClick={() => setPreviewIdImage(modalFlaggedStudent.idCardFrontImage || null)} className="w-full h-24 object-cover rounded-xl cursor-pointer border border-slate-700" />
                  </div>
                )}
                {modalFlaggedStudent.idCardBackImage && (
                  <div>
                    <p className="text-slate-400 mb-1">Back ID:</p>
                    <img src={modalFlaggedStudent.idCardBackImage} alt="Back ID" onClick={() => setPreviewIdImage(modalFlaggedStudent.idCardBackImage || null)} className="w-full h-24 object-cover rounded-xl cursor-pointer border border-slate-700" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => restoreStudentToQueue(modalFlaggedStudent.id)}
                className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                ♻️ Restore to ID Requests
              </button>
              <button
                onClick={() => deleteStudent(modalFlaggedStudent.id)}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Modal */}
      {modalBlockedStudent && (
        <div
          onClick={() => setModalBlockedStudent(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-rose-500">🚨 Blocked Student Record</h3>
              <button onClick={() => setModalBlockedStudent(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>

            <div className="space-y-3 text-xs">
              <p><strong>Full Name:</strong> {modalBlockedStudent.fullName || "N/A"} ({modalBlockedStudent.gender})</p>
              <p><strong>Email:</strong> {modalBlockedStudent.email || "N/A"}</p>
              <p><strong>Mobile:</strong> {modalBlockedStudent.phone || "N/A"}</p>
              <p><strong>College:</strong> {modalBlockedStudent.collegeName || "N/A"} ({modalBlockedStudent.baseLocation})</p>
              <p className="text-rose-400 font-semibold">Status: Permanently Blocked due to chat reports.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => unblockStudent(modalBlockedStudent.id)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                ♻️ Unblock Student
              </button>
              <button
                onClick={() => deleteStudent(modalBlockedStudent.id)}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER & DESIGN MODES */}
      <header className="border-b border-slate-800/80 bg-slate-900/75 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
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

          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: "verifications", label: `🪪 ID Requests (${pendingVerifications.length})` },
              { id: "students", label: `Students (${filteredStudents.length})` },
              { id: "reports", label: `🚩 Flagged (${flaggedList.length})` },
              { id: "blocked", label: `🚨 Reports & Blocked (${chatReports.length + blockedList.length})` },
              { id: "events", label: "Config" },
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

          {/* Design Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">UI Design:</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: "obsidian", label: "💎 Obsidian" },
                  { id: "kanban", label: "📋 Kanban" },
                  { id: "terminal", label: "🛡️ Terminal" },
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
            >
              🔄 Sync Now
            </button>
          </div>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Pending ID Queue</p>
            <p className="text-3xl font-bold mt-1 text-amber-400">{pendingVerifications.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Approved Students</p>
            <p className="text-3xl font-bold mt-1 text-emerald-400">{approvedList.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Flagged / Rejected</p>
            <p className="text-3xl font-bold mt-1 text-rose-400">{flaggedList.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Chat Reports</p>
            <p className="text-3xl font-bold mt-1 text-red-500">{chatReports.length}</p>
          </div>
        </div>

        {/* VERIFICATION QUEUE */}
        {activeSection === "verifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">🪪 Manual Student ID &amp; Name Verification Queue</h2>
                <p className="text-xs text-slate-400">
                  Review submissions. If multiple students share the exact same name, click the warning button to inspect their records side-by-side.
                </p>
              </div>
              <button
                onClick={simulateNewStudent}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-pink-400 border border-slate-700 cursor-pointer"
              >
                + Simulate Student Signup (Tejas)
              </button>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center space-y-2 shadow-xl">
                <div className="text-4xl">✨</div>
                <h3 className="font-bold text-base">All Caught Up!</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No pending student ID cards waiting for review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pendingVerifications.map((req) => {
                  const currentName = req.fullName ? req.fullName.trim().toLowerCase() : "";
                  const matchingStudents = students.filter(
                    (s) => s.fullName && s.fullName.trim().toLowerCase() === currentName && s.id !== req.id
                  );
                  const matchCount = matchingStudents.length;

                  return (
                    <div
                      key={req.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-pink-400">
                            {req.id}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Manual Verification
                          </span>
                        </div>

                        {matchCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setSameNameModalData({ applicant: req, matches: matchingStudents })}
                            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between cursor-pointer hover:bg-amber-500/30 transition shadow"
                          >
                            <span>⚠️ View {matchCount} other student(s) named &quot;{req.fullName}&quot;</span>
                            <span>🔍 Open</span>
                          </button>
                        )}

                        <div className="space-y-1.5 text-xs">
                          <p className="font-bold text-sm text-white">{req.fullName || "N/A"} ({req.gender || "N/A"})</p>
                          <p className="text-slate-300">Email: <strong className="text-white">{req.email}</strong></p>
                          <p className="text-slate-300">
                            Base Location: <strong className="text-pink-400">📍 {req.baseLocation || "Bangalore"}</strong>
                          </p>
                          <p className="text-slate-300">
                            College Name: <strong className="text-white">{req.collegeName || "N/A"}</strong>
                          </p>
                          <p className="text-slate-300">
                            Mobile: <strong className="text-emerald-400 font-mono">{req.phone || "N/A"}</strong>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {req.idCardFrontImage && (
                            <div>
                              <p className="text-[10px] text-slate-400 mb-1">Front ID:</p>
                              <img src={req.idCardFrontImage} alt="Front ID" onClick={() => setPreviewIdImage(req.idCardFrontImage)} className="w-full h-24 object-cover rounded-xl border border-slate-700 cursor-pointer" />
                            </div>
                          )}
                          {req.idCardBackImage && (
                            <div>
                              <p className="text-[10px] text-slate-400 mb-1">Back ID:</p>
                              <img src={req.idCardBackImage} alt="Back ID" onClick={() => setPreviewIdImage(req.idCardBackImage)} className="w-full h-24 object-cover rounded-xl border border-slate-700 cursor-pointer" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex gap-2">
                        <button
                          onClick={() => handleVerifyDecision(req.id, req.email, "verified")}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleVerifyDecision(req.id, req.email, "rejected")}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                        >
                          ✕ Reject (Flag)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STUDENTS DIRECTORY WITH CASCADING FILTERS */}
        {activeSection === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search name, email, mobile..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-slate-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="name">Name</option>
                    <option value="college">College Name</option>
                    <option value="location">Location</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-pink-400">📍 1. Location:</span>
                  <select
                    value={filterLocation}
                    onChange={(e) => {
                      setFilterLocation(e.target.value);
                      setFilterCollege("All");
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="All">All Locations</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Mysore">Mysore</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-pink-400">🏛️ 2. College:</span>
                  <select
                    value={filterCollege}
                    onChange={(e) => setFilterCollege(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white max-w-xs truncate"
                  >
                    <option value="All">All Colleges {filterLocation !== "All" ? `in ${filterLocation}` : ""}</option>
                    {availableCollegesForFilter.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-pink-400">⚧️ 3. Gender:</span>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredStudents.length === 0 ? (
                <div className="col-span-full bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  No matching student records found.
                </div>
              ) : (
                filteredStudents.map((stu) => (
                  <div key={stu.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{stu.avatar}</span>
                        <div>
                          <h3 className="font-bold text-sm">@{stu.alias}</h3>
                          <p className="text-xs text-slate-400">{stu.yearDept}</p>
                          <p className="text-xs text-pink-400 font-semibold mt-0.5">📍 {stu.baseLocation || "Bangalore"}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1 pt-1">
                        <p><strong>Name:</strong> {stu.fullName || "N/A"} ({stu.gender || "N/A"})</p>
                        <p><strong>Email:</strong> <span className="text-white">{stu.email || "N/A"}</span></p>
                        <p><strong>College:</strong> {stu.collegeName || "N/A"}</p>
                        <p className="text-emerald-400 font-mono"><strong>Mobile:</strong> {stu.phone || "N/A"}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setManagedStudent(stu)}
                        className="w-full py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
                      >
                        ⚙️ Manage Student
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* FLAGGED / REJECTED SECTION */}
        {activeSection === "reports" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">🚩 Flagged / Rejected ID Applications</h2>
              <p className="text-xs text-slate-400">Click on any student card to inspect details or send them back to ID Requests for re-verification.</p>
            </div>

            {flaggedList.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">Zero flagged profiles.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {flaggedList.map((stu) => (
                  <div key={stu.id} className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 space-y-3 shadow-lg">
                    <div onClick={() => setModalFlaggedStudent(stu)} className="cursor-pointer space-y-1">
                      <h3 className="font-bold text-rose-400 text-sm hover:underline">
                        👤 {stu.fullName || stu.alias} ({stu.gender})
                      </h3>
                      <p className="text-xs text-slate-400">📍 {stu.baseLocation || "Bangalore"} • {stu.collegeName}</p>
                      <p className="text-[11px] text-slate-500">Click to view full entry details</p>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => restoreStudentToQueue(stu.id)}
                        className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
                      >
                        ♻️ Send Back to ID Requests
                      </button>
                      <button
                        onClick={() => setModalFlaggedStudent(stu)}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTS & BLOCKED STUDENTS SECTION */}
        {activeSection === "blocked" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">🚨 Chat Reports &amp; Blocked Students</h2>
              <p className="text-xs text-slate-400">Review user chat reports below. You can permanently block offenders or inspect their records.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400">💬 Active Chat Reports ({chatReports.length})</h3>
              {chatReports.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">No active chat reports.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chatReports.map((rep) => {
                    const offendingStudent = students.find((s) => s.id === rep.reportedStudentId);
                    return (
                      <div key={rep.id} className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-300">
                          <span>Reported: {rep.reportedStudentName} (@{rep.reportedAlias})</span>
                          <span className="text-[10px] text-slate-400">{rep.timestamp}</span>
                        </div>
                        <p className="text-slate-300"><strong>Reported By:</strong> {rep.reporterAlias}</p>
                        <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-rose-300 font-mono">
                          &ldquo;{rep.offensiveText}&rdquo;
                        </p>
                        {offendingStudent && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => blockStudent(offendingStudent.id)}
                              className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl font-semibold text-white cursor-pointer"
                            >
                              🚨 Block Student ID Now
                            </button>
                            <button
                              onClick={() => setManagedStudent(offendingStudent)}
                              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer"
                            >
                              Manage
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-rose-500">🚫 Permanently Blocked ID Records ({blockedList.length})</h3>
              {blockedList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">Zero blocked profiles.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {blockedList.map((stu) => (
                    <div key={stu.id} className="bg-slate-900 border border-red-500/40 rounded-2xl p-5 space-y-3 shadow-lg">
                      <div onClick={() => setModalBlockedStudent(stu)} className="cursor-pointer space-y-1">
                        <h3 className="font-bold text-red-400 text-sm hover:underline">
                          🚨 {stu.fullName || stu.alias} ({stu.gender})
                        </h3>
                        <p className="text-xs text-slate-400">📍 {stu.baseLocation || "Bangalore"} • {stu.collegeName}</p>
                        <p className="text-[11px] text-red-300/80">Permanently Blocked</p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => unblockStudent(stu.id)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
                        >
                          ♻️ Unblock Student
                        </button>
                        <button
                          onClick={() => setModalBlockedStudent(stu)}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONFIG SECTION */}
        {activeSection === "events" && (
          <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-base">Campus Icebreaker Prompt</h3>
            <input type="text" value={icebreaker} onChange={(e) => setIcebreaker(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            <button onClick={() => triggerToast("Published!")} className="px-4 py-2 bg-pink-600 text-white rounded-xl text-xs cursor-pointer">Publish</button>
          </div>
        )}
      </main>
    </div>
  );
}