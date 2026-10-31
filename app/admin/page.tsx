"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

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
  createdAt?: number; // exact sign-up time (ms) – stamped by the student site
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

export interface ChatMessage {
  id: string;
  senderAlias: string;
  text: string;
  timestamp: string;
  createdAt?: number;
  replyTo?: { id: string; senderAlias: string; text: string };
  gif?: { url?: string; emoji?: string; label: string };
  game?: { type: string; title: string; prompt: string; options?: string[]; lieIndex?: number; guess?: number };
  reactions?: Record<string, string>;
  vanish?: "off" | "seen" | "1h" | "24h";
  expiresAt?: number;
  seenBy?: string[];
  seenAt?: number;
  vanishedAt?: string; // when it vanished for the students (admin copy is permanent)
}

export interface Confession {
  id: string;
  college: string;
  text: string;
  theme: number;
  createdAt: number;
  authorId: string;
  authorAlias: string;
  reactions: Record<string, string>;
  reports: string[];
  hidden?: boolean;
}

const CONFESSIONS_KEY = "heartlink_confessions";
const CONFESSION_THEMES = [
  "from-pink-500 via-rose-500 to-orange-400",
  "from-violet-600 via-fuchsia-500 to-pink-500",
  "from-sky-500 via-indigo-500 to-violet-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-slate-700 via-purple-800 to-pink-700",
];

// Small badges shown under every message in the admin chat viewers
function MsgExtras({ m }: { m: ChatMessage }) {
  const reactions = Object.entries(m.reactions || {});
  const vanishLabel =
    m.vanish === "seen" ? "after seen" : m.vanish === "1h" ? "1 hour" : m.vanish === "24h" ? "24 hours" : "";
  return (
    <>
      {m.replyTo && (
        <div className="mb-1 px-2 py-1 rounded-lg bg-black/30 border-l-2 border-slate-500 text-[10px] opacity-80">
          <b>↩ {m.replyTo.senderAlias}:</b> {m.replyTo.text}
        </div>
      )}
      {m.gif?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.gif.url} alt={m.gif.label} className="rounded-lg max-h-32 w-auto my-1" />
      )}
      {reactions.length > 0 && (
        <p className="text-[11px] mt-1">
          {reactions.map(([who, e]) => (
            <span key={who} title={who} className="mr-1">{e}</span>
          ))}
        </p>
      )}
      {(m.vanishedAt || vanishLabel) && (
        <p className="text-[9px] mt-1 text-amber-300/90">
          👻 {m.vanishedAt ? `Vanished for students (${m.vanishedAt}) — kept here` : `Set to vanish: ${vanishLabel}`}
        </p>
      )}
    </>
  );
}

// ============================================================================
// FLAGGED-WORD ALERTS
// Messages containing any of these words/phrases are highlighted for the admin.
// The admin can add/remove words from the "Flagged words" panel in the Live tab
// (saved in this browser under FLAGGED_WORDS_KEY).
// ============================================================================
const FLAGGED_WORDS_KEY = "heartlink_admin_flagged_words";
const DEFAULT_FLAGGED_WORDS: string[] = [
  // self-harm
  "suicide", "kill myself", "end my life", "want to die", "self harm",
  // threats / violence
  "kill you", "hurt you", "beat you", "i will find you", "stalk", "acid",
  // sexual pressure / harassment
  "nude", "nudes", "send pics", "send photos", "sex", "rape", "hookup",
  // blackmail / leaks
  "blackmail", "leak", "expose you", "viral your",
  // money & scams
  "paytm", "gpay", "phonepe", "upi", "otp", "send money", "bitcoin", "loan",
  // off-platform contact
  "whatsapp", "instagram", "snapchat", "telegram",
  // abuse
  "fuck", "bitch", "slut", "bastard", "asshole", "madarchod", "bhenchod", "chutiya", "randi", "harami",
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One regex (single capture group) matching any flagged word as a whole word.
function buildFlagRegex(words: string[]): RegExp | null {
  const cleaned = Array.from(new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean)));
  if (cleaned.length === 0) return null;
  cleaned.sort((a, b) => b.length - a.length); // longest phrase first
  return new RegExp(`\\b(${cleaned.map(escapeRegex).join("|")})\\b`, "gi");
}

// Distinct flagged words found in a piece of text (lower-cased).
function getFlagHits(text: string | undefined, re: RegExp | null): string[] {
  if (!re || !text) return [];
  const found = text.match(re);
  return found ? Array.from(new Set(found.map((f) => f.toLowerCase()))) : [];
}

// Renders text with every flagged word highlighted.
function HighlightedText({ text, re }: { text: string; re: RegExp | null }) {
  if (!re || !text) return <>{text}</>;
  const parts = text.split(re); // odd indexes are the matched words
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-red-500/90 text-white font-bold px-1 rounded ring-1 ring-red-300/70 animate-pulse"
            title="Flagged word"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export interface ReportedUserTicket {
  id: string;
  reportedAlias: string;
  reporterAlias: string;
  reporterEmail: string;
  reason: string;
  reportedAt: string;
  chatHistory: ChatMessage[];
}

export interface ChatParticipant {
  alias: string;
  ticketId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  collegeName?: string;
  baseLocation?: string;
  gender?: string;
  branch?: string;
  year?: string;
  yearDept?: string;
}

export interface LiveChatSession {
  sessionId: string;
  userEmail: string;
  userAlias: string;
  targetAlias: string;
  college: string;
  lastActive: string;
  messages: ChatMessage[];
  startedAt?: string;
  startedAtMs?: number; // exact match time (ms) – stamped by the student site
  endedAt?: string;
  status?: "active" | "deleted" | "expired" | "reported" | "ended" | "unmatched";
  participants?: ChatParticipant[];
}

// ---- Weekly summary ----
const FIRST_SEEN_KEY = "heartlink_admin_first_seen"; // fallback timestamps for older records
const SUMMARY_EMAIL_KEY = "heartlink_admin_summary_email";
const DAY_MS = 86400000;
type SummaryRange = "7d" | "30d" | "all";
type DetailTarget = { account?: StudentAccount; profile?: StudentProfile };

type DesignMode = "kanban" | "terminal" | "obsidian";
type ActiveSection = "weekly" | "verifications" | "live_chats" | "students" | "flagged_apps" | "reports" | "blocked" | "confessions" | "events";

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

export default function AdminDashboardVariants() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [designMode, setDesignMode] = useState<DesignMode>("obsidian");
  const [activeSection, setActiveSection] = useState<ActiveSection>("verifications");

  const [students, setStudents] = useState<StudentProfile[]>(INITIAL_STUDENTS);
  const [verificationQueue, setVerificationQueue] = useState<StudentAccount[]>([]);
  const [chatReports, setChatReports] = useState<ReportedUserTicket[]>([]);
  const [liveChatSessions, setLiveChatSessions] = useState<LiveChatSession[]>([]);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [confessionCollege, setConfessionCollege] = useState<string>("All");

  const [previewIdImage, setPreviewIdImage] = useState<string | null>(null);

  // Live tab (Instagram-style inbox)
  const [liveSearch, setLiveSearch] = useState<string>("");
  const [liveStudentAlias, setLiveStudentAlias] = useState<string | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveChatSearch, setLiveChatSearch] = useState<string>("");

  // Flagged-word alerts
  const [flaggedWords, setFlaggedWords] = useState<string[]>(DEFAULT_FLAGGED_WORDS);
  const [showFlagPanel, setShowFlagPanel] = useState<boolean>(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState<boolean>(false);
  const [newFlagWord, setNewFlagWord] = useState<string>("");
  const flagRe = useMemo(() => buildFlagRegex(flaggedWords), [flaggedWords]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FLAGGED_WORDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFlaggedWords(parsed.filter((w) => typeof w === "string"));
      }
    } catch {
      // ignore – fall back to defaults
    }
  }, []);

  const saveFlaggedWords = (next: string[]) => {
    setFlaggedWords(next);
    try {
      localStorage.setItem(FLAGGED_WORDS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Which live chats contain flagged words, and how many flagged messages in total
  const flaggedSummary = useMemo(() => {
    const bySession = new Map<string, { count: number; words: string[] }>();
    let total = 0;
    liveChatSessions.forEach((s) => {
      const words = new Set<string>();
      let count = 0;
      (s.messages || []).forEach((m) => {
        const hits = getFlagHits(m.text, flagRe);
        if (hits.length > 0) {
          count += 1;
          hits.forEach((h) => words.add(h));
        }
      });
      if (count > 0) {
        bySession.set(s.sessionId, { count, words: Array.from(words) });
        total += count;
      }
    });
    return { bySession, total };
  }, [liveChatSessions, flagRe]);

  // Pop a toast when NEW flagged messages show up while the admin is watching
  const prevFlaggedTotal = useRef<number | null>(null);
  useEffect(() => {
    if (prevFlaggedTotal.current !== null && flaggedSummary.total > prevFlaggedTotal.current) {
      setToast(`🚩 ${flaggedSummary.total - prevFlaggedTotal.current} new flagged message(s) in live chats`);
      setTimeout(() => setToast(null), 3500);
    }
    prevFlaggedTotal.current = flaggedSummary.total;
  }, [flaggedSummary.total]);

  // No zooming anywhere
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
    );
    const onWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].includes(e.key)) e.preventDefault();
    };
    const stop = (e: Event) => e.preventDefault();
    const onTouch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    document.addEventListener("gesturestart", stop);
    document.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useEffect(() => {
    if (!liveStudentAlias) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [liveStudentAlias]);
  
  // Inspector Modals
  const [inspectLiveSession, setInspectLiveSession] = useState<LiveChatSession | null>(null);
  const [inspectParticipant, setInspectParticipant] = useState<{
    label: string;
    session: LiveChatSession;
  } | null>(null);
  const [inspectReportTicket, setInspectReportTicket] = useState<ReportedUserTicket | null>(null);

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

  const updateConfession = (id: string, patch: Partial<Confession> | null) => {
    const list: Confession[] = JSON.parse(localStorage.getItem(CONFESSIONS_KEY) || "[]");
    const next = patch === null ? list.filter((c) => c.id !== id) : list.map((c) => (c.id === id ? { ...c, ...patch } : c));
    localStorage.setItem(CONFESSIONS_KEY, JSON.stringify(next));
    setConfessions(next);
  };

  // "NeonMuse (♀)" -> "NeonMuse"
  const aliasFromLabel = (label: string) => label.replace(/\s*\([♂♀]\)\s*$/, "").trim();

  const statusBadge = (status?: LiveChatSession["status"]) => {
    switch (status) {
      case "deleted":
        return { text: "🗑 Deleted by student", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
      case "expired":
        return { text: "⏱ Expired", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
      case "reported":
        return { text: "🚩 Reported", cls: "bg-red-500/15 text-red-300 border-red-500/30" };
      case "unmatched":
        return { text: "💔 Student unsparked", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
      case "ended":
        return { text: "👋 Student logged out", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
      default:
        return { text: "🟢 Active", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    }
  };

  // Gather EVERYTHING we know about a student from the chat snapshot,
  // the verification queue (ID cards, ticket ID) and the students directory.
  const resolveParticipant = (label: string, session: LiveChatSession) => {
    const alias = aliasFromLabel(label);
    const snap = session.participants?.find((p) => p.alias === alias);
    const prof = students.find(
      (st) => st.alias === alias || (snap?.email && st.email === snap.email)
    );
    const acc = verificationQueue.find(
      (a) =>
        (snap?.ticketId && a.id === snap.ticketId) ||
        (snap?.email && a.email === snap.email) ||
        (prof?.email && a.email === prof.email) ||
        (prof?.id && a.id === prof.id)
    );
    return {
      alias,
      avatar: prof?.avatar,
      ticketId: snap?.ticketId || acc?.id || prof?.id,
      fullName: snap?.fullName || acc?.fullName || prof?.fullName,
      email: snap?.email || acc?.email || prof?.email,
      phone: snap?.phone || acc?.phone || prof?.phone,
      collegeName: snap?.collegeName || acc?.collegeName || prof?.collegeName,
      baseLocation: snap?.baseLocation || acc?.baseLocation || prof?.baseLocation,
      gender: snap?.gender || acc?.gender || prof?.gender,
      branch: snap?.branch || acc?.branch,
      year: snap?.year || acc?.year,
      yearDept: snap?.yearDept || prof?.yearDept,
      idFront: acc?.idCardFrontImage || prof?.idCardFrontImage,
      idBack: acc?.idCardBackImage || prof?.idCardBackImage,
      verification: acc?.verificationStatus || prof?.status,
      bio: prof?.bio,
      interests: prof?.interests?.join(", "),
      dob: prof?.dob,
    };
  };

  const syncFromCustomerApp = useCallback(() => {
    try {
      const list: Confession[] = JSON.parse(localStorage.getItem(CONFESSIONS_KEY) || "[]");
      setConfessions((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
    } catch {
      // ignore
    }
    const rawQueue = localStorage.getItem("heartlink_admin_verification_queue");
    const savedUsers = localStorage.getItem("college_dating_all_users");
    const rawReports = localStorage.getItem("heartlink_admin_reported_chats");
    const rawLiveChats = localStorage.getItem("heartlink_admin_live_chats");

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
        const parsedReports: ReportedUserTicket[] = JSON.parse(rawReports);
        setChatReports(parsedReports);
      } catch {
        // Ignore
      }
    }

    if (rawLiveChats) {
      try {
        const parsedLive: LiveChatSession[] = JSON.parse(rawLiveChats);
        setLiveChatSessions(parsedLive);
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

  // ---------------- WEEKLY SUMMARY ----------------
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("7d");
  const [summaryEmail, setSummaryEmail] = useState<string>("");
  const [firstSeen, setFirstSeen] = useState<Record<string, number>>({});
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  useEffect(() => {
    try {
      setSummaryEmail(localStorage.getItem(SUMMARY_EMAIL_KEY) || "");
    } catch {
      // ignore
    }
  }, []);

  // Older records have no exact date, so remember when the admin first saw each one.
  useEffect(() => {
    let stored: Record<string, number> = {};
    try {
      stored = JSON.parse(localStorage.getItem(FIRST_SEEN_KEY) || "{}") || {};
    } catch {
      stored = {};
    }
    const now = Date.now();
    const next = { ...stored };
    let changed = false;
    const mark = (k: string) => {
      if (!next[k]) {
        next[k] = now;
        changed = true;
      }
    };
    verificationQueue.forEach((a) => mark(`acc:${a.id || a.email}`));
    liveChatSessions.forEach((s) => mark(`sess:${s.sessionId}`));
    chatReports.forEach((r) => mark(`rep:${r.id}`));
    if (changed) {
      try {
        localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setFirstSeen((prev) => (Object.keys(prev).length === Object.keys(next).length ? prev : next));
  }, [verificationQueue, liveChatSessions, chatReports]);

  const accountTime = (a: StudentAccount) => a.createdAt ?? firstSeen[`acc:${a.id || a.email}`] ?? Date.now();
  const sessionTime = (s: LiveChatSession) => s.startedAtMs ?? firstSeen[`sess:${s.sessionId}`] ?? Date.now();
  const reportTime = (r: ReportedUserTicket) => firstSeen[`rep:${r.id}`] ?? Date.now();
  const fmtDate = (t: number) =>
    new Date(t).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const weekly = useMemo(() => {
    const since = summaryRange === "all" ? 0 : Date.now() - (summaryRange === "7d" ? 7 : 30) * DAY_MS;
    const signups = verificationQueue
      .filter((a) => accountTime(a) >= since)
      .sort((a, b) => accountTime(b) - accountTime(a));
    const matches = liveChatSessions
      .filter((s) => sessionTime(s) >= since)
      .sort((a, b) => sessionTime(b) - sessionTime(a));
    const reports = chatReports
      .filter((r) => reportTime(r) >= since)
      .sort((a, b) => reportTime(b) - reportTime(a));
    let messages = 0;
    let flagged = 0;
    liveChatSessions.forEach((s) =>
      (s.messages || []).forEach((m) => {
        if ((m.createdAt ?? sessionTime(s)) >= since) {
          messages += 1;
          if (getFlagHits(m.text, flagRe).length > 0) flagged += 1;
        }
      })
    );
    const status = (a: StudentAccount) => a.verificationStatus || a.status || "pending";
    return {
      signups,
      matches,
      reports,
      messages,
      flagged,
      verified: signups.filter((a) => status(a) === "verified").length,
      pending: signups.filter((a) => status(a) === "pending" || status(a) === "unverified").length,
      rejected: signups.filter((a) => status(a) === "rejected" || status(a) === "blocked").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationQueue, liveChatSessions, chatReports, summaryRange, firstSeen, flagRe]);

  const rangeLabel = summaryRange === "7d" ? "Last 7 days" : summaryRange === "30d" ? "Last 30 days" : "All time";

  const buildSummaryText = () => {
    const L: string[] = [];
    L.push(`CampusSpark - Weekly Summary (${rangeLabel})`);
    L.push(`Generated: ${new Date().toLocaleString()}`);
    L.push("");
    L.push(`New sign-ups: ${weekly.signups.length} (verified ${weekly.verified}, pending ${weekly.pending}, rejected/blocked ${weekly.rejected})`);
    L.push(`New matches: ${weekly.matches.length}`);
    L.push(`Messages sent: ${weekly.messages} (flagged-word messages: ${weekly.flagged})`);
    L.push(`Reports filed: ${weekly.reports.length}`);
    L.push("");
    L.push("Students who signed up:");
    if (weekly.signups.length === 0) L.push("- none");
    weekly.signups.forEach((a) =>
      L.push(`- ${a.fullName || "(no name)"} | ${a.email} | ${a.phone || a.phoneMasked || "-"} | ${a.collegeName || "-"} | ${a.verificationStatus || a.status || "pending"}`)
    );
    L.push("");
    L.push("Reports:");
    if (weekly.reports.length === 0) L.push("- none");
    weekly.reports.forEach((r) => L.push(`- ${r.reporterAlias} reported ${r.reportedAlias}: ${r.reason}`));
    return L.join("\n");
  };

  const emailSummary = () => {
    const to = summaryEmail.trim();
    if (!to || !to.includes("@")) {
      triggerToast("Enter an email address to send the summary to");
      return;
    }
    const body = buildSummaryText();
    const trimmed = body.length > 1700 ? body.slice(0, 1700) + "\n...(copy or download CSV for the full list)" : body;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(`CampusSpark weekly summary (${rangeLabel})`)}&body=${encodeURIComponent(trimmed)}`;
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      triggerToast("Summary copied");
    } catch {
      triggerToast("Could not copy - select and copy manually");
    }
  };

  const downloadSignupsCsv = () => {
    const esc = (v: string | undefined) => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = [
      ["Signed up", "Full name", "Email", "Phone", "College", "Location", "Branch", "Year", "Login method", "Status"].join(","),
      ...weekly.signups.map((a) =>
        [
          esc(new Date(accountTime(a)).toLocaleString()),
          esc(a.fullName),
          esc(a.email),
          esc(a.phone || a.phoneMasked),
          esc(a.collegeName),
          esc(a.baseLocation),
          esc(a.branch),
          esc(a.year),
          esc(a.authProvider),
          esc(a.verificationStatus || a.status),
        ].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campusspark-signups-${summaryRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openStudentDetail = (a: StudentAccount) => {
    const profile = students.find((s) => s.id === a.id || (!!s.email && s.email === a.email));
    setDetailTarget({ account: a, profile });
  };

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

  const dismissReport = (ticketId: string) => {
    const updatedReports = chatReports.filter((r) => r.id !== ticketId);
    setChatReports(updatedReports);
    localStorage.setItem("heartlink_admin_reported_chats", JSON.stringify(updatedReports));
    triggerToast("Report dismissed and removed from queue.");
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

      {/* STUDENT DETAILS MODAL (opened by clicking a name in Live chats) */}
      {inspectParticipant && (() => {
        const d = resolveParticipant(inspectParticipant.label, inspectParticipant.session);
        const rows: [string, string | undefined][] = [
          ["Full Name", d.fullName],
          ["Alias / Username", d.alias],
          ["Student / Ticket ID", d.ticketId],
          ["College / School", d.collegeName],
          ["Degree & Branch", d.branch || d.yearDept],
          ["Study Year", d.year],
          ["Gender", d.gender],
          ["Email", d.email],
          ["Mobile Number", d.phone],
          ["Base Location", d.baseLocation],
          ["Verification Status", d.verification],
          ["Date of Birth", d.dob],
          ["Bio", d.bio],
          ["Interests", d.interests],
        ];
        return (
          <div
            onClick={() => setInspectParticipant(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{d.avatar || "👤"}</span>
                  <div>
                    <h3 className="font-bold text-sm text-pink-400">Student Details</h3>
                    <p className="text-[11px] text-slate-400">@{d.alias}</p>
                  </div>
                </div>
                <button onClick={() => setInspectParticipant(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-1 border-b border-slate-800/70 last:border-0">
                    <span className="text-slate-400 shrink-0">{k}:</span>
                    <span className="font-semibold text-white text-right break-all">{v || "Not available"}</span>
                  </div>
                ))}
              </div>

              {(d.idFront || d.idBack) ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h4 className="text-pink-400 font-bold uppercase tracking-wider text-[11px]">🪪 College ID Card</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {d.idFront && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Front (click to enlarge)</p>
                        <img src={d.idFront} alt="ID front" onClick={() => setPreviewIdImage(d.idFront as string)} className="w-full h-28 object-cover rounded-xl border border-slate-700 cursor-pointer" />
                      </div>
                    )}
                    {d.idBack && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Back (click to enlarge)</p>
                        <img src={d.idBack} alt="ID back" onClick={() => setPreviewIdImage(d.idBack as string)} className="w-full h-28 object-cover rounded-xl border border-slate-700 cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center">No college ID card images on record for this student.</p>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* INSPECT LIVE CHAT SESSION MODAL */}
      {inspectLiveSession && (
        <div
          onClick={() => setInspectLiveSession(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-sky-400 flex items-center gap-1.5">
                  <span>💬 Chat:</span>
                  <button
                    onClick={() => setInspectParticipant({ label: inspectLiveSession.userAlias, session: inspectLiveSession })}
                    className="underline decoration-dotted hover:text-pink-400 cursor-pointer"
                  >
                    {inspectLiveSession.userAlias}
                  </button>
                  <span>↔</span>
                  <button
                    onClick={() => setInspectParticipant({ label: inspectLiveSession.targetAlias, session: inspectLiveSession })}
                    className="underline decoration-dotted hover:text-pink-400 cursor-pointer"
                  >
                    {inspectLiveSession.targetAlias}
                  </button>
                </h3>
                <p className="text-[11px] text-slate-400">Student: {inspectLiveSession.userEmail} • {inspectLiveSession.college}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {statusBadge(inspectLiveSession.status).text}
                  {inspectLiveSession.startedAt ? ` • Started: ${inspectLiveSession.startedAt}` : ""}
                  {inspectLiveSession.endedAt ? ` • Ended: ${inspectLiveSession.endedAt}` : ""}
                </p>
                <p className="text-[10px] text-pink-400 mt-0.5">👆 Click a name to see the student&apos;s full details</p>
              </div>
              <button onClick={() => setInspectLiveSession(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 max-h-80 overflow-y-auto space-y-2.5 border border-slate-800">
              {inspectLiveSession.messages && inspectLiveSession.messages.length > 0 ? (
                inspectLiveSession.messages.map((m) => {
                  const hits = getFlagHits(m.text, flagRe);
                  return (
                    <div
                      key={m.id}
                      className={`text-xs p-2.5 rounded-xl border space-y-1 ${
                        hits.length > 0 ? "bg-red-950/40 border-red-500/70" : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex justify-between font-bold text-[10px] text-pink-400">
                        <span>{m.senderAlias}</span>
                        <span className="text-slate-500">{m.timestamp}</span>
                      </div>
                      {hits.length > 0 && (
                        <p className="text-[9px] font-bold text-red-300">🚩 Flagged: {hits.join(", ")}</p>
                      )}
                      <p className="text-slate-200"><HighlightedText text={m.text} re={flagRe} /></p>
                      <MsgExtras m={m} />
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">No messages recorded in this session yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT REPORTED TICKET MODAL */}
      {inspectReportTicket && (
        <div
          onClick={() => setInspectReportTicket(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-rose-400">🚩 Report Ticket: {inspectReportTicket.id}</h3>
                <p className="text-[11px] text-slate-400">Reported User: <strong className="text-white">{inspectReportTicket.reportedAlias}</strong></p>
              </div>
              <button onClick={() => setInspectReportTicket(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕ Close</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                <strong>Reporter:</strong> {inspectReportTicket.reporterAlias} ({inspectReportTicket.reporterEmail}) • {inspectReportTicket.reportedAt}
              </p>
              <p className="text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                <strong>Violation Reason:</strong> {inspectReportTicket.reason}
              </p>

              <div>
                <p className="font-bold text-slate-400 mb-1.5">Complete Chat History (Start to Finish):</p>
                <div className="bg-slate-950 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-2.5 border border-slate-800">
                  {inspectReportTicket.chatHistory && inspectReportTicket.chatHistory.length > 0 ? (
                    inspectReportTicket.chatHistory.map((m) => {
                      const hits = getFlagHits(m.text, flagRe);
                      return (
                        <div
                          key={m.id}
                          className={`text-xs p-2.5 rounded-xl border space-y-1 ${
                            hits.length > 0 ? "bg-red-950/40 border-red-500/70" : "bg-slate-900 border-slate-800"
                          }`}
                        >
                          <div className="flex justify-between font-bold text-[10px] text-pink-400">
                            <span>{m.senderAlias}</span>
                            <span className="text-slate-500">{m.timestamp}</span>
                          </div>
                          {hits.length > 0 && (
                            <p className="text-[9px] font-bold text-red-300">🚩 Flagged: {hits.join(", ")}</p>
                          )}
                          <p className="text-slate-200"><HighlightedText text={m.text} re={flagRe} /></p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">No chat log attached.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              {students.find((s) => s.alias === inspectReportTicket.reportedAlias) && (
                <button
                  onClick={() => {
                    const offending = students.find((s) => s.alias === inspectReportTicket.reportedAlias);
                    if (offending) blockStudent(offending.id);
                    setInspectReportTicket(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  🚨 Block Offending Student ID
                </button>
              )}
              <button
                onClick={() => {
                  dismissReport(inspectReportTicket.id);
                  setInspectReportTicket(null);
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer"
              >
                Dismiss Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Student Modal */}
      {detailTarget && (() => {
        const a = detailTarget.account;
        const p = detailTarget.profile;
        const email = a?.email || p?.email || "";
        const alias = p?.alias || "";
        const mySessions = liveChatSessions.filter(
          (s) =>
            (!!email && (s.userEmail === email || (s.participants || []).some((x) => x.email === email))) ||
            (!!alias && (s.userAlias === alias || s.targetAlias === alias))
        );
        const reportsAgainst = chatReports.filter((r) => !!alias && r.reportedAlias === alias);
        const reportsBy = chatReports.filter((r) => !!email && r.reporterEmail === email);
        let sentCount = 0;
        let flaggedCount = 0;
        mySessions.forEach((s) =>
          (s.messages || []).forEach((m) => {
            if (alias && aliasFromLabel(m.senderAlias) === alias) {
              sentCount += 1;
              if (getFlagHits(m.text, flagRe).length > 0) flaggedCount += 1;
            }
          })
        );
        const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
          <div className="flex justify-between gap-4 py-1 border-b border-slate-800/60 text-xs">
            <span className="text-slate-400">{k}</span>
            <span className="text-slate-100 text-right break-all">{v || "—"}</span>
          </div>
        );
        const frontImg = a?.idCardFrontImage || p?.idCardFrontImage;
        const backImg = a?.idCardBackImage || p?.idCardBackImage;
        return (
          <div
            onClick={() => setDetailTarget(null)}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{p?.avatar || "🎓"}</span>
                  <div>
                    <h3 className="font-bold text-base text-pink-400">{a?.fullName || p?.fullName || "Student"}</h3>
                    <p className="text-[11px] text-slate-400">{alias ? `@${alias}` : "No profile alias yet"}</p>
                  </div>
                </div>
                <button onClick={() => setDetailTarget(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "Chats", v: mySessions.length },
                  { l: "Messages sent", v: sentCount },
                  { l: "Flagged msgs", v: flaggedCount },
                ].map((x) => (
                  <div key={x.l} className="bg-slate-950 border border-slate-800 rounded-xl py-2">
                    <p className={`text-xl font-bold ${x.l === "Flagged msgs" && x.v > 0 ? "text-red-400" : "text-white"}`}>{x.v}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{x.l}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-300 uppercase mb-1">Account</p>
                <Row k="Signed up" v={a ? new Date(accountTime(a)).toLocaleString() : undefined} />
                <Row k="Email" v={email} />
                <Row k="Phone" v={a?.phone || p?.phone || a?.phoneMasked} />
                <Row k="Login method" v={a?.authProvider === "google_oauth" ? "Google" : a?.authProvider === "email_otp" ? "Email OTP" : a?.authProvider} />
                <Row k="Verification status" v={a?.verificationStatus || a?.status || p?.status} />
                <Row k="Duplicate ID flag" v={a?.isDuplicateId ? "⚠ Yes" : "No"} />
                <Row k="Account ID" v={a?.id || p?.id} />
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-300 uppercase mb-1">Personal &amp; college</p>
                <Row k="Full name" v={a?.fullName || p?.fullName} />
                <Row k="Gender" v={a?.gender || p?.gender} />
                <Row k="Date of birth" v={p?.dob} />
                <Row k="College" v={a?.collegeName || p?.collegeName} />
                <Row k="Base location" v={a?.baseLocation || p?.baseLocation} />
                <Row k="Branch" v={a?.branch} />
                <Row k="Year" v={a?.year} />
                <Row k="Dept &amp; year (profile)" v={p?.yearDept} />
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-300 uppercase mb-1">Profile</p>
                <Row k="Alias" v={alias} />
                <Row k="Bio" v={p?.bio} />
                <Row k="Interests" v={p?.interests && p.interests.length > 0 ? p.interests.join(", ") : undefined} />
                <Row k="Profile status" v={p?.status} />
              </div>

              {(frontImg || backImg) && (
                <div>
                  <p className="text-[11px] font-bold text-slate-300 uppercase mb-2">College ID (click to enlarge)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {frontImg && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={frontImg} alt="Front ID" onClick={() => setPreviewIdImage(frontImg)} className="rounded-xl border border-slate-700 cursor-pointer max-h-40 w-full object-cover" />
                    )}
                    {backImg && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={backImg} alt="Back ID" onClick={() => setPreviewIdImage(backImg)} className="rounded-xl border border-slate-700 cursor-pointer max-h-40 w-full object-cover" />
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold text-slate-300 uppercase mb-1">Chats ({mySessions.length})</p>
                {mySessions.length === 0 ? (
                  <p className="text-xs text-slate-500">No chats yet.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {mySessions.map((s) => (
                      <div
                        key={s.sessionId}
                        onClick={() => {
                          setDetailTarget(null);
                          setInspectLiveSession(s);
                        }}
                        className="flex justify-between text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:border-pink-500"
                      >
                        <span className="truncate">{s.userAlias} ↔ {s.targetAlias}</span>
                        <span className="text-slate-500 flex-shrink-0">{(s.messages || []).length} msgs · {s.status || "active"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Reports (against: {reportsAgainst.length} · filed: {reportsBy.length})
                </p>
                {reportsAgainst.length + reportsBy.length === 0 ? (
                  <p className="text-xs text-slate-500">No reports involving this student.</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {[...reportsAgainst.map((r) => ({ r, kind: "Against" })), ...reportsBy.map((r) => ({ r, kind: "Filed" }))].map(({ r, kind }) => (
                      <div
                        key={kind + r.id}
                        onClick={() => {
                          setDetailTarget(null);
                          setInspectReportTicket(r);
                        }}
                        className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:border-red-500"
                      >
                        <span className="text-red-300 font-semibold">{kind}:</span> {r.reporterAlias} → {r.reportedAlias} · {r.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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

          {/* Navigation Tabs with LIVE Option beside ID Requests */}
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveSection("verifications")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "verifications"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🪪 ID Requests ({pendingVerifications.length})
            </button>
            <button
              onClick={() => setActiveSection("live_chats")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeSection === "live_chats"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                  : "text-sky-400 bg-sky-500/10 hover:bg-sky-500/20"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
              🔴 Live ({liveChatSessions.length})
              {flaggedSummary.total > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold animate-pulse">
                  🚩 {flaggedSummary.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSection("students")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "students"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Students ({filteredStudents.length})
            </button>
            <button
              onClick={() => setActiveSection("reports")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "reports"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🚩 Flagged ({flaggedList.length})
            </button>
            <button
              onClick={() => setActiveSection("blocked")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "blocked"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🚨 Reports &amp; Blocked ({chatReports.length + blockedList.length})
            </button>
            <button
              onClick={() => setActiveSection("confessions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "confessions"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🤫 Confessions ({confessions.length})
            </button>
            <button
              onClick={() => setActiveSection("weekly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "weekly"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📅 Weekly ({weekly.signups.length})
            </button>
            <button
              onClick={() => setActiveSection("events")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSection === "events"
                  ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Config
            </button>
          </div>

          {/* Design Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">UI:</span>
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
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
              🔄 Sync
            </button>
          </div>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Pending ID Queue</p>
            <p className="text-3xl font-bold mt-1 text-amber-400">{pendingVerifications.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Live Active Chats</p>
            <p className="text-3xl font-bold mt-1 text-sky-400">{liveChatSessions.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Approved Students</p>
            <p className="text-3xl font-bold mt-1 text-emerald-400">{approvedList.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase">Chat Reports</p>
            <p className="text-3xl font-bold mt-1 text-red-500">{chatReports.length}</p>
          </div>
          <div
            onClick={() => { setActiveSection("live_chats"); setShowFlaggedOnly(true); }}
            className={`rounded-2xl p-5 border cursor-pointer transition ${
              flaggedSummary.total > 0
                ? "bg-red-950/40 border-red-500/60 hover:bg-red-950/60"
                : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <p className="text-xs text-slate-400 uppercase">Flagged-Word Msgs</p>
            <p className={`text-3xl font-bold mt-1 ${flaggedSummary.total > 0 ? "text-red-400" : "text-slate-500"}`}>
              {flaggedSummary.total}
            </p>
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

        {/* 🔴 LIVE — INSTAGRAM-STYLE STUDENT INBOX */}
        {activeSection === "live_chats" && (() => {
          type LiveEntry = { alias: string; fullName: string; hasRealName: boolean; avatar?: string; sessions: LiveChatSession[] };
          const emptySession: LiveChatSession = {
            sessionId: "", userEmail: "", userAlias: "", targetAlias: "", college: "", lastActive: "", messages: [],
          };
          const map = new Map<string, LiveEntry>();
          students.forEach((st) => {
            map.set(st.alias, {
              alias: st.alias,
              fullName: st.fullName || st.alias,
              hasRealName: !!st.fullName,
              avatar: st.avatar,
              sessions: [],
            });
          });
          liveChatSessions.forEach((s) => {
            [s.userAlias, s.targetAlias].forEach((label) => {
              const alias = aliasFromLabel(label);
              const r = resolveParticipant(label, s);
              let e = map.get(alias);
              if (!e) {
                e = { alias, fullName: r.fullName || alias, hasRealName: !!r.fullName, avatar: r.avatar, sessions: [] };
                map.set(alias, e);
              } else if (r.fullName) {
                e.fullName = r.fullName;
                e.hasRealName = true;
              }
              e.sessions.push(s);
            });
          });

          const all = Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
          const q = liveSearch.trim().toLowerCase();
          const visible = q
            ? all.filter((e) => {
                const st = students.find((x) => x.alias === e.alias);
                return (
                  e.fullName.toLowerCase().includes(q) ||
                  e.alias.toLowerCase().includes(q) ||
                  (st?.email || "").toLowerCase().includes(q) ||
                  (st?.phone || "").includes(q) ||
                  (st?.collegeName || "").toLowerCase().includes(q)
                );
              })
            : all;

          // Flagged messages SENT by a given student (across all their chats)
          const flaggedSentBy = (e: LiveEntry) =>
            e.sessions.reduce(
              (n, s) =>
                n +
                (s.messages || []).filter(
                  (m) => aliasFromLabel(m.senderAlias) === e.alias && getFlagHits(m.text, flagRe).length > 0
                ).length,
              0
            );
          const visibleList = showFlaggedOnly
            ? visible.filter((e) => e.sessions.some((s) => flaggedSummary.bySession.has(s.sessionId)))
            : visible;

          const openProfile = (alias: string, session?: LiveChatSession) =>
            setInspectParticipant({ label: alias, session: session || emptySession });

          const selected = liveStudentAlias ? map.get(liveStudentAlias) : undefined;
          const partnerOf = (s: LiveChatSession, me: string) => {
            const otherLabel = aliasFromLabel(s.userAlias) === me ? s.targetAlias : s.userAlias;
            const alias = aliasFromLabel(otherLabel);
            return map.get(alias) || { alias, fullName: alias, hasRealName: false, sessions: [] as LiveChatSession[] };
          };
          const lastMsg = (s: LiveChatSession) =>
            s.messages && s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
          const activeSession = selected && liveSessionId
            ? selected.sessions.find((s) => s.sessionId === liveSessionId)
            : undefined;

          const closeLiveModal = () => {
            setLiveStudentAlias(null);
            setLiveSessionId(null);
            setLiveChatSearch("");
          };
          const cq = liveChatSearch.trim().toLowerCase();
          const sessionMatches = (sess: LiveChatSession) => {
            if (!selected || !cq) return true;
            const partner = partnerOf(sess, selected.alias);
            return (
              partner.fullName.toLowerCase().includes(cq) ||
              (sess.messages || []).some((m) => m.text.toLowerCase().includes(cq))
            );
          };

          return (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>🔴 Live — All Students</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                </h2>
                <p className="text-xs text-slate-400">Click a student to open their chats in a new window. Chats are never removed from here.</p>
              </div>

              {/* FLAGGED-WORD ALERT BAR */}
              <div
                className={`rounded-2xl border p-3 space-y-3 ${
                  flaggedSummary.total > 0 ? "bg-red-950/30 border-red-500/50" : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-red-300">
                    {flaggedSummary.total > 0
                      ? `🚩 ${flaggedSummary.total} flagged message${flaggedSummary.total === 1 ? "" : "s"} in ${flaggedSummary.bySession.size} chat${flaggedSummary.bySession.size === 1 ? "" : "s"}`
                      : "✅ No flagged words in any chat"}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowFlaggedOnly((v) => !v)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border ${
                      showFlaggedOnly
                        ? "bg-red-600 text-white border-red-400"
                        : "bg-slate-950 text-slate-300 border-slate-700 hover:border-red-500"
                    }`}
                  >
                    {showFlaggedOnly ? "Showing flagged only" : "Show flagged only"}
                  </button>
                  <button
                    onClick={() => setShowFlagPanel((v) => !v)}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer bg-slate-950 text-slate-300 border border-slate-700 hover:border-sky-500"
                  >
                    ⚙️ Flagged words ({flaggedWords.length})
                  </button>
                </div>

                {showFlagPanel && (
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFlagWord}
                        onChange={(e) => setNewFlagWord(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const w = newFlagWord.trim().toLowerCase();
                            if (w && !flaggedWords.includes(w)) saveFlaggedWords([...flaggedWords, w]);
                            setNewFlagWord("");
                          }
                        }}
                        placeholder="Add a word or phrase and press Enter..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={() => {
                          const w = newFlagWord.trim().toLowerCase();
                          if (w && !flaggedWords.includes(w)) saveFlaggedWords([...flaggedWords, w]);
                          setNewFlagWord("");
                        }}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer hover:bg-red-500"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => saveFlaggedWords(DEFAULT_FLAGGED_WORDS)}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer hover:bg-slate-700"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {flaggedWords.map((w) => (
                        <span
                          key={w}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-200 text-[10px]"
                        >
                          {w}
                          <button
                            onClick={() => saveFlaggedWords(flaggedWords.filter((x) => x !== w))}
                            className="text-red-300 hover:text-white cursor-pointer"
                            aria-label={`Remove ${w}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                placeholder="🔍 Search student by name, email, mobile or college..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />

              {visibleList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
                  <div className="text-3xl">📡</div>
                  <h3 className="font-bold text-sm text-slate-300">
                    {showFlaggedOnly ? "No flagged chats right now" : "No students found"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {showFlaggedOnly
                      ? "Chats that contain a flagged word will appear here."
                      : "Students appear here as they sign up and chat in the student portal."}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
                  {visibleList.map((e) => {
                    const sentFlags = flaggedSentBy(e);
                    return (
                    <div
                      key={e.alias}
                      onClick={() => { setLiveStudentAlias(e.alias); setLiveSessionId(null); setLiveChatSearch(""); }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 cursor-pointer transition ${
                        sentFlags > 0 ? "bg-red-950/30 border-l-4 border-red-500" : ""
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                        {e.avatar || "👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{e.fullName}</p>
                        {!e.hasRealName && <p className="text-[10px] text-amber-400">Real name not available</p>}
                      </div>
                      {sentFlags > 0 && (
                        <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                          🚩 {sentFlags}
                        </span>
                      )}
                      <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                        {e.sessions.length} chat{e.sessions.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* STUDENT CHATS POPUP WINDOW */}
              {selected && (
                <div
                  onClick={closeLiveModal}
                  className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full ${activeSession ? "h-[90vh]" : "max-h-[90vh]"} flex flex-col shadow-2xl overflow-hidden`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
                      {activeSession && (
                        <button
                          onClick={() => { setLiveSessionId(null); setLiveChatSearch(""); }}
                          className="text-slate-400 hover:text-white text-sm cursor-pointer"
                        >
                          ←
                        </button>
                      )}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 border border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                        {selected.avatar || "👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{selected.fullName}</p>
                        <p className="text-[10px] text-slate-400">
                          {selected.sessions.length} conversation{selected.sessions.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        onClick={() => openProfile(selected.alias, selected.sessions[0])}
                        className="px-3 py-1.5 rounded-lg bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-semibold hover:bg-pink-600/30 cursor-pointer"
                      >
                        👤 Profile
                      </button>
                      <button onClick={closeLiveModal} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
                    </div>

                    {/* Search inside chats */}
                    <div className="px-5 py-3 border-b border-slate-800 shrink-0">
                      <input
                        type="text"
                        value={liveChatSearch}
                        onChange={(e) => setLiveChatSearch(e.target.value)}
                        placeholder={activeSession ? "🔍 Search in this chat..." : "🔍 Search chats by name or message..."}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* Top strip: everyone this student has texted */}
                    {!activeSession && selected.sessions.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto px-5 py-3 border-b border-slate-800 shrink-0">
                        {selected.sessions.filter(sessionMatches).map((sess) => {
                          const partner = partnerOf(sess, selected.alias);
                          const isOpen = sess.sessionId === liveSessionId;
                          return (
                            <button
                              key={sess.sessionId}
                              onClick={() => setLiveSessionId(sess.sessionId)}
                              className="flex flex-col items-center gap-1 flex-shrink-0 w-20 cursor-pointer"
                            >
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 ${
                                flaggedSummary.bySession.has(sess.sessionId)
                                  ? "border-red-500 bg-red-500/20 animate-pulse"
                                  : isOpen ? "border-sky-400 bg-sky-500/20" : "border-slate-700 bg-slate-900 hover:border-pink-500"
                              }`}>
                                {partner.avatar || "👤"}
                              </div>
                              <span className={`text-[10px] truncate w-full text-center ${isOpen ? "text-sky-300 font-bold" : "text-slate-300"}`}>
                                {partner.fullName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Body */}
                    <div className={`flex-1 min-h-0 overscroll-contain ${activeSession ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
                      {activeSession ? (() => {
                        const partner = partnerOf(activeSession, selected.alias);
                        const msgs = (activeSession.messages || []).filter(
                          (m) => !cq || m.text.toLowerCase().includes(cq)
                        );
                        return (
                          <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 shrink-0">
                              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
                                {partner.avatar || "👤"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{partner.fullName}</p>
                                <p className="text-[10px] text-slate-500">
                                  {statusBadge(activeSession.status).text}
                                  {activeSession.startedAt ? ` • Started: ${activeSession.startedAt}` : ""}
                                  {activeSession.endedAt ? ` • Ended: ${activeSession.endedAt}` : ""}
                                </p>
                              </div>
                              <button
                                onClick={() => openProfile(partner.alias, activeSession)}
                                className="px-3 py-1.5 rounded-lg bg-pink-600/20 border border-pink-500/40 text-pink-300 text-xs font-semibold hover:bg-pink-600/30 cursor-pointer"
                              >
                                👤 Profile
                              </button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-2 bg-slate-950">
                              {msgs.length > 0 ? (
                                msgs.map((m) => {
                                  const mine = aliasFromLabel(m.senderAlias) === selected.alias;
                                  const hits = getFlagHits(m.text, flagRe);
                                  return (
                                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${mine ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white" : "bg-slate-800 text-slate-100"} ${hits.length > 0 ? "ring-2 ring-red-500 shadow-lg shadow-red-500/30" : ""}`}>
                                        {hits.length > 0 && (
                                          <p className="text-[9px] font-bold text-red-300 bg-red-950/70 rounded px-1.5 py-0.5 mb-1 inline-block">
                                            🚩 Flagged: {hits.join(", ")}
                                          </p>
                                        )}
                                        <p><HighlightedText text={m.text} re={flagRe} /></p>
                                        <MsgExtras m={m} />
                                        <p className="text-[9px] opacity-60 mt-1 text-right">{m.timestamp}</p>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-slate-500 text-center py-8">
                                  {cq ? "No messages match your search." : "No messages recorded in this chat yet."}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })() : selected.sessions.length === 0 ? (
                        <div className="p-10 text-center space-y-2">
                          <div className="text-3xl">💤</div>
                          <p className="text-xs text-slate-400">{selected.fullName} has not texted anyone yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800">
                          {selected.sessions.filter(sessionMatches).map((sess) => {
                            const partner = partnerOf(sess, selected.alias);
                            const lm = lastMsg(sess);
                            return (
                              <div
                                key={sess.sessionId}
                                onClick={() => setLiveSessionId(sess.sessionId)}
                                className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-800/60 cursor-pointer transition ${
                                  flaggedSummary.bySession.has(sess.sessionId) ? "bg-red-950/30 border-l-4 border-red-500" : ""
                                }`}
                              >
                                <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                                  {partner.avatar || "👤"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{partner.fullName}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{lm ? lm.text : "No messages yet"}</p>
                                  {flaggedSummary.bySession.has(sess.sessionId) && (
                                    <p className="text-[10px] text-red-300 truncate">
                                      🚩 {flaggedSummary.bySession.get(sess.sessionId)!.count} flagged •{" "}
                                      {flaggedSummary.bySession.get(sess.sessionId)!.words.slice(0, 4).join(", ")}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0 space-y-1">
                                  <p className="text-[9px] text-sky-400 font-mono">{sess.lastActive}</p>
                                  <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-semibold ${statusBadge(sess.status).cls}`}>
                                    {statusBadge(sess.status).text}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {selected.sessions.filter(sessionMatches).length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-8">No chats match your search.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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

        {/* 🚨 COMPACT REPORTS & BLOCKED SECTION */}
        {activeSection === "blocked" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">🚨 Chat Reports &amp; Blocked Students</h2>
              <p className="text-xs text-slate-400">Compact summary of reports. Click any report ticket to inspect who reported whom and review the full chat log.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400">💬 Active Reported Chat Tickets ({chatReports.length})</h3>
              {chatReports.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">No active chat reports.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {chatReports.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setInspectReportTicket(ticket)}
                      className="bg-slate-900 border border-amber-500/40 hover:border-amber-500/80 rounded-2xl p-4 space-y-2 shadow-lg cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="space-y-1 truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">🚩</span>
                          <h4 className="font-bold text-xs text-amber-300 truncate">
                            {ticket.reporterAlias} ➔ {ticket.reportedAlias}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Reason: {ticket.reason}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{ticket.reportedAt}</p>
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-base flex-shrink-0 shadow">
                        📋
                      </div>
                    </div>
                  ))}
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
        {activeSection === "confessions" && (() => {
          const colleges = Array.from(new Set(confessions.map((c) => c.college))).sort();
          const shown = confessions
            .filter((c) => confessionCollege === "All" || c.college === confessionCollege)
            .sort((a, b) => b.createdAt - a.createdAt);
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">🤫 Anonymous Confessions</h2>
                  <p className="text-xs text-slate-400">
                    Students see these as anonymous. Only you can see who wrote them. Posts with 3+ reports are auto-hidden from students.
                  </p>
                </div>
                <select
                  value={confessionCollege}
                  onChange={(e) => setConfessionCollege(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 max-w-[260px]"
                >
                  <option value="All">All colleges</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {shown.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
                  No confessions yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {shown.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-2xl border p-4 space-y-3 bg-slate-900 ${
                        c.hidden ? "border-rose-500/50 opacity-70" : c.reports.length > 0 ? "border-amber-500/50" : "border-slate-800"
                      }`}
                    >
                      <div className={`rounded-xl p-3 bg-gradient-to-br ${CONFESSION_THEMES[c.theme % CONFESSION_THEMES.length]} text-white text-sm font-semibold whitespace-pre-wrap break-words`}>
                        {c.text}
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p>🏫 {c.college}</p>
                        <p>✍️ Author: <span className="text-slate-200 font-semibold">{c.authorAlias}</span> <span className="text-slate-500">({c.authorId})</span></p>
                        <p>🕒 {new Date(c.createdAt).toLocaleString()}</p>
                        <p>
                          ❤️ {Object.keys(c.reactions).length} reactions · 🚩 {c.reports.length} report{c.reports.length === 1 ? "" : "s"}
                          {c.hidden ? " · 🙈 Hidden by admin" : c.reports.length >= 3 ? " · 🙈 Auto-hidden" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const restoring = !!c.hidden || c.reports.length >= 3;
                            updateConfession(c.id, restoring ? { hidden: false, reports: [] } : { hidden: true });
                            triggerToast(restoring ? "Confession restored" : "Confession hidden from students");
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          {c.hidden || c.reports.length >= 3 ? "👁 Restore" : "🙈 Hide"}
                        </button>
                        <button
                          onClick={() => {
                            updateConfession(c.id, null);
                            triggerToast("Confession deleted");
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold cursor-pointer"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {activeSection === "weekly" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">📅 Weekly Summary</h2>
                <p className="text-xs text-slate-400">Sign-ups, matches and reports. Click any student to see every detail.</p>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    { id: "7d", label: "Last 7 days" },
                    { id: "30d", label: "Last 30 days" },
                    { id: "all", label: "All time" },
                  ] as { id: SummaryRange; label: string }[]
                ).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSummaryRange(r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      summaryRange === r.id ? "bg-pink-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "New sign-ups", value: weekly.signups.length, sub: `${weekly.verified} verified · ${weekly.pending} pending`, color: "text-emerald-400" },
                { label: "New matches", value: weekly.matches.length, sub: "chats started", color: "text-pink-400" },
                { label: "Messages", value: weekly.messages, sub: "sent in this period", color: "text-sky-400" },
                { label: "Flagged messages", value: weekly.flagged, sub: "contain flagged words", color: "text-red-400" },
                { label: "Reports", value: weekly.reports.length, sub: "filed by students", color: "text-amber-400" },
              ].map((c) => (
                <div key={c.label} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{c.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* EMAIL / EXPORT */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-bold">📧 Send this summary</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  value={summaryEmail}
                  onChange={(e) => {
                    setSummaryEmail(e.target.value);
                    try {
                      localStorage.setItem(SUMMARY_EMAIL_KEY, e.target.value);
                    } catch {
                      // ignore
                    }
                  }}
                  placeholder="Your email address..."
                  className="flex-1 min-w-[220px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <button onClick={emailSummary} className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 text-white text-xs font-semibold cursor-pointer">
                  Email me this summary
                </button>
                <button onClick={copySummary} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs cursor-pointer hover:bg-slate-700">
                  Copy
                </button>
                <button onClick={downloadSignupsCsv} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs cursor-pointer hover:bg-slate-700">
                  ⬇ Sign-ups CSV
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                &quot;Email me&quot; opens your mail app with the summary filled in. Fully automatic weekly emails need a server.
              </p>
            </div>

            {/* NEW SIGN-UPS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm">🧑‍🎓 Students who signed up ({weekly.signups.length})</h3>
                <span className="text-[10px] text-slate-500">{rangeLabel}</span>
              </div>
              {weekly.signups.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">No sign-ups in this period.</p>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {weekly.signups.map((a) => {
                    const st = a.verificationStatus || a.status || "pending";
                    return (
                      <div
                        key={a.id || a.email}
                        onClick={() => openStudentDetail(a)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 cursor-pointer transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 border border-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(a.fullName || a.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{a.fullName || "(no name)"}</p>
                          <p className="text-[11px] text-sky-300 truncate">{a.email}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {a.collegeName || "—"} · {a.branch || "—"} {a.year || ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-1">
                          <span
                            className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              st === "verified"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : st === "rejected" || st === "blocked"
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {st}
                          </span>
                          <p className="text-[10px] text-slate-500">{fmtDate(accountTime(a))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MATCHES + REPORTS */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h3 className="font-bold text-sm">💞 New matches ({weekly.matches.length})</h3>
                </div>
                {weekly.matches.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500">No new matches in this period.</p>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
                    {weekly.matches.map((s) => (
                      <div
                        key={s.sessionId}
                        onClick={() => setInspectLiveSession(s)}
                        className="px-4 py-2.5 hover:bg-slate-800/60 cursor-pointer text-xs flex items-center justify-between gap-2"
                      >
                        <span className="truncate font-semibold">
                          {s.userAlias} ↔ {s.targetAlias}
                        </span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {(s.messages || []).length} msgs · {fmtDate(sessionTime(s))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h3 className="font-bold text-sm">🚨 Reports ({weekly.reports.length})</h3>
                </div>
                {weekly.reports.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500">No reports in this period.</p>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
                    {weekly.reports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setInspectReportTicket(r)}
                        className="px-4 py-2.5 hover:bg-slate-800/60 cursor-pointer text-xs space-y-0.5"
                      >
                        <p className="font-semibold truncate">
                          {r.reporterAlias} reported {r.reportedAlias}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {r.reason} · {fmtDate(reportTime(r))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

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