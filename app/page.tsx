"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface StudentAccount {
  id: string;
  email: string;
  phone: string;
  phoneMasked: string;
  phoneHash: string;
  branch: string;
  year: string;
  collegeName: string;
  baseLocation: "Bangalore" | "Mysore";
  fullName: string;
  gender: "Male" | "Female" | "Other";
  authProvider: "google_oauth" | "email_otp";
  idCardFrontImage: string;
  idCardBackImage: string;
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
  phone?: string;
  collegeName?: string;
  baseLocation?: "Bangalore" | "Mysore";
  fullName?: string;
  gender?: "Male" | "Female" | "Other";
  idCardFrontImage?: string;
  idCardBackImage?: string;
}

export interface ChatMessage {
  id: string;
  senderAlias: string;
  text: string;
  timestamp: string;
}

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

const DEGREES_DEPARTMENTS = [
  "B.Tech — CSE (Computer Science & Engineering)",
  "B.Tech — CSE (AI & Machine Learning)",
  "B.Tech — CSE (Data Science)",
  "B.Tech — CSE (Cyber Security)",
  "B.Tech — IT (Information Technology)",
  "B.Tech — ECE (Electronics & Communication)",
  "B.Tech — Electrical Engineering",
  "B.Tech — Mechanical Engineering",
  "B.Tech — Civil Engineering",
  "BCA (Bachelor of Computer Applications)",
  "BBA (Bachelor of Business Administration)",
  "B.Com (Bachelor of Commerce)",
  "B.Sc — Computer Science",
  "BA — Psychology",
  "MBA (Master of Business Administration)",
  "MCA (Master of Computer Applications)",
];

const AVATAR_OPTIONS = ["🦊", "🐼", "🦉", "🐯", "🦋", "⚡", "🌙", "🔥"];

export default function StudentPage() {
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [authStep, setAuthStep] = useState<"login" | "otp" | "kyc">("login");
  const [authProvider, setAuthProvider] = useState<"google_oauth" | "email_otp">("email_otp");

  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpDeliveryNote, setOtpDeliveryNote] = useState<string>("");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>("");

  const [baseLocation, setBaseLocation] = useState<"Bangalore" | "Mysore">("Bangalore");
  const [collegeName, setCollegeName] = useState<string>("");
  const [showCollegeDropdown, setShowCollegeDropdown] = useState<boolean>(false);
  const [branch, setBranch] = useState<string>("");
  const [year, setYear] = useState<string>("1st Year");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [showDegreeDropdown, setShowDegreeDropdown] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [idCardFrontBase64, setIdCardFrontBase64] = useState<string>("");
  const [idCardBackBase64, setIdCardBackBase64] = useState<string>("");

  const [authError, setAuthError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"onboarding" | "discover" | "chat" | "profile">("onboarding");
  const [myProfile, setMyProfile] = useState<StudentProfile | null>(null);

  const [alias, setAlias] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("🦊");

  const [feed, setFeed] = useState<StudentProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [matches, setMatches] = useState<StudentProfile[]>([]);
  const [activeMatch, setActiveMatch] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState<string>("");

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

  useEffect(() => {
    const savedAcc = localStorage.getItem("heartlink_student_account");
    const savedProf = localStorage.getItem("heartlink_student_profile");
    if (savedAcc) setAccount(JSON.parse(savedAcc));
    if (savedProf) {
      setMyProfile(JSON.parse(savedProf));
      setActiveTab("discover");
    }

    const allUsers = JSON.parse(localStorage.getItem("college_dating_all_users") || "[]");
    setFeed(allUsers.filter((u: StudentProfile) => u.status === "approved"));
  }, []);

  const checkAdminApprovalStatus = useCallback(() => {
    if (!account) return;
    const sharedQueue = JSON.parse(localStorage.getItem("heartlink_admin_verification_queue") || "[]");
    const found = sharedQueue.find(
      (item: { id: string; email: string; verificationStatus?: string; status?: string }) =>
        item.id === account.id || item.email === account.email
    );
    const resolvedStatus = found?.verificationStatus || found?.status;

    if (resolvedStatus && account.verificationStatus !== resolvedStatus) {
      const updated: StudentAccount = {
        ...account,
        verificationStatus: resolvedStatus as "verified" | "rejected" | "pending",
      };
      setAccount(updated);
      localStorage.setItem("heartlink_student_account", JSON.stringify(updated));
    }
  }, [account]);

  useEffect(() => {
    if (!account) return;
    const interval = setInterval(checkAdminApprovalStatus, 2000);
    return () => clearInterval(interval);
  }, [account, checkAdminApprovalStatus]);

  const dispatchEmailOtp = async (targetEmail: string, provider: "google_oauth" | "email_otp") => {
    setIsSendingOtp(true);
    setAuthError("");
    setOtpDeliveryNote("");

    const existingQueue = JSON.parse(localStorage.getItem("heartlink_admin_verification_queue") || "[]");
    const existingRecord = existingQueue.find((item: { email: string; phone?: string }) => item.email === targetEmail);

    if (existingRecord && existingRecord.phone && existingRecord.phone !== phone) {
      setAuthError("Error: This email address is already registered with a different mobile number. Login denied.");
      setIsSendingOtp(false);
      return false;
    }

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
        setOtpDeliveryNote(`Demo OTP Code: ${code}`);
      }
    } catch {
      setOtpDeliveryNote(`Demo OTP Code: ${code}`);
    } finally {
      setIsSendingOtp(false);
      setAuthStep("otp");
    }
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (phone.length !== 10) {
      setAuthError("Mobile number must be exactly 10 digits.");
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
      setAuthError("Mobile number must be exactly 10 digits.");
      return;
    }
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    setEmail(cleanEmail);
    setShowGoogleModal(false);
    await dispatchEmailOtp(cleanEmail, "google_oauth");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (enteredOtp.trim() !== generatedOtp) {
      setAuthError("Invalid 6-digit OTP code.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingQueue = JSON.parse(localStorage.getItem("heartlink_admin_verification_queue") || "[]");
    const existingUserRecord = existingQueue.find(
      (item: { email: string; verificationStatus?: string; status?: string }) =>
        item.email === cleanEmail &&
        (item.verificationStatus === "verified" || item.status === "verified" || item.status === "approved")
    );

    if (existingUserRecord) {
      const restoredAccount: StudentAccount = {
        id: existingUserRecord.id || `VER-${Math.floor(100 + Math.random() * 900)}`,
        email: cleanEmail,
        phone: existingUserRecord.phone || phone,
        phoneMasked: existingUserRecord.phoneMasked || `******${phone.slice(-4)}`,
        phoneHash: existingUserRecord.phoneHash || hashPhoneNumber(phone),
        branch: existingUserRecord.branch || "B.Tech — CSE",
        year: existingUserRecord.year || "3rd Year",
        collegeName: existingUserRecord.collegeName || "Campus University",
        baseLocation: existingUserRecord.baseLocation || "Bangalore",
        fullName: existingUserRecord.fullName || "Student",
        gender: existingUserRecord.gender || "Male",
        authProvider,
        idCardFrontImage: existingUserRecord.idCardFrontImage || "",
        idCardBackImage: existingUserRecord.idCardBackImage || "",
        verificationStatus: "verified",
      };

      localStorage.setItem("heartlink_student_account", JSON.stringify(restoredAccount));
      setAccount(restoredAccount);

      const allUsers = JSON.parse(localStorage.getItem("college_dating_all_users") || "[]");
      const existingProfile = allUsers.find((u: StudentProfile) => u.email === cleanEmail && u.status === "approved");

      if (existingProfile) {
        localStorage.setItem("heartlink_student_profile", JSON.stringify(existingProfile));
        setMyProfile(existingProfile);
        setActiveTab("discover");
      } else {
        setActiveTab("onboarding");
      }
      return;
    }

    setFullName("");
    setCollegeName("");
    setBranch("");
    setYear("1st Year");
    setGender("Male");
    setIdCardFrontBase64("");
    setIdCardBackBase64("");

    setAuthStep("kyc");
  };

  const handleCompressAndSet = (file: File, setter: (val: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setter(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCompressAndSet(file, setIdCardFrontBase64);
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCompressAndSet(file, setIdCardBackBase64);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!fullName.trim()) {
      setAuthError("Please enter your full legal name as per ID card.");
      return;
    }
    if (!collegeName.trim()) {
      setAuthError("Please select or enter your college name.");
      return;
    }
    if (!branch.trim()) {
      setAuthError("Please select or enter your degree and department.");
      return;
    }
    if (!idCardFrontBase64 || !idCardBackBase64) {
      setAuthError("Both front and back sides of the College ID card are mandatory.");
      return;
    }

    const existingQueue = JSON.parse(localStorage.getItem("heartlink_admin_verification_queue") || "[]");
    const activeMatch = existingQueue.find(
      (item: { email: string; verificationStatus?: string; status?: string }) =>
        item.email === email.trim().toLowerCase() &&
        (item.verificationStatus === "pending" || item.verificationStatus === "verified" || item.status === "pending" || item.status === "verified")
    );

    if (activeMatch) {
      setAuthError("This email is already registered and active/pending verification.");
      return;
    }

    setIsSubmitting(true);
    const ticketId = `VER-${Math.floor(100 + Math.random() * 900)}`;

    const newAccount: StudentAccount = {
      id: ticketId,
      email: email.trim().toLowerCase(),
      phone: phone,
      phoneMasked: `******${phone.slice(-4)}`,
      phoneHash: hashPhoneNumber(phone),
      branch: branch.trim(),
      year,
      collegeName: collegeName.trim(),
      baseLocation,
      fullName: fullName.trim(),
      gender,
      authProvider,
      idCardFrontImage: idCardFrontBase64,
      idCardBackImage: idCardBackBase64,
      verificationStatus: "pending",
    };

    try {
      localStorage.setItem("heartlink_student_account", JSON.stringify(newAccount));

      const queueItem = {
        ...newAccount,
        status: "pending",
        submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      localStorage.setItem(
        "heartlink_admin_verification_queue",
        JSON.stringify([queueItem, ...existingQueue.filter((i: { email: string }) => i.email !== newAccount.email)])
      );

      const existingUsers = JSON.parse(localStorage.getItem("college_dating_all_users") || "[]");
      const pendingStudentEntry = {
        id: ticketId,
        alias: `User_${phone.slice(-4)}`,
        avatar: "🪪",
        yearDept: `${newAccount.year} • ${newAccount.branch}`,
        bio: "Awaiting Admin ID verification...",
        interests: [newAccount.branch, newAccount.year],
        compatibility: 90,
        status: "pending" as const,
        email: newAccount.email,
        phone: newAccount.phone,
        collegeName: newAccount.collegeName,
        baseLocation: newAccount.baseLocation,
        fullName: newAccount.fullName,
        gender: newAccount.gender,
        idCardFrontImage: newAccount.idCardFrontImage,
        idCardBackImage: newAccount.idCardBackImage,
      };
      localStorage.setItem(
        "college_dating_all_users",
        JSON.stringify([pendingStudentEntry, ...existingUsers.filter((u: { id: string }) => u.id !== ticketId)])
      );
    } catch {
      setAuthError("Storage quota error. Please try uploading slightly smaller images.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setAccount(newAccount);
  };

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
    if (!account || !alias.trim()) return;

    const newProfile: StudentProfile = {
      id: account.id,
      alias: alias.trim(),
      avatar: selectedAvatar,
      yearDept: `${account.year} • ${account.branch}`,
      bio: "Campus explorer & student.",
      interests: [account.branch],
      compatibility: Math.floor(82 + Math.random() * 16),
      status: "approved",
      email: account.email,
      phone: account.phone,
      collegeName: account.collegeName,
      baseLocation: account.baseLocation,
      fullName: account.fullName,
      gender: account.gender,
    };

    localStorage.setItem("heartlink_student_profile", JSON.stringify(newProfile));

    const allUsers = JSON.parse(localStorage.getItem("college_dating_all_users") || "[]");
    localStorage.setItem(
      "college_dating_all_users",
      JSON.stringify([newProfile, ...allUsers.filter((u: { id: string }) => u.id !== newProfile.id)])
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
    setFullName("");
    setCollegeName("");
    setBranch("");
    setIdCardFrontBase64("");
    setIdCardBackBase64("");
    setEnteredOtp("");
    setPhone("");
    setEmail("");
  };

  if (!account) {
    const activeColleges = baseLocation === "Bangalore" ? BANGALORE_COLLEGES : MYSORE_COLLEGES;
    const filteredColleges = activeColleges.filter((c) =>
      c.toLowerCase().includes(collegeName.toLowerCase())
    );
    const filteredDegrees = DEGREES_DEPARTMENTS.filter((d) =>
      d.toLowerCase().includes(branch.toLowerCase())
    );

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
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
              {authStep === "otp" && "Verify Email OTP"}
              {authStep === "kyc" && "College Location & ID Verification"}
            </h1>
          </div>

          {authStep === "login" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setAuthError("");
                  setShowGoogleModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-900 font-semibold text-sm flex items-center justify-center shadow transition cursor-pointer"
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-px flex-1 bg-slate-800" />
                <span>OR EMAIL &amp; PHONE</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@college.edu.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Mobile Number (10 Digits)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">{phone.length}/10</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
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
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
                >
                  {isSendingOtp ? "Sending OTP..." : "Send Email OTP →"}
                </button>
              </form>

              {showGoogleModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base">Google Sign-In</h3>
                      <button onClick={() => setShowGoogleModal(false)} className="text-slate-400 cursor-pointer">✕</button>
                    </div>
                    <form onSubmit={handleGoogleSignInConfirm} className="space-y-3">
                      <input
                        type="email"
                        required
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        placeholder="gmail@gmail.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm"
                      />
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="10-digit mobile number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm"
                      />
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowGoogleModal(false)}
                          className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-pink-600 text-xs font-semibold text-white cursor-pointer">
                          Send OTP →
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {authStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Code: <strong className="text-white tracking-widest">{generatedOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[11px] cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                {otpDeliveryNote && <p className="text-[11px] text-slate-400">{otpDeliveryNote}</p>}
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] font-bold"
              />

              {authError && <div className="p-3 rounded-xl bg-rose-500/10 text-xs text-rose-300">{authError}</div>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthStep("login")}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm cursor-pointer">
                  Verify OTP →
                </button>
              </div>
            </form>
          )}

          {authStep === "kyc" && (
            <form onSubmit={handleKycSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name (as per ID) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Gender *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Male", "Female", "Other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                        gender === g
                          ? "bg-pink-600 border-pink-500 text-white shadow"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Base Location *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBaseLocation("Bangalore");
                      setCollegeName("");
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
                      baseLocation === "Bangalore"
                        ? "bg-pink-600 border-pink-500 text-white shadow-lg"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    📍 Bangalore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseLocation("Mysore");
                      setCollegeName("");
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
                      baseLocation === "Mysore"
                        ? "bg-pink-600 border-pink-500 text-white shadow-lg"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    📍 Mysore
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  College Name ({baseLocation}) *
                </label>
                <input
                  type="text"
                  required
                  value={collegeName}
                  onFocus={() => setShowCollegeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 200)}
                  onChange={(e) => {
                    setCollegeName(e.target.value);
                    setShowCollegeDropdown(true);
                  }}
                  placeholder={`Search or type college name in ${baseLocation}...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                />
                {showCollegeDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {filteredColleges.length > 0 ? (
                      filteredColleges.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onMouseDown={() => {
                            setCollegeName(col);
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-pink-600/20"
                        >
                          {col}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-slate-400">
                        Custom college name &quot;{collegeName}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Degree &amp; Department *
                </label>
                <input
                  type="text"
                  required
                  value={branch}
                  onFocus={() => setShowDegreeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDegreeDropdown(false), 200)}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setShowDegreeDropdown(true);
                  }}
                  placeholder="Search degrees..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                />
                {showDegreeDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {filteredDegrees.length > 0 ? (
                      filteredDegrees.map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onMouseDown={() => {
                            setBranch(deg);
                            setShowDegreeDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-pink-600/20"
                        >
                          {deg}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-slate-400">
                        Custom degree &quot;{branch}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Study Year *</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>5th Year / PG</option>
                </select>
              </div>

              {/* Front Side ID Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-pink-500/30 space-y-3">
                <span className="text-xs font-bold text-pink-400 uppercase block">🪪 Upload College ID Card — FRONT SIDE *</span>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold cursor-pointer shadow transition">
                    Browse Front
                    <input type="file" accept="image/*" onChange={handleFrontUpload} className="hidden" />
                  </label>
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {idCardFrontBase64 ? "✓ Front ID attached" : "No file chosen"}
                  </span>
                </div>
              </div>

              {/* Back Side ID Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-pink-500/30 space-y-3">
                <span className="text-xs font-bold text-pink-400 uppercase block">🪪 Upload College ID Card — BACK SIDE *</span>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold cursor-pointer shadow transition">
                    Browse Back
                    <input type="file" accept="image/*" onChange={handleBackUpload} className="hidden" />
                  </label>
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {idCardBackBase64 ? "✓ Back ID attached" : "No file chosen"}
                  </span>
                </div>
              </div>

              {authError && <div className="p-3 rounded-xl bg-rose-500/10 text-xs text-rose-300">{authError}</div>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthStep("otp")}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm cursor-pointer">
                  {isSubmitting ? "Submitting..." : "Submit ID to Admin →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    );
  }

  if (account.verificationStatus === "pending" || account.verificationStatus === "rejected") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-3xl">
            {account.verificationStatus === "rejected" ? "❌" : "⏳"}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {account.verificationStatus === "rejected" ? "Verification Rejected" : "Under Admin Review"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {account.verificationStatus === "rejected"
                ? "Your verification was rejected by admin. Please check details or re-upload."
                : "Your College ID (Front & Back) and details have been sent to the Admin Dashboard. Once approved, this screen will unlock!"}
            </p>
          </div>
          <button onClick={handleLogoutReset} className="w-full py-2 rounded-xl border border-slate-800 text-xs text-slate-400 cursor-pointer">
            {account.verificationStatus === "rejected" ? "Log In & Re-submit" : "Start Over"}
          </button>
        </div>
      </main>
    );
  }

  const currentCandidate = feed[currentIndex];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <span className="font-bold text-lg">Campus<span className="text-pink-500">Spark</span></span>
          {myProfile && (
            <nav className="flex gap-2">
              <button onClick={() => setActiveTab("discover")} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${activeTab === "discover" ? "bg-pink-600 text-white" : "text-slate-400"}`}>Discover</button>
              <button onClick={() => setActiveTab("chat")} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${activeTab === "chat" ? "bg-pink-600 text-white" : "text-slate-400"}`}>Chats</button>
              <button onClick={() => setActiveTab("profile")} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${activeTab === "profile" ? "bg-pink-600 text-white" : "text-slate-400"}`}>{myProfile.avatar}</button>
            </nav>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {activeTab === "onboarding" && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h1 className="text-2xl font-bold">Build Your Secret Persona</h1>
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
              ⚠️ Note: This is your permanent username/alias. Once set, it cannot be changed again. Do not use your real name if you prefer to remain anonymous!
            </p>
            <form onSubmit={handleCreatePersona} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Permanent Username / Alias *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Enter permanent username"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                  />
                  <button type="button" onClick={handleRandomAlias} className="px-3 bg-slate-800 rounded-xl text-pink-400 cursor-pointer" title="Randomize">
                    🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Choose Avatar *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`p-2.5 text-xl bg-slate-950 rounded-xl border-2 cursor-pointer transition ${
                        selectedAvatar === emoji ? "border-pink-500 bg-pink-500/10" : "border-slate-800"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleLogoutReset}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm cursor-pointer shadow-lg shadow-pink-600/20"
                >
                  Enter Discovery →
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === "discover" && (
          <section className="space-y-5">
            {currentCandidate ? (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">{currentCandidate.avatar}</div>
                    <div>
                      <h2 className="text-lg font-bold">{currentCandidate.alias}</h2>
                      <p className="text-xs text-slate-400">{currentCandidate.yearDept}</p>
                    </div>
                  </div>
                  <p className="text-slate-200 text-sm italic">&ldquo;{currentCandidate.bio}&rdquo;</p>
                </div>
                <div className="flex justify-center gap-6">
                  <button onClick={() => handleSwipe("pass")} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-xl cursor-pointer">✕</button>
                  <button onClick={() => handleSwipe("spark")} className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-600 to-violet-600 text-white text-2xl cursor-pointer">⚡</button>
                </div>
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
                <h3 className="text-lg font-bold">You&apos;ve Seen Everyone Nearby!</h3>
              </div>
            )}
          </section>
        )}

        {activeTab === "chat" && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[520px]">
            {matches.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6 text-slate-400 text-xs">No active matches. Send a ⚡ Spark!</div>
            ) : (
              <>
                <div className="flex gap-2 p-2.5 border-b border-slate-800 bg-slate-950 overflow-x-auto">
                  {matches.map((m) => (
                    <button key={m.id} onClick={() => setActiveMatch(m)} className={`px-3 py-1.5 rounded-xl text-xs cursor-pointer ${activeMatch?.id === m.id ? "bg-pink-600 text-white" : "bg-slate-900 text-slate-400"}`}>{m.avatar} {m.alias}</button>
                  ))}
                </div>
                {activeMatch && (
                  <>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto text-sm">
                      {(messages[activeMatch.id] || []).map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.senderAlias === myProfile?.alias ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${msg.senderAlias === myProfile?.alias ? "bg-pink-600 text-white" : "bg-slate-800 text-slate-200"}`}>{msg.text}</div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                      <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Message anonymously..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm" />
                      <button type="submit" className="px-4 py-2 bg-pink-600 rounded-xl text-white text-sm cursor-pointer">Send</button>
                    </form>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "profile" && myProfile && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-4xl">{myProfile.avatar}</div>
            <h2 className="text-xl font-bold">{myProfile.alias}</h2>
            <p className="text-xs text-pink-400">Permanent Username</p>
            <button onClick={handleLogoutReset} className="w-full py-2.5 rounded-xl border border-slate-700 text-xs text-slate-400 cursor-pointer">Log Out</button>
          </section>
        )}
      </div>
    </main>
  );
}