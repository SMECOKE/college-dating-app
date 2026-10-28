"use client";

import React, { useState, useEffect, useCallback } from "react";

// ============================================================================
// TYPESCRIPT INTERFACES
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
  email?: string;
  phoneMasked?: string;
  idCardImage?: string;
}

export interface ChatMessage {
  id: string;
  senderAlias: string;
  text: string;
  timestamp: string;
}

// ============================================================================
// 74 COMPREHENSIVE DEGREES & DEPARTMENTS
// ============================================================================
const DEGREES_DEPARTMENTS = [
  "B.Tech — CSE (Computer Science & Engineering)",
  "B.Tech — CSE (AI & Machine Learning)",
  "B.Tech — CSE (Data Science)",
  "B.Tech — CSE (Cyber Security)",
  "B.Tech — CSE (IoT & Cloud Computing)",
  "B.Tech — IT (Information Technology)",
  "B.Tech — ISE (Information Science & Engineering)",
  "B.Tech — ECE (Electronics & Communication)",
  "B.Tech — EEE (Electrical & Electronics)",
  "B.Tech — Electrical Engineering",
  "B.Tech — Mechanical Engineering",
  "B.Tech — Civil Engineering",
  "B.Tech — Aerospace / Aeronautical Engineering",
  "B.Tech — Automobile Engineering",
  "B.Tech — Mechatronics & Robotics",
  "B.Tech — Chemical Engineering",
  "B.Tech — Biotechnology",
  "B.Tech — Biomedical Engineering",
  "B.Tech — Agricultural Engineering",
  "B.Tech — Environmental Engineering",
  "B.Tech — Food Technology",
  "B.Tech — Industrial & Production Engineering",
  "B.Tech — Instrumentation & Control",
  "B.Tech — Marine Engineering",
  "B.Tech — Metallurgical & Materials Engineering",
  "B.Tech — Mining Engineering",
  "B.Tech — Petroleum Engineering",
  "B.Tech — Textile Technology",
  "M.Tech / M.E. (Postgraduate Engineering)",
  "BCA (Bachelor of Computer Applications)",
  "BCA — Cloud & Cyber Security",
  "BCA — Data Analytics & AI",
  "MCA (Master of Computer Applications)",
  "BBA (Bachelor of Business Administration)",
  "BBA — Finance & Banking",
  "BBA — Digital Marketing & E-Commerce",
  "BBA — HR & Operations",
  "BBA — Aviation & Hospitality Management",
  "BMS (Bachelor of Management Studies)",
  "MBA (Master of Business Administration)",
  "B.Com (Bachelor of Commerce — General)",
  "B.Com (Honours / Accounting & Finance)",
  "B.Com — Corporate Secretaryship",
  "M.Com (Master of Commerce)",
  "B.Sc — Computer Science",
  "B.Sc — Data Science & Statistics",
  "B.Sc — Physics",
  "B.Sc — Chemistry",
  "B.Sc — Mathematics",
  "B.Sc — Biotechnology & Microbiology",
  "B.Sc — Agriculture & Horticulture",
  "B.Sc — Forensic Science",
  "B.Sc — Psychology",
  "B.Sc — Nutrition & Dietetics",
  "B.Sc — Animation & VFX",
  "M.Sc (Master of Science)",
  "BA — English Literature",
  "BA — Psychology",
  "BA — Economics",
  "BA — Political Science & Sociology",
  "BA — History & Public Administration",
  "BJMC (Journalism & Mass Communication)",
  "BFA (Bachelor of Fine Arts)",
  "BSW (Bachelor of Social Work)",
  "B.Arch (Bachelor of Architecture)",
  "B.Des — UI/UX & Communication Design",
  "B.Des — Fashion & Apparel Design",
  "B.Des — Interior & Product Design",
  "BA LLB / BBA LLB (Integrated Law)",
  "LLB (Bachelor of Laws)",
  "B.Pharm (Bachelor of Pharmacy)",
  "Pharm.D (Doctor of Pharmacy)",
  "MBBS (Medicine & Surgery)",
  "BDS (Dental Surgery)",
  "BPT (Bachelor of Physiotherapy)",
  "B.Sc Nursing",
  "BHM (Bachelor of Hotel Management)",
  "B.Ed (Bachelor of Education)",
  "Ph.D / Research Scholar",
];

const INITIAL_MOCK_STUDENTS: StudentProfile[] = [
  {
    id: "stu_101",
    alias: "MidnightCoder",
    avatar: "🦉",
    yearDept: "3rd Year • B.Tech — CSE",
    bio: "Surviving on cold brew and last-minute assignments. Looking for someone to grab late-night campus Maggi with.",
    interests: ["Indie Music", "Hackathons", "Late-Night Walks"],
    compatibility: 94,
    status: "approved",
  },
  {
    id: "stu_102",
    alias: "VelvetSketch",
    avatar: "🦊",
    yearDept: "2nd Year • B.Sc — Psychology",
    bio: "I rate campus cafes by their playlist. Tell me your most controversial movie opinion.",
    interests: ["Thrifting", "Iced Matcha", "Sci-Fi Films"],
    compatibility: 89,
    status: "approved",
  },
  {
    id: "stu_103",
    alias: "CosmicRhythm",
    avatar: "🐼",
    yearDept: "4th Year • B.Tech — ECE",
    bio: "Guitarist who knows 4 chords really well. Down for library study dates or spontaneous road trips.",
    interests: ["Acoustic Guitar", "Street Food", "Badminton"],
    compatibility: 84,
    status: "approved",
  },
];

const AVATAR_OPTIONS = ["🦊", "🐼", "🦉", "🐯", "🦋", "⚡", "🌙", "🔥"];

export default function StudentPage() {
  // ==========================================================================
  // 1. HINGE-STYLE MULTI-STEP AUTH & MANDATORY ID CARD SCREENING STATE
  // ==========================================================================
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [authStep, setAuthStep] = useState<"login" | "otp" | "kyc">("login");
  const [authProvider, setAuthProvider] = useState<"google_oauth" | "email_otp">("email_otp");

  // Step 1 & 2: Login + Email OTP State
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpDeliveryNote, setOtpDeliveryNote] = useState<string>("");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>("");

  // Step 3: Mandatory Academic & College ID Card State
  const [branch, setBranch] = useState<string>("");
  const [year, setYear] = useState<string>("3rd Year");
  const [showDegreeDropdown, setShowDegreeDropdown] = useState<boolean>(false);
  const [idCardBase64, setIdCardBase64] = useState<string>("");

  const [authError, setAuthError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================================================
  // 2. ANONYMOUS ONBOARDING & APP STATE
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<"onboarding" | "discover" | "chat" | "profile">("onboarding");
  const [myProfile, setMyProfile] = useState<StudentProfile | null>(null);

  const [alias, setAlias] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("🦊");
  const [bio, setBio] = useState<string>("");
  const [interestsInput, setInterestsInput] = useState<string>("");

  const [feed, setFeed] = useState<StudentProfile[]>(INITIAL_MOCK_STUDENTS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [matches, setMatches] = useState<StudentProfile[]>([]);
  const [activeMatch, setActiveMatch] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState<string>("");
  const [revealRequested, setRevealRequested] = useState<Record<string, boolean>>({});

  // Strictly enforces numeric-only input capped at 10 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  const hashPhoneNumber = (rawPhone: string): string => {
    let hash = 0;
    for (let i = 0; i < rawPhone.length; i++) {
      hash = (hash << 5) - hash + rawPhone.charCodeAt(i);
      hash |= 0;
    }
    return `PH_HASH_${Math.abs(hash)}`;
  };

  // Load saved session on mount
  useEffect(() => {
    const savedAcc = localStorage.getItem("heartlink_student_account");
    const savedProf = localStorage.getItem("heartlink_student_profile");
    if (savedAcc) setAccount(JSON.parse(savedAcc));
    if (savedProf) {
      setMyProfile(JSON.parse(savedProf));
      setActiveTab("discover");
    }
  }, []);

  // Real-time listener for Admin Approval
  const checkAdminApprovalStatus = useCallback(() => {
    if (!account) return;
    const sharedQueue = JSON.parse(
      localStorage.getItem("heartlink_admin_verification_queue") || "[]"
    );
    const found = sharedQueue.find(
      (item: { id: string; email: string; verificationStatus?: string; status?: string }) =>
        item.id === account.id || item.email === account.email
    );
    const resolvedStatus = found?.verificationStatus || found?.status;

    if (resolvedStatus === "verified" || resolvedStatus === "rejected") {
      if (account.verificationStatus !== resolvedStatus) {
        const updated: StudentAccount = {
          ...account,
          verificationStatus: resolvedStatus,
        };
        setAccount(updated);
        localStorage.setItem("heartlink_student_account", JSON.stringify(updated));
      }
    }

    // Also sync approved feed profiles from Admin
    const allUsers = localStorage.getItem("college_dating_all_users");
    if (allUsers) {
      try {
        const parsed: StudentProfile[] = JSON.parse(allUsers);
        const approvedOnly = parsed.filter(
          (u) => u.status === "approved" && u.id !== account.id
        );
        if (approvedOnly.length > 0) {
          setFeed(approvedOnly);
        }
      } catch {
        // Ignore
      }
    }
  }, [account]);

  useEffect(() => {
    if (!account) return;
    const handleStorage = () => checkAdminApprovalStatus();
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(checkAdminApprovalStatus, 2000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [account, checkAdminApprovalStatus]);

  // ==========================================================================
  // STEP 1 HANDLERS: SEND REAL EMAIL OTP VIA /api/send-otp
  // ==========================================================================
  const dispatchEmailOtp = async (targetEmail: string, provider: "google_oauth" | "email_otp") => {
    setIsSendingOtp(true);
    setAuthError("");
    setOtpDeliveryNote("");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp("");
    setAuthProvider(provider);

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, otp: code }),
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        setOtpDeliveryNote(`✓ 6-digit OTP sent to ${targetEmail} inbox!`);
      } else {
        setOtpDeliveryNote(
          `Demo Fallback Active (Configure GMAIL_USER & GMAIL_APP_PASSWORD in .env.local for real inbox delivery)`
        );
      }
    } catch {
      setOtpDeliveryNote("Local OTP Mode Active");
    } finally {
      setIsSendingOtp(false);
      setAuthStep("otp");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (phone.length !== 10) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    await dispatchEmailOtp(email.trim().toLowerCase(), "email_otp");
  };

  const handleGoogleSignInConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput.trim() || !googleEmailInput.includes("@")) {
      setAuthError("Please enter your Google email address.");
      return;
    }
    if (phone.length !== 10) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    setEmail(cleanEmail);
    setShowGoogleModal(false);
    await dispatchEmailOtp(cleanEmail, "google_oauth");
  };

  // ==========================================================================
  // STEP 2 HANDLER: VERIFY EMAIL OTP -> PROCEED TO MANDATORY ID UPLOAD
  // ==========================================================================
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (enteredOtp.trim() !== generatedOtp) {
      setAuthError("Invalid 6-digit OTP code. Please check your email and try again.");
      return;
    }
    setAuthStep("kyc");
  };

  // ==========================================================================
  // STEP 3 HANDLERS: ID UPLOAD & SEND TO ADMIN DASHBOARD
  // ==========================================================================
  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdCardBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!branch.trim()) {
      setAuthError("Please select or enter your degree and department.");
      return;
    }

    if (!idCardBase64) {
      setAuthError("Uploading your College ID card is mandatory for verification.");
      return;
    }

    setIsSubmitting(true);

    const maskedPhone = `******${phone.slice(-4)}`;
    const phoneHash = hashPhoneNumber(phone);
    const ticketId = `VER-${Math.floor(100 + Math.random() * 900)}`;

    const newAccount: StudentAccount = {
      id: ticketId,
      email: email.trim().toLowerCase(),
      phoneMasked: maskedPhone,
      phoneHash,
      branch: branch.trim(),
      year,
      authProvider,
      idCardImage: idCardBase64,
      verificationStatus: "pending",
    };

    localStorage.setItem("heartlink_student_account", JSON.stringify(newAccount));

    // 1. Push to Admin ID Verification Queue ("heartlink_admin_verification_queue")
    const existingQueue = JSON.parse(
      localStorage.getItem("heartlink_admin_verification_queue") || "[]"
    );
    const queueItem = {
      ...newAccount,
      status: "pending",
      submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    localStorage.setItem(
      "heartlink_admin_verification_queue",
      JSON.stringify([
        queueItem,
        ...existingQueue.filter((i: { email: string }) => i.email !== newAccount.email),
      ])
    );

    // 2. Also push a pending entry into "college_dating_all_users" so it shows in Admin Students tab immediately
    const existingUsers: StudentProfile[] = JSON.parse(
      localStorage.getItem("college_dating_all_users") || "[]"
    );
    const pendingStudentEntry: StudentProfile = {
      id: ticketId,
      alias: `Unmasked (${newAccount.email.split("@")[0]})`,
      avatar: "🪪",
      yearDept: `${newAccount.year} • ${newAccount.branch}`,
      bio: "Awaiting Admin College ID Verification...",
      interests: [newAccount.branch, newAccount.year],
      compatibility: 90,
      status: "pending",
      email: newAccount.email,
      phoneMasked: newAccount.phoneMasked,
      idCardImage: newAccount.idCardImage,
    };
    localStorage.setItem(
      "college_dating_all_users",
      JSON.stringify([
        pendingStudentEntry,
        ...existingUsers.filter((u) => u.id !== ticketId && u.email !== newAccount.email),
      ])
    );

    setIsSubmitting(false);
    setAccount(newAccount);
  };

  // ==========================================================================
  // PERSONA & DATING APP HANDLERS
  // ==========================================================================
  const handleRandomAlias = () => {
    const adjectives = ["Silent", "Cosmic", "Midnight", "Neon", "Velvet", "Solar", "Mystic"];
    const nouns = ["Scholar", "Rebel", "Owl", "Fox", "Voyager", "Drifter", "Spark"];
    setAlias(
      `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
        nouns[Math.floor(Math.random() * nouns.length)]
      }${Math.floor(Math.random() * 90 + 10)}`
    );
  };

  const handleCreatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !alias.trim() || !bio.trim()) return;

    const newProfile: StudentProfile = {
      id: account.id,
      alias: alias.trim(),
      avatar: selectedAvatar,
      yearDept: `${account.year} • ${account.branch}`,
      bio: bio.trim(),
      interests: interestsInput
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
      compatibility: Math.floor(82 + Math.random() * 16),
      status: "approved",
      email: account.email,
      phoneMasked: account.phoneMasked,
      idCardImage: account.idCardImage,
    };

    localStorage.setItem("heartlink_student_profile", JSON.stringify(newProfile));

    const allUsers = JSON.parse(localStorage.getItem("college_dating_all_users") || "[]");
    localStorage.setItem(
      "college_dating_all_users",
      JSON.stringify([
        newProfile,
        ...allUsers.filter((u: { id: string; email?: string }) => u.id !== newProfile.id && u.email !== account.email),
      ])
    );

    setMyProfile(newProfile);
    setActiveTab("discover");
  };

  const handleSwipe = (action: "pass" | "spark") => {
    if (currentIndex >= feed.length) return;
    const target = feed[currentIndex];

    if (action === "spark") {
      if (!matches.some((m) => m.id === target.id)) {
        setMatches((prev) => [...prev, target]);
        setActiveMatch(target);
        setMessages((prev) => ({
          ...prev,
          [target.id]: [
            {
              id: `msg_${Date.now()}`,
              senderAlias: target.alias,
              text: `Hey! We matched anonymously. Saw you're into ${target.interests[0] || "campus life"} too!`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ],
        }));
      }
      setActiveTab("chat");
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeMatch || !myProfile) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderAlias: myProfile.alias,
      text: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeMatch.id]: [...(prev[activeMatch.id] || []), newMsg],
    }));
    setMessageInput("");
  };

  const handleLogoutReset = () => {
    localStorage.removeItem("heartlink_student_account");
    localStorage.removeItem("heartlink_student_profile");
    setAccount(null);
    setMyProfile(null);
    setAuthStep("login");
    setIdCardBase64("");
    setEnteredOtp("");
    setPhone("");
  };

  // ==========================================================================
  // GATE 1: HINGE-STYLE 3-STEP ONBOARDING (LOGIN -> EMAIL OTP -> COLLEGE ID)
  // ==========================================================================
  if (!account) {
    const filteredDegrees = DEGREES_DEPARTMENTS.filter((d) =>
      d.toLowerCase().includes(branch.toLowerCase())
    );

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className={`h-1.5 flex-1 rounded-full ${authStep === "login" || authStep === "otp" || authStep === "kyc" ? "bg-pink-500" : "bg-slate-800"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${authStep === "otp" || authStep === "kyc" ? "bg-pink-500" : "bg-slate-800"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${authStep === "kyc" ? "bg-pink-500" : "bg-slate-800"}`} />
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-violet-600 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-pink-500/20">
              🎭
            </div>
            <h1 className="text-2xl font-bold mt-3">
              {authStep === "login" && "Welcome to CampusSpark"}
              {authStep === "otp" && "Check Your Email for OTP"}
              {authStep === "kyc" && "College ID Verification"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {authStep === "login" && "Step 1 of 3 • Sign in with Google or Email OTP"}
              {authStep === "otp" && `Step 2 of 3 • Enter the 6-digit code sent to ${email}`}
              {authStep === "kyc" && "Step 3 of 3 • Upload your College ID card for Admin approval"}
            </p>
          </div>

          {/* STEP 1: LOGIN */}
          {authStep === "login" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setShowGoogleModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm flex items-center justify-center gap-2.5 shadow transition cursor-pointer"
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-px flex-1 bg-slate-800" />
                <span>OR SIGN IN WITH EMAIL OTP</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address (Receives 6-Digit OTP)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu.in or you@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Mobile Number (10 Digits Only)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {phone.length}/10
                    </span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
                >
                  {isSendingOtp ? "Sending OTP to Email..." : "Send 6-Digit Email OTP →"}
                </button>
              </form>

              {showGoogleModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base">Sign in with Google</h3>
                      <button
                        type="button"
                        onClick={() => setShowGoogleModal(false)}
                        className="text-slate-400 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <form onSubmit={handleGoogleSignInConfirm} className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Google Account Email</label>
                        <input
                          type="email"
                          required
                          value={googleEmailInput}
                          onChange={(e) => setGoogleEmailInput(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs text-slate-400">
                            Mobile Number (10 Digits)
                          </label>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {phone.length}/10
                          </span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          pattern="[0-9]{10}"
                          required
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="10-digit mobile number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold text-white transition cursor-pointer"
                      >
                        Continue & Send Email OTP →
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: EMAIL OTP VERIFICATION */}
          {authStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-violet-300">📧 Email OTP Code:</span>
                    <span>
                      Code: <strong className="text-white tracking-widest">{generatedOtp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold transition cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                {otpDeliveryNote && (
                  <p className="text-[11px] text-slate-400">{otpDeliveryNote}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Enter 6-Digit Email OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] font-bold focus:outline-none focus:border-pink-500"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
              >
                Verify OTP & Continue to College ID Upload →
              </button>
            </form>
          )}

          {/* STEP 3: MANDATORY DEGREE + COLLEGE ID CARD UPLOAD */}
          {authStep === "kyc" && (
            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Degree & Department *
                </label>
                <input
                  type="text"
                  required
                  value={branch}
                  onFocus={() => setShowDegreeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDegreeDropdown(false), 150)}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setShowDegreeDropdown(true);
                  }}
                  placeholder="Search 74+ degrees (e.g., CSE, Civil, Electrical, BBA)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                />

                {showDegreeDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-800/50">
                    {filteredDegrees.length > 0 ? (
                      filteredDegrees.map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onMouseDown={() => {
                            setBranch(deg);
                            setShowDegreeDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-pink-600/20 hover:text-white transition"
                        >
                          {deg}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400">
                        Using custom degree: <span className="text-pink-400 font-semibold">&ldquo;{branch}&rdquo;</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Study Year *
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>5th Year / PG</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-pink-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                    🪪 Upload College ID Card *
                  </span>
                  <span className="text-[10px] text-slate-400">Sent to Admin</span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIdCardUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:bg-slate-800 file:text-pink-400 hover:file:bg-slate-700 cursor-pointer"
                />

                {idCardBase64 && (
                  <div className="mt-2 flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30">
                    <div className="flex items-center gap-3">
                      <img
                        src={idCardBase64}
                        alt="ID Preview"
                        className="h-12 w-20 object-cover rounded-lg border border-emerald-500/50"
                      />
                      <span className="text-xs text-emerald-400 font-medium">
                        ✓ College ID Ready
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdCardBase64("")}
                      className="text-[11px] text-slate-400 hover:text-white underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
              >
                Send College ID to Admin Dashboard →
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // ==========================================================================
  // GATE 2: WAITING FOR ADMIN SCREENING APPROVAL
  // ==========================================================================
  if (account.verificationStatus === "pending" || account.verificationStatus === "rejected") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-3xl">
            {account.verificationStatus === "rejected" ? "❌" : "⏳"}
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Ticket ID: {account.id}
            </span>
            <h2 className="text-xl font-bold mt-3">
              {account.verificationStatus === "rejected"
                ? "College ID Rejected by Admin"
                : "Sent to Admin Dashboard!"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your College ID card for <strong>{account.branch}</strong> is now live in the Admin Dashboard under <strong>🪪 ID Requests</strong>. As soon as the admin clicks Approve, this screen will unlock automatically!
            </p>
          </div>

          {account.idCardImage && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 inline-block">
              <img
                src={account.idCardImage}
                alt="Submitted College ID"
                className="w-40 h-24 object-cover rounded-lg border border-slate-700 mx-auto"
              />
              <span className="text-[10px] text-slate-400 block mt-1.5">
                Awaiting Admin Review
              </span>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              onClick={checkAdminApprovalStatus}
              className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-semibold transition cursor-pointer"
            >
              🔄 Check Admin Approval Status
            </button>

            <button
              onClick={handleLogoutReset}
              className="w-full py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs text-slate-400 transition cursor-pointer"
            >
              Start Over / Use Different Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // GATE 3: VERIFIED STUDENT PORTAL
  // ==========================================================================
  const currentCandidate = feed[currentIndex];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-violet-600 flex items-center justify-center text-lg">
              🎭
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">
                Campus<span className="text-pink-500">Spark</span>
              </span>
              <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                ✓ Admin Approved ID
              </span>
            </div>
          </div>

          {myProfile && (
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("discover")}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "discover" ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Discover
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  activeTab === "chat" ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Chats
                {matches.length > 0 && (
                  <span className="px-1.5 py-0.2 text-xs bg-violet-500 text-white rounded-full">
                    {matches.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "profile" ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {myProfile.avatar}
              </button>
            </nav>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {activeTab === "onboarding" && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-6">
              <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                College ID Approved by Admin
              </span>
              <h1 className="text-2xl font-bold mt-3">Build Your Secret Persona</h1>
              <p className="text-slate-400 text-xs mt-1">
                Your real email, phone, and ID card remain strictly hidden.
              </p>
            </div>

            <form onSubmit={handleCreatePersona} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Secret Alias
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="e.g., MidnightOwl99"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={handleRandomAlias}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm text-pink-400 transition"
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`p-2.5 text-2xl bg-slate-950 rounded-xl border-2 transition ${
                        selectedAvatar === emoji ? "border-pink-500 bg-pink-500/10" : "border-slate-800"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Anonymous Confession / Prompt
                </label>
                <textarea
                  required
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share an unpopular opinion or favorite campus spot..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Top 3 Interests (Comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  placeholder="Late-night Maggi, Indie Rock, Hackathons"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
              >
                Enter Blind Discovery →
              </button>
            </form>
          </section>
        )}

        {activeTab === "discover" && (
          <section className="space-y-5">
            {currentCandidate ? (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">
                        {currentCandidate.avatar}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{currentCandidate.alias}</h2>
                        <p className="text-xs text-slate-400">{currentCandidate.yearDept}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                      {currentCandidate.compatibility || 90}% Vibe Match
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 mb-4">
                    <p className="text-[11px] uppercase tracking-wider text-pink-400 font-semibold mb-1">
                      Anonymous Confession
                    </p>
                    <p className="text-slate-200 text-sm leading-relaxed">&ldquo;{currentCandidate.bio}&rdquo;</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentCandidate.interests.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => handleSwipe("pass")}
                    className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xl shadow-lg transition cursor-pointer"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => handleSwipe("spark")}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-600 to-violet-600 text-white flex items-center justify-center text-2xl shadow-xl shadow-pink-600/30 transition cursor-pointer"
                  >
                    ⚡
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
                <div className="text-4xl">✨</div>
                <h3 className="text-lg font-bold">You&apos;ve Seen Everyone Nearby!</h3>
                <button
                  onClick={() => setCurrentIndex(0)}
                  className="mt-2 px-4 py-2 bg-slate-800 text-xs rounded-xl text-pink-400 font-medium"
                >
                  Revisit Profiles
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === "chat" && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[520px] shadow-xl">
            {matches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-4xl mb-2">💬</div>
                <h3 className="font-bold text-base">No Active Sparks</h3>
                <p className="text-xs text-slate-400 mt-1">Send a ⚡ Spark in Discover to start chatting.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 p-2.5 border-b border-slate-800 bg-slate-950 overflow-x-auto">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveMatch(m)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition ${
                        activeMatch?.id === m.id ? "bg-pink-600 text-white" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      <span>{m.avatar}</span>
                      <span>{m.alias}</span>
                    </button>
                  ))}
                </div>

                {activeMatch && (
                  <>
                    <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-lg">
                          {activeMatch.avatar}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{activeMatch.alias}</h3>
                          <p className="text-[11px] text-emerald-400">● Anonymous Mode</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setRevealRequested((prev) => ({ ...prev, [activeMatch.id]: true }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600/20 border border-violet-500/40 text-violet-300"
                      >
                        {revealRequested[activeMatch.id] ? "⏳ Reveal Requested" : "👁️ Request Reveal"}
                      </button>
                    </div>

                    <div className="flex-1 p-4 space-y-3 overflow-y-auto text-sm">
                      {(messages[activeMatch.id] || []).map((msg) => {
                        const isMe = msg.senderAlias === myProfile?.alias;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${
                                isMe ? "bg-pink-600 text-white rounded-tr-sm" : "bg-slate-800 text-slate-200 rounded-tl-sm"
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={`Message ${activeMatch.alias} anonymously...`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                      <button type="submit" className="px-4 py-2 bg-pink-600 rounded-xl text-white text-sm font-semibold">
                        Send
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "profile" && myProfile && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-4xl">
              {myProfile.avatar}
            </div>
            <div>
              <h2 className="text-xl font-bold">{myProfile.alias}</h2>
              <p className="text-xs text-slate-400">{myProfile.yearDept}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-left text-xs space-y-1.5 text-slate-400">
              <p className="text-emerald-400 font-semibold">🔒 Private Security Vault</p>
              <p>Email: {account.email}</p>
              <p>Phone: {account.phoneMasked}</p>
            </div>

            <button
              onClick={handleLogoutReset}
              className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Log Out / Switch Account
            </button>
          </section>
        )}
      </div>
    </main>
  );
}