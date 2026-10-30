"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================
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
  verificationStatus: "unverified" | "pending" | "verified" | "rejected" | "blocked";
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
  email?: string;
  phone?: string;
  collegeName?: string;
  baseLocation?: "Bangalore" | "Mysore";
  fullName?: string;
  gender?: "Male" | "Female" | "Other";
  idCardFrontImage?: string;
  idCardBackImage?: string;
}

export type VanishMode = "off" | "seen" | "1h" | "24h";

export interface ChatGame {
  type: "icebreaker" | "truth_dare" | "flirty" | "wyr" | "nhie" | "who" | "two_truths";
  title: string;
  prompt: string;
  options?: string[]; // two_truths: the 3 statements
  lieIndex?: number; // two_truths: which one is the lie
  guess?: number; // two_truths: what the other student guessed
}

export interface ChatMessage {
  id: string;
  senderAlias: string;
  text: string; // always a readable text version (the admin copy relies on it)
  timestamp: string;
  createdAt?: number;
  replyTo?: { id: string; senderAlias: string; text: string };
  gif?: { url?: string; emoji?: string; label: string };
  game?: ChatGame;
  reactions?: Record<string, string>; // alias -> emoji
  vanish?: VanishMode;
  expiresAt?: number; // when the message disappears for the students
  seenBy?: string[];
  seenAt?: number;
  vanishedAt?: string; // set once it vanished for students (admin copy is kept forever)
}

export interface Confession {
  id: string;
  college: string;
  text: string;
  theme: number;
  createdAt: number;
  authorId: string; // never shown to students - kept only so moderators can act on abuse
  authorAlias: string;
  reactions: Record<string, string>; // studentId -> emoji
  reports: string[]; // studentIds who reported it
  hidden?: boolean; // hidden by admin
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
  endedAt?: string;
  status?: "active" | "deleted" | "expired" | "reported" | "ended" | "unmatched";
  participants?: ChatParticipant[];
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

const DEFAULT_APPROVED_STUDENTS: StudentProfile[] = [
  {
    id: "stu_101",
    alias: "MidnightCoder",
    avatar: "🦉",
    yearDept: "3rd Year • B.Tech — CSE",
    bio: "Surviving on cold brew and last-minute assignments.",
    interests: ["Indie Music", "Hackathons"],
    compatibility: 94,
    status: "approved",
    fullName: "Tejas",
    gender: "Male",
    collegeName: "BMS College of Engineering (BMSCE)",
    baseLocation: "Bangalore",
    email: "tejas1@college.edu",
    phone: "9876543210",
    idCardFrontImage: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600",
    idCardBackImage: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600",
  },
  {
    id: "stu_102",
    alias: "VelvetStar",
    avatar: "🦋",
    yearDept: "2nd Year • B.Tech — CSE",
    bio: "Filter coffee addict, UI designer & late-night campus stroller.",
    interests: ["Design", "Indie Music", "Cafes"],
    compatibility: 96,
    status: "approved",
    fullName: "Ananya",
    gender: "Female",
    collegeName: "BMS College of Engineering (BMSCE)",
    baseLocation: "Bangalore",
    email: "ananya@college.edu",
    phone: "9876501234",
    idCardFrontImage: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600",
    idCardBackImage: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600",
  },
  {
    id: "stu_103",
    alias: "NeonMuse",
    avatar: "🦊",
    yearDept: "3rd Year • BCA",
    bio: "Always down for central library study dates or street food runs.",
    interests: ["Photography", "Badminton"],
    compatibility: 91,
    status: "approved",
    fullName: "Diya",
    gender: "Female",
    collegeName: "RV College of Engineering (RVCE)",
    baseLocation: "Bangalore",
    email: "diya@college.edu",
    phone: "9876505678",
    idCardFrontImage: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600",
    idCardBackImage: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600",
  },
];

const AVATAR_OPTIONS = [
  // animals
  "🦊", "🐼", "🦉", "🐯", "🦋", "🐱", "🐶", "🐰", "🐻", "🐨", "🦁", "🐸",
  "🐵", "🦄", "🐺", "🦝", "🐧", "🦜", "🦢", "🐬", "🐳", "🦈", "🐙", "🦖",
  "🐲", "🐝", "🐞", "🦔", "🦦", "🦥", "🐿️", "🦩",
  // nature & sky
  "⚡", "🌙", "🔥", "🌸", "🌻", "🌹", "🍀", "🌵", "🌴", "🍁", "🌈", "❄️",
  "☀️", "⭐", "🌊", "🌋", "☄️", "🪐", "🌍", "✨",
  // fun & vibes
  "👻", "👽", "🤖", "👾", "🎃", "🎭", "🎧", "🎸", "🎮", "🎨", "📚", "☕",
  "🍕", "🍩", "🍓", "🍉", "🍒", "🧁", "🍿", "🧋", "💎", "👑", "🎯", "🚀",
  "🛸", "🪄", "🧿", "💫", "🕶️", "🎲", "🏀", "⚽", "🎤", "🎬", "📸", "🪩",
];

const NICK_ADJECTIVES = [
  "Silent", "Cosmic", "Midnight", "Neon", "Velvet", "Solar", "Mystic", "Lunar", "Golden", "Crimson",
  "Electric", "Misty", "Sunny", "Stormy", "Dreamy", "Wild", "Gentle", "Brave", "Cheeky", "Sleepy",
  "Fuzzy", "Witty", "Lucky", "Rusty", "Frosty", "Cozy", "Breezy", "Shadow", "Crystal", "Amber",
  "Ruby", "Indigo", "Silver", "Hidden", "Secret", "Playful", "Quiet", "Radiant", "Sparkly", "Mellow",
];
const NICK_NOUNS = [
  "Scholar", "Rebel", "Owl", "Fox", "Voyager", "Drifter", "Spark", "Comet", "Panda", "Tiger",
  "Falcon", "Willow", "Breeze", "Ember", "Orchid", "Raven", "Phoenix", "Pixel", "Echo", "Muse",
  "Wanderer", "Dreamer", "Poet", "Nomad", "Lantern", "Otter", "Koala", "Lynx", "Maple", "Meadow",
  "Cloud", "River", "Storm", "Sparrow", "Jester", "Wizard", "Ninja", "Pirate", "Sage", "Bloom",
];

// Lower-case + strip spaces/symbols so "Sparks New", "sparksnew" and "SPARKS-NEW" count as the same nickname
const normalizeNick = (v: string) => v.toLowerCase().replace(/[^a-z0-9\u0900-\u0DFF]/g, "");

// ============================================================================
// 60+ FPS FIRST-PERSON PERSPECTIVE MOTION BACKGROUND COMPONENT
// ============================================================================
function FpsMotionBackground({ boost }: { boost: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fps, setFps] = useState<number>(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let targetLookX = 0;
    let targetLookY = 0;
    let currentLookX = 0;
    let currentLookY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetLookX = (e.clientX / width - 0.5) * 180;
      targetLookY = (e.clientY / height - 0.5) * 120;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const PARTICLE_COUNT = 160;
    const MAX_DEPTH = 1000;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1200,
      z: Math.random() * MAX_DEPTH + 1,
      hue: Math.random() > 0.5 ? 325 : 265,
    }));

    const RING_COUNT = 8;
    const rings = Array.from({ length: RING_COUNT }, (_, i) => ({
      z: ((i + 1) * MAX_DEPTH) / RING_COUNT,
    }));

    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.667, 3);
      lastTime = now;
      frameCounter++;

      if (now - fpsTimer >= 500) {
        setFps(Math.min(144, Math.round((frameCounter * 1000) / (now - fpsTimer))));
        frameCounter = 0;
        fpsTimer = now;
      }

      currentLookX += (targetLookX - currentLookX) * 0.08 * dt;
      currentLookY += (targetLookY - currentLookY) * 0.08 * dt;

      const centerX = width / 2 - currentLookX;
      const centerY = height / 2 - currentLookY;
      const speed = (boost ? 14 : 6.5) * dt;

      ctx.fillStyle = "rgba(2, 6, 23, 0.38)";
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.65);
      grad.addColorStop(0, "rgba(219, 39, 119, 0.12)");
      grad.addColorStop(0.45, "rgba(124, 58, 237, 0.06)");
      grad.addColorStop(1, "rgba(2, 6, 23, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const fov = 380;
      rings.forEach((ring) => {
        ring.z -= speed;
        if (ring.z <= 10) ring.z = MAX_DEPTH;

        const scale = fov / ring.z;
        const rw = 900 * scale;
        const rh = 560 * scale;
        const alpha = Math.min(0.28, (1 - ring.z / MAX_DEPTH) * 0.35);

        ctx.strokeStyle = `rgba(236, 72, 153, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(1, 2.2 * scale);
        ctx.strokeRect(centerX - rw / 2, centerY - rh / 2, rw, rh);
      });

      ctx.strokeStyle = "rgba(139, 92, 246, 0.12)";
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + i * (width * 0.28), height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + i * (width * 0.28), 0);
        ctx.stroke();
      }

      particles.forEach((p) => {
        const prevZ = p.z;
        p.z -= speed * 1.35;

        if (p.z <= 8) {
          p.x = (Math.random() - 0.5) * 1600;
          p.y = (Math.random() - 0.5) * 1200;
          p.z = MAX_DEPTH;
          return;
        }

        const scale = fov / p.z;
        const prevScale = fov / prevZ;

        const x2d = centerX + p.x * scale;
        const y2d = centerY + p.y * scale;
        const prevX = centerX + p.x * prevScale;
        const prevY = centerY + p.y * prevScale;

        const alpha = Math.min(1, (1 - p.z / MAX_DEPTH) * 1.2);
        const radius = Math.max(0.8, (1 - p.z / MAX_DEPTH) * 3.2);

        ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${alpha.toFixed(2)})`;
        ctx.lineWidth = radius;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x2d, y2d);
        ctx.stroke();
      });

      ctx.strokeStyle = "rgba(244, 114, 182, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [boost]);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      <div className="fixed bottom-3 left-3 z-30 pointer-events-none flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-pink-500/30 text-[10px] font-mono text-pink-400 shadow-lg backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>FPS MOTION: {fps} FPS</span>
        <span className="text-slate-500">|</span>
        <span className="text-violet-300">{boost ? "WARP BOOST" : "3D CAM SYNC"}</span>
      </div>
    </>
  );
}

// ============================================================================
// MAIN STUDENT PORTAL COMPONENT
// ============================================================================
export interface SparkRequest {
  id: string;
  fromId: string;
  fromAlias: string;
  fromProfile: StudentProfile;
  toId: string;
  toAlias: string;
  toProfile: StudentProfile;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  respondedAt?: number;
  seenByFrom?: boolean;
  hiddenFor: string[];
  rejectedBy?: string; // set when a student rejects AFTER accepting (unmatch)
  wasAccepted?: boolean;
  endSeenBy?: string[];
}

const SPARK_KEY = "heartlink_spark_requests";
const SHARED_MSG_KEY = "heartlink_chat_messages";

// ---- Block list (shared storage) ----
export interface BlockEntry {
  blockerId: string;
  blockedId: string;
  blockedAlias: string;
  at: string;
}
const BLOCKS_KEY = "heartlink_blocks";
const readBlocks = (): BlockEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(BLOCKS_KEY) || "[]");
  } catch {
    return [];
  }
};
const isPairBlocked = (a: string, b: string) =>
  readBlocks().some(
    (x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a)
  );

// Faint repeating username + phone number watermark (CSS background) so a leaked screenshot can be traced
const watermarkBackground = (text: string) => {
  const safe = text.replace(/[&<>"']/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='280' height='160'><text x='20' y='95' transform='rotate(-25 140 80)' fill='rgba(255,255,255,0.10)' font-family='sans-serif' font-size='14' font-weight='700'>${safe}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const readSparkRequests = (): SparkRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(SPARK_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeSparkRequests = (list: SparkRequest[]) => {
  localStorage.setItem(SPARK_KEY, JSON.stringify(list));
};
const updateSparkRequest = (id: string, patch: (r: SparkRequest) => SparkRequest) => {
  writeSparkRequests(readSparkRequests().map((r) => (r.id === id ? patch(r) : r)));
};
const readSharedMessages = (): Record<string, ChatMessage[]> => {
  try {
    return JSON.parse(localStorage.getItem(SHARED_MSG_KEY) || "{}");
  } catch {
    return {};
  }
};
// Both students read/write the same thread, so each one sees the other's messages
const appendSharedMessage = (reqId: string, msg: ChatMessage): ChatMessage[] => {
  const all = readSharedMessages();
  const thread = all[reqId] || [];
  if (!thread.some((m) => m.id === msg.id)) thread.push(msg);
  all[reqId] = thread;
  localStorage.setItem(SHARED_MSG_KEY, JSON.stringify(all));
  return thread;
};
// Never copy the (large) ID-card photos into spark requests
const slimProfile = (p: StudentProfile): StudentProfile => ({
  ...p,
  idCardFrontImage: undefined,
  idCardBackImage: undefined,
});
const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ---- Disappearing messages ----
const SEEN_VANISH_MS = 8000; // "after seen" messages vanish 8 seconds after the other student opens them
const VANISH_OPTIONS: { id: VanishMode; label: string; short: string }[] = [
  { id: "off", label: "Off", short: "Off" },
  { id: "seen", label: "After they see it", short: "After seen" },
  { id: "1h", label: "1 hour", short: "1 hour" },
  { id: "24h", label: "24 hours", short: "24 hours" },
];
const isMsgExpired = (m: ChatMessage, now: number) => !!m.expiresAt && now >= m.expiresAt;
const fmtLeft = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.ceil(sec / 60)}m`;
  return `${Math.ceil(sec / 3600)}h`;
};
const VANISH_DETAILS: Record<VanishMode, { icon: string; title: string; desc: string }> = {
  off: { icon: "💬", title: "Off", desc: "Messages stay in the chat" },
  seen: { icon: "👁️", title: "After they see it", desc: "Vanishes 8 seconds after they open it" },
  "1h": { icon: "⏱️", title: "1 hour", desc: "Vanishes 1 hour after you send it" },
  "24h": { icon: "📅", title: "24 hours", desc: "Vanishes 24 hours after you send it" },
};
const SYSTEM_SENDER = "⚡ CampusSpark";

// ---- Emoji picker ----
// Built from Unicode code-point ranges so the list stays short in code but huge on screen
// (800+ emojis). Skin-tone / ZWJ combos are skipped to stay compatible with every device.
const emojiRange = (a: number, b: number): string[] => {
  const out: string[] = [];
  for (let c = a; c <= b; c++) out.push(String.fromCodePoint(c));
  return out;
};
const emojiList = (ranges: [number, number][], extra: string[] = []): string[] => {
  let all: string[] = [];
  ranges.forEach(([a, b]) => {
    all = all.concat(emojiRange(a, b));
  });
  return Array.from(new Set(all.concat(extra)));
};
const RECENT_EMOJI_KEY = "heartlink_recent_emojis";
const PRESENCE_KEY = "heartlink_presence"; // { [profileId]: lastActiveTimestamp }
const ONLINE_WINDOW_MS = 25000; // active within the last 25s = online
const EMOJI_CATEGORIES: { id: string; label: string; emojis: string[] }[] = [
  {
    id: "smileys",
    label: "😀",
    emojis: emojiList(
      [[0x1f600, 0x1f644], [0x1f910, 0x1f917], [0x1f920, 0x1f925], [0x1f927, 0x1f92f], [0x1f970, 0x1f978], [0x1f97a, 0x1f97a], [0x1f9d0, 0x1f9d0], [0x1f4a9, 0x1f4a9]],
      ["\u263A\uFE0F", "\u2639\uFE0F"]
    ),
  },
  {
    id: "people",
    label: "👋",
    emojis: emojiList(
      [[0x1f446, 0x1f450], [0x1f64c, 0x1f64c], [0x1f64f, 0x1f64f], [0x1f90f, 0x1f90f], [0x1f918, 0x1f91f], [0x1f4aa, 0x1f4aa], [0x1f440, 0x1f440], [0x1f442, 0x1f445], [0x1f645, 0x1f64b], [0x1f64d, 0x1f64e], [0x1f466, 0x1f487], [0x1f930, 0x1f939]],
      ["\u270C\uFE0F", "\u270B", "\u270A", "\u261D\uFE0F", "\u270D\uFE0F"]
    ),
  },
  {
    id: "hearts",
    label: "❤️",
    emojis: emojiList(
      [[0x1f493, 0x1f49f], [0x1f48b, 0x1f48c], [0x1f4a2, 0x1f4a8], [0x1f4ab, 0x1f4af], [0x1f90d, 0x1f90e], [0x1f9e1, 0x1f9e1], [0x1f5a4, 0x1f5a4], [0x1f525, 0x1f525], [0x1f534, 0x1f53d]],
      ["\u2764\uFE0F", "\u2763\uFE0F", "\u2728", "\u2B50", "\u26A1", "\u2705", "\u274C", "\u2757", "\u2753", "\u2755", "\u2754", "\u203C\uFE0F", "\u267B\uFE0F"]
    ),
  },
  {
    id: "animals",
    label: "🐶",
    emojis: emojiList([[0x1f400, 0x1f43e], [0x1f980, 0x1f9ae], [0x1f409, 0x1f409]]),
  },
  {
    id: "nature",
    label: "🌸",
    emojis: emojiList(
      [[0x1f330, 0x1f344], [0x1f490, 0x1f490], [0x1f300, 0x1f320]],
      ["\u2600\uFE0F", "\u26C5", "\u2601\uFE0F", "\u2744\uFE0F", "\u2614", "\u26C4"]
    ),
  },
  {
    id: "food",
    label: "🍕",
    emojis: emojiList([[0x1f345, 0x1f37c], [0x1f37e, 0x1f37f], [0x1f950, 0x1f96f], [0x1f9c0, 0x1f9cb]], ["\u2615"]),
  },
  {
    id: "activities",
    label: "⚽",
    emojis: emojiList(
      [[0x1f380, 0x1f393], [0x1f3a0, 0x1f3ca], [0x1f3cf, 0x1f3d3], [0x1f3f8, 0x1f3f9], [0x1f945, 0x1f945], [0x1f947, 0x1f94f], [0x1fa80, 0x1fa82]],
      ["\u26BD", "\u26BE", "\u26F3"]
    ),
  },
  {
    id: "travel",
    label: "🚗",
    emojis: emojiList([[0x1f680, 0x1f6c5], [0x1f3e0, 0x1f3f0], [0x1f5fb, 0x1f5ff]], ["\u2708\uFE0F", "\u26F5", "\u2693"]),
  },
  {
    id: "objects",
    label: "💡",
    emojis: emojiList([[0x1f451, 0x1f465], [0x1f4a1, 0x1f4a1], [0x1f4b0, 0x1f4b9], [0x1f4ba, 0x1f4fc], [0x1f50a, 0x1f523], [0x1f550, 0x1f567], [0x1f9e2, 0x1f9ff]]),
  },
];
// Smooth motion for chat bubbles, panels and GIF tiles
const CHAT_ANIM_CSS = `
@keyframes msgIn { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes panelIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes gifIn { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
@media print { .chat-private { display: none !important; } }
@keyframes vanishGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,.55); } 50% { box-shadow: 0 0 0 7px rgba(168,85,247,0); } }
@keyframes shieldFloat { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-16px) scale(1.12); } }
@keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
.gif-tile { animation: gifIn .35s cubic-bezier(.2,.8,.2,1) both; }
.gif-skel { background: linear-gradient(90deg, rgba(255,255,255,.05) 0, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 100%); background-size: 400px 100%; animation: shimmer 1.2s linear infinite; }
`;
// ---- Global feel: press feedback, ⚡/❤️ bursts, frosted-glass cards ----
const GLOBAL_FX_CSS = `
/* 1) PRESS FEEDBACK – every button squishes a little and springs back.
      Uses the independent "scale" property so it never fights Tailwind's transform classes. */
button:not(:disabled), [role="button"] {
  transition-property: color, background-color, border-color, opacity, box-shadow, transform, scale, filter !important;
  transition-timing-function: cubic-bezier(.34,1.56,.64,1) !important;
  -webkit-tap-highlight-color: transparent;
}
button:not(:disabled):active, [role="button"]:active { scale: .93; }
/* Spark & Pass get a bigger squish, and Spark keeps a soft glowing pulse */
button[title="Pass"]:not(:disabled):active { scale: .86; }
button[title="Send Spark request"]:not(:disabled):active { scale: .84; }
button[title="Send Spark request"] { animation: sparkPulse 2.6s ease-in-out infinite; }
@keyframes sparkPulse {
  0%,100% { box-shadow: 0 10px 25px -5px rgba(236,72,153,.5), 0 0 0 0 rgba(236,72,153,.45); }
  50%     { box-shadow: 0 10px 25px -5px rgba(236,72,153,.5), 0 0 0 9px rgba(236,72,153,0); }
}

/* 2) BURSTS – ⚡ flies out and ❤️ floats up when you Spark; ✕ puffs away when you Pass */
.fx-part {
  position: absolute; left: 0; top: 0; line-height: 1; font-size: 22px; opacity: 0;
  animation: fxFly .9s cubic-bezier(.2,.8,.3,1) forwards; will-change: transform, opacity;
  filter: drop-shadow(0 0 8px rgba(236,72,153,.7));
}
.fx-pass { color: rgba(255,255,255,.85); font-weight: 800; filter: none; }
@keyframes fxFly {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.3) rotate(0deg); }
  15%  { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(var(--s,1)) rotate(var(--r,0deg)); }
}
.fx-ring {
  position: absolute; left: 0; top: 0; width: 56px; height: 56px; border-radius: 9999px;
  transform: translate(-50%,-50%); animation: fxRing .6s ease-out forwards;
}
.fx-ring-spark { border: 2px solid rgba(244,114,182,.9); box-shadow: 0 0 22px rgba(236,72,153,.7); }
.fx-ring-pass  { border: 2px solid rgba(255,255,255,.5); }
@keyframes fxRing {
  0%   { opacity: .9; transform: translate(-50%,-50%) scale(.3); }
  100% { opacity: 0;  transform: translate(-50%,-50%) scale(2.6); }
}

/* 3) GLASSMORPHISM – frosted glass with a thin glowing gradient border */
.glass-card {
  background:
    linear-gradient(145deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.03) 45%, rgba(255,255,255,.06) 100%),
    rgba(14,6,24,.55) !important;
  -webkit-backdrop-filter: blur(22px) saturate(165%);
  backdrop-filter: blur(22px) saturate(165%);
  border-color: rgba(255,255,255,.07) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.18),
    0 0 0 1px rgba(236,72,153,.10),
    0 12px 45px -12px rgba(236,72,153,.40),
    0 2px 14px rgba(0,0,0,.45) !important;
}
.glass-card:not(.absolute):not(.fixed):not(.sticky) { position: relative; }
.glass-card::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(135deg, rgba(244,114,182,.75), rgba(255,255,255,.10) 38%, rgba(255,255,255,.04) 62%, rgba(139,92,246,.70));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}

@media (prefers-reduced-motion: reduce) {
  button[title="Send Spark request"] { animation: none; }
  .fx-part, .fx-ring { display: none; }
}
`;
type FxPart = { ch: string; dx: number; dy: number; s: number; r: number; delay: number; dur: number };
type FxBurst = { id: number; x: number; y: number; kind: "spark" | "pass"; parts: FxPart[] };
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

// ---- Couple games ----
const ICEBREAKERS = [
  "What's the most random thing in your camera roll right now?",
  "Canteen food ranking: what's your #1 order?",
  "What song have you had on repeat this week?",
  "If we skipped class right now, where would you take me?",
  "What's your most irrational campus fear?",
  "Which fest/event are you most excited for?",
  "What's a small thing that instantly makes your day better?",
  "Early morning lecture or late night assignment — which one breaks you more?",
  "What's your comfort movie or series?",
  "What's the best compliment you've ever received?",
  "Which campus spot do you secretly love?",
  "What's one thing on your bucket list before graduating?",
];
const TRUTHS = [
  "What's the most embarrassing thing that happened to you in college?",
  "What was your first impression of me from my profile?",
  "What's your biggest green flag in a person?",
  "Have you ever pretended to like something just to impress someone?",
  "What's the cheesiest pickup line you'd actually use?",
  "What's one habit of yours people find weird?",
  "What's the last lie you told?",
  "What's your most unpopular opinion about dating?",
];
const DARES = [
  "Send your best pickup line, no Googling allowed 😏",
  "Describe me using only 3 emojis.",
  "Send an emoji that matches your mood right now.",
  "Rewrite your last message like a Shakespeare character.",
  "Tell me something you'd compliment me on, in 10 words or less.",
  "Say something nice about me in a language that isn't English.",
  "Use only emojis for your next 3 messages.",
  "Describe your perfect first date in exactly one sentence.",
];
const FLIRTY: Record<"cute" | "flirty" | "bold", { label: string; items: string[] }> = {
  cute: {
    label: "🌸 Cute",
    items: [
      "What's the first thing you notice about someone?",
      "What's your idea of a perfect lazy evening?",
      "Would you rather get a handwritten note or a surprise coffee?",
      "What's the sweetest thing someone has done for you?",
      "What song would be playing in your rom-com?",
    ],
  },
  flirty: {
    label: "😉 Flirty",
    items: [
      "What's something that instantly makes someone attractive to you?",
      "If we were stuck in the library overnight, what would you do?",
      "Rate my vibe so far out of 10 — be honest 😌",
      "What's your love language, and how do you show it?",
      "What would make you want to meet in person?",
    ],
  },
  bold: {
    label: "🔥 Bold",
    items: [
      "What's the most spontaneous thing you'd do for someone you like?",
      "What's one thing you'd want me to know about you before we meet?",
      "Would you slide into DMs or wait to be asked? 👀",
      "What would your perfect first date look like — and who pays?",
      "What's a dealbreaker for you in a relationship?",
    ],
  },
};
const WYR = [
  "Would you rather have a movie date at home or a street-food date?",
  "Would you rather text all day or talk for one long call at night?",
  "Would you rather get surprised with a gift or a plan?",
  "Would you rather travel to the mountains or the beach with someone you like?",
  "Would you rather always be 10 mins early or 10 mins late?",
  "Would you rather have unlimited pizza or unlimited biryani?",
];
const NHIE = [
  "Never have I ever stayed up all night talking to someone new.",
  "Never have I ever sent a text to the wrong person.",
  "Never have I ever bunked a class for a crush.",
  "Never have I ever stalked someone's profile before talking to them.",
  "Never have I ever rehearsed what to say before a call.",
  "Never have I ever fallen asleep during a call.",
];
const WHO = [
  "Who's more likely to text first?",
  "Who's more likely to fall asleep during a movie?",
  "Who's more likely to get lost on the way to a date?",
  "Who's more likely to order the same food every time?",
  "Who's more likely to forget an anniversary?",
  "Who's more likely to cry at a movie?",
  "Who's more likely to say 'I'm 5 minutes away' while still at home?",
];
const GAME_TABS: { id: ChatGame["type"]; label: string }[] = [
  { id: "icebreaker", label: "🧊 Icebreakers" },
  { id: "truth_dare", label: "🎭 Truth or Dare" },
  { id: "flirty", label: "😉 Flirty Qs" },
  { id: "wyr", label: "🤔 Would You Rather" },
  { id: "nhie", label: "🙋 Never Have I Ever" },
  { id: "who", label: "🏆 Who's More Likely" },
  { id: "two_truths", label: "🤥 2 Truths 1 Lie" },
];
const pick = <T,>(list: T[], avoid?: T): T => {
  if (list.length === 1) return list[0];
  let v = list[Math.floor(Math.random() * list.length)];
  while (v === avoid) v = list[Math.floor(Math.random() * list.length)];
  return v;
};

// ---- Confessions (NGL-style anonymous wall per college) ----
const CONFESSIONS_KEY = "heartlink_confessions";
const CONFESSION_MAX = 280;
const CONFESSION_THEMES = [
  "from-pink-500 via-rose-500 to-orange-400",
  "from-violet-600 via-fuchsia-500 to-pink-500",
  "from-sky-500 via-indigo-500 to-violet-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-slate-700 via-purple-800 to-pink-700",
];
const CONFESSION_PROMPTS = [
  "💘 My crush is…",
  "🤫 A secret I never told anyone…",
  "🔥 Unpopular opinion: ",
  "🙌 Shoutout to…",
  "😂 Funniest thing on campus…",
  "💌 To the person who…",
];
const CONFESSION_REACTIONS = ["❤️", "😂", "😮", "🔥"];
const readConfessions = (): Confession[] => {
  try {
    return JSON.parse(localStorage.getItem(CONFESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
};
const writeConfessions = (list: Confession[]) => {
  localStorage.setItem(CONFESSIONS_KEY, JSON.stringify(list));
};
// Keeps phone numbers, emails, links and @handles off the wall (protects people from being doxxed/contacted)
const confessionIssue = (text: string): string | null => {
  if (/(\d[\s-]?){7,}/.test(text)) return "Please don't include phone numbers.";
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) return "Please don't include email addresses.";
  if (/(https?:\/\/|www\.)\S+/i.test(text)) return "Links aren't allowed in confessions.";
  if (/(^|\s)@[a-z0-9_.]{3,}/i.test(text)) return "Please don't tag or include social handles.";
  return null;
};
const timeAgo = (ts: number) => {
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

export default function StudentPage() {
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [authStep, setAuthStep] = useState<"login" | "otp" | "kyc">("login");
  const [authProvider, setAuthProvider] = useState<"google_oauth" | "email_otp">("email_otp");
  const [fpsBoost, setFpsBoost] = useState<boolean>(false);

  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpDeliveryNote, setOtpDeliveryNote] = useState<string>("");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);

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

  const [activeTab, setActiveTab] = useState<"onboarding" | "discover" | "sparks" | "chat" | "confess" | "profile">("onboarding");
  const [myProfile, setMyProfile] = useState<StudentProfile | null>(null);

  const [alias, setAlias] = useState<string>("");
  const [aliasError, setAliasError] = useState<string>("");

  // No zooming anywhere + no visible scrollbars
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
    const style = document.createElement("style");
    style.textContent =
      "html,body{touch-action:pan-x pan-y;-webkit-text-size-adjust:100%;-webkit-touch-callout:none}body{user-select:none;-webkit-user-select:none}input,textarea{user-select:text;-webkit-user-select:text}*{scrollbar-width:none}*::-webkit-scrollbar{display:none}@media print{html{display:none!important}}";
    document.head.appendChild(style);

    const onWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    const editable = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].includes(e.key)) e.preventDefault();
      // block print / save / view-source shortcuts
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "u"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const blockUnlessEditable = (e: Event) => { if (!editable(e.target)) e.preventDefault(); };
    const stop = (e: Event) => e.preventDefault();
    const onTouch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    let lastTap = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap <= 300) e.preventDefault();
      lastTap = now;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    document.addEventListener("touchmove", onTouch, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    ["contextmenu", "copy", "cut", "dragstart", "selectstart"].forEach((ev) =>
      document.addEventListener(ev, blockUnlessEditable)
    );
    window.addEventListener("beforeprint", stop);
    return () => {
      ["contextmenu", "copy", "cut", "dragstart", "selectstart"].forEach((ev) =>
        document.removeEventListener(ev, blockUnlessEditable)
      );
      window.removeEventListener("beforeprint", stop);
      style.remove();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", onTouch);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string>("");

  const [feed, setFeed] = useState<StudentProfile[]>(DEFAULT_APPROVED_STUDENTS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [collegeFilter, setCollegeFilter] = useState<"same" | "different">("same");

  const [matches, setMatches] = useState<StudentProfile[]>([]);
  const [activeMatch, setActiveMatch] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState<string>("");

  // Reporting modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [unmatchTarget, setUnmatchTarget] = useState<StudentProfile | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportSubmittedNote, setReportSubmittedNote] = useState<string>("");

  // Auto-scroll ref for chat messages
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Scroll ONLY the message box. (scrollIntoView also scrolls every parent,
  // which pushed the whole locked page upward on laptop.)
  const scrollToBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Always keep the page itself at the top when switching tabs
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, activeMatch, activeTab, scrollToBottom]);

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

  const getSharedSessionId = (aliasA: string, aliasB: string) => {
    return [aliasA.trim(), aliasB.trim()].sort().join("_↔_");
  };

  // ============================================================================
  // STRICT CREDENTIAL CHECKER:
  // 1. Blocks Same Email + Different Mobile Number
  // 2. Blocks Different Email + Same Mobile Number
  // 3. Directly logs in if BOTH Email AND Mobile match an approved record
  // 4. Sends to Pending screen if BOTH match a pending/rejected record
  // 5. Proceeds to OTP -> College Details if brand-new user
  // ============================================================================
  const evaluateLoginCredentials = useCallback(
    (
      rawEmail: string,
      rawPhone: string
    ): {
      outcome: "error" | "direct_login" | "pending_or_rejected" | "new_signup";
      errorMessage?: string;
    } => {
      const cleanEmail = rawEmail.trim().toLowerCase();
      const cleanPhone = rawPhone.trim();

      const existingQueue: StudentAccount[] = JSON.parse(
        localStorage.getItem("heartlink_admin_verification_queue") || "[]"
      );
      const savedUsers: StudentProfile[] = JSON.parse(
        localStorage.getItem("college_dating_all_users") || "[]"
      );

      interface KnownRecord {
        id: string;
        email: string;
        phone: string;
        status: string;
        branch?: string;
        year?: string;
        yearDept?: string;
        collegeName?: string;
        baseLocation?: "Bangalore" | "Mysore";
        fullName?: string;
        gender?: "Male" | "Female" | "Other";
        idCardFrontImage?: string;
        idCardBackImage?: string;
      }

      const recordsByEmail = new Map<string, KnownRecord>();

      DEFAULT_APPROVED_STUDENTS.forEach((s) => {
        if (s.email && s.phone) {
          recordsByEmail.set(s.email.toLowerCase(), {
            id: s.id,
            email: s.email.toLowerCase(),
            phone: s.phone,
            status: s.status,
            yearDept: s.yearDept,
            collegeName: s.collegeName,
            baseLocation: s.baseLocation,
            fullName: s.fullName,
            gender: s.gender,
            idCardFrontImage: s.idCardFrontImage,
            idCardBackImage: s.idCardBackImage,
          });
        }
      });

      savedUsers.forEach((u) => {
        if (u.email && u.phone) {
          const prev = recordsByEmail.get(u.email.toLowerCase());
          recordsByEmail.set(u.email.toLowerCase(), {
            id: u.id || prev?.id || `VER-${Math.floor(100 + Math.random() * 900)}`,
            email: u.email.toLowerCase(),
            phone: u.phone,
            status: u.status || prev?.status || "pending",
            yearDept: u.yearDept || prev?.yearDept,
            collegeName: u.collegeName || prev?.collegeName,
            baseLocation: u.baseLocation || prev?.baseLocation,
            fullName: u.fullName || prev?.fullName,
            gender: u.gender || prev?.gender,
            idCardFrontImage: u.idCardFrontImage || prev?.idCardFrontImage,
            idCardBackImage: u.idCardBackImage || prev?.idCardBackImage,
          });
        }
      });

      existingQueue.forEach((q: StudentAccount & { status?: string }) => {
        if (q.email && q.phone) {
          const prev = recordsByEmail.get(q.email.toLowerCase());
          recordsByEmail.set(q.email.toLowerCase(), {
            id: q.id || prev?.id || `VER-${Math.floor(100 + Math.random() * 900)}`,
            email: q.email.toLowerCase(),
            phone: q.phone,
            status: q.verificationStatus || q.status || prev?.status || "pending",
            branch: q.branch,
            year: q.year,
            collegeName: q.collegeName || prev?.collegeName,
            baseLocation: q.baseLocation || prev?.baseLocation,
            fullName: q.fullName || prev?.fullName,
            gender: q.gender || prev?.gender,
            idCardFrontImage: q.idCardFrontImage || prev?.idCardFrontImage,
            idCardBackImage: q.idCardBackImage || prev?.idCardBackImage,
          });
        }
      });

      const allKnownRecords = Array.from(recordsByEmail.values());

      const emailMatch = allKnownRecords.find((r) => r.email === cleanEmail);
      const phoneMatch = allKnownRecords.find((r) => r.phone === cleanPhone);

      if (emailMatch && emailMatch.phone !== cleanPhone) {
        return {
          outcome: "error",
          errorMessage:
            "Access Denied: This email ID is already registered with a different mobile number. Please enter the exact mobile number linked to this email.",
        };
      }

      if (phoneMatch && phoneMatch.email !== cleanEmail) {
        return {
          outcome: "error",
          errorMessage:
            "Access Denied: This mobile number is already registered with another email ID. Duplicate mobile numbers are not allowed.",
        };
      }

      if (emailMatch && emailMatch.phone === cleanPhone) {
        if (emailMatch.status === "blocked") {
          return {
            outcome: "error",
            errorMessage: "Your student account has been permanently blocked by the Admin.",
          };
        }

        const isApproved =
          emailMatch.status === "verified" || emailMatch.status === "approved";

        const parsedYear =
          emailMatch.year ||
          emailMatch.yearDept?.split("•")[0]?.trim() ||
          "3rd Year";
        const parsedBranch =
          emailMatch.branch ||
          emailMatch.yearDept?.split("•")[1]?.trim() ||
          "B.Tech — CSE";

        const restoredAcc: StudentAccount = {
          id: emailMatch.id,
          email: cleanEmail,
          phone: cleanPhone,
          phoneMasked: `******${cleanPhone.slice(-4)}`,
          phoneHash: hashPhoneNumber(cleanPhone),
          branch: parsedBranch,
          year: parsedYear,
          collegeName: emailMatch.collegeName || "BMS College of Engineering (BMSCE)",
          baseLocation: emailMatch.baseLocation || "Bangalore",
          fullName: emailMatch.fullName || "Verified Student",
          gender: emailMatch.gender || "Male",
          authProvider: "email_otp",
          idCardFrontImage: emailMatch.idCardFrontImage || "",
          idCardBackImage: emailMatch.idCardBackImage || "",
          verificationStatus: isApproved
            ? "verified"
            : emailMatch.status === "rejected" || emailMatch.status === "flagged"
            ? "rejected"
            : "pending",
        };

        localStorage.setItem("heartlink_student_account", JSON.stringify(restoredAcc));
        setAccount(restoredAcc);

        if (isApproved) {
          const existingProfile =
            savedUsers.find(
              (u) => u.email?.toLowerCase() === cleanEmail && u.status === "approved"
            ) ||
            DEFAULT_APPROVED_STUDENTS.find(
              (u) => u.email?.toLowerCase() === cleanEmail
            );

          if (
            existingProfile &&
            existingProfile.alias &&
            !existingProfile.alias.startsWith("User_")
          ) {
            const enrichedProfile: StudentProfile = {
              ...existingProfile,
              email: cleanEmail,
              phone: cleanPhone,
              fullName: restoredAcc.fullName,
              gender: restoredAcc.gender,
              collegeName: restoredAcc.collegeName,
              baseLocation: restoredAcc.baseLocation,
              idCardFrontImage:
                existingProfile.idCardFrontImage || restoredAcc.idCardFrontImage,
              idCardBackImage:
                existingProfile.idCardBackImage || restoredAcc.idCardBackImage,
            };
            localStorage.setItem(
              "heartlink_student_profile",
              JSON.stringify(enrichedProfile)
            );
            setMyProfile(enrichedProfile);
            setActiveTab("discover");
          } else {
            setActiveTab("onboarding");
          }
          return { outcome: "direct_login" };
        }

        return { outcome: "pending_or_rejected" };
      }

      return { outcome: "new_signup" };
    },
    []
  );

  const syncFeedAndLiveChats = useCallback(() => {
    const savedUsers: StudentProfile[] = JSON.parse(
      localStorage.getItem("college_dating_all_users") || "[]"
    );

    const mergedMap = new Map<string, StudentProfile>();
    DEFAULT_APPROVED_STUDENTS.forEach((s) => mergedMap.set(s.id, s));
    savedUsers.forEach((u) => {
      const existing = mergedMap.get(u.id);
      mergedMap.set(u.id, { ...existing, ...u });
    });

    const combinedList = Array.from(mergedMap.values());
    if (savedUsers.length === 0) {
      localStorage.setItem("college_dating_all_users", JSON.stringify(combinedList));
    }
    setFeed(combinedList.filter((u) => u.status === "approved"));
  }, []);

  useEffect(() => {
    const savedAcc = localStorage.getItem("heartlink_student_account");
    const savedProf = localStorage.getItem("heartlink_student_profile");
    if (savedAcc) setAccount(JSON.parse(savedAcc));
    if (savedProf) {
      setMyProfile(JSON.parse(savedProf));
      setActiveTab("discover");
    }
    syncFeedAndLiveChats();
  }, [syncFeedAndLiveChats]);

  // Each chat gets its own permanent session id so the admin keeps EVERY chat,
  // even after the student deletes it or it expires after 1 hour.
  const chatSessionIdsRef = useRef<Record<string, string>>({});

  const buildParticipant = (p: StudentProfile): ChatParticipant => {
    let acc: StudentAccount | undefined;
    try {
      const queue: StudentAccount[] = JSON.parse(
        localStorage.getItem("heartlink_admin_verification_queue") || "[]"
      );
      acc = queue.find((a) => (p.email && a.email === p.email) || a.id === p.id);
    } catch {
      acc = undefined;
    }
    return {
      alias: p.alias,
      ticketId: acc?.id || p.id,
      fullName: acc?.fullName || p.fullName,
      email: acc?.email || p.email,
      phone: acc?.phone || p.phone,
      collegeName: acc?.collegeName || p.collegeName,
      baseLocation: acc?.baseLocation || p.baseLocation,
      gender: acc?.gender || p.gender,
      branch: acc?.branch,
      year: acc?.year,
      yearDept: p.yearDept,
    };
  };

  const pushChatToAdminLive = useCallback(
    (
      senderProfile: StudentProfile,
      receiverProfile: StudentProfile,
      updatedMessages: ChatMessage[]
    ) => {
      const activeChats: LiveChatSession[] = JSON.parse(
        localStorage.getItem("heartlink_admin_live_chats") || "[]"
      );

      // One permanent admin session per pair of students, so a chat that was
      // deleted / expired and later restarted continues in the SAME admin chat.
      const sessionId = getSharedSessionId(senderProfile.alias, receiverProfile.alias);
      chatSessionIdsRef.current[receiverProfile.id] = sessionId;
      const existing = activeChats.find((c) => c.sessionId === sessionId);

      const senderLabel = `${senderProfile.alias}${
        senderProfile.gender ? ` (${senderProfile.gender === "Male" ? "♂" : "♀"})` : ""
      }`;
      const targetLabel = `${receiverProfile.alias}${
        receiverProfile.gender ? ` (${receiverProfile.gender === "Male" ? "♂" : "♀"})` : ""
      }`;

      // Never lose history: keep everything already saved, add only new messages.
      // Messages that vanished for the students are NOT in updatedMessages anymore,
      // but they stay in the admin copy forever.
      const savedMsgs = existing?.messages ?? [];
      const savedIds = new Set(savedMsgs.map((m) => m.id));
      const incoming = new Map(updatedMessages.map((m) => [m.id, m]));
      const mergedMessages = [
        ...savedMsgs.map((m) => {
          const fresh = incoming.get(m.id);
          return fresh ? { ...m, ...fresh, vanishedAt: fresh.vanishedAt || m.vanishedAt } : m;
        }),
        ...updatedMessages.filter((m) => !savedIds.has(m.id)),
      ];
      const wasEnded =
        !!existing?.status &&
        ["deleted", "expired", "ended", "unmatched"].includes(existing.status);

      const liveSessionData: LiveChatSession = {
        sessionId,
        userEmail:
          existing?.userEmail ??
          `${senderProfile.email || "student"} ↔ ${receiverProfile.email || "match"}`,
        userAlias: existing?.userAlias ?? senderLabel,
        targetAlias: existing?.targetAlias ?? targetLabel,
        college: existing?.college ?? `${senderProfile.collegeName || "Campus"}`,
        lastActive: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        messages: mergedMessages,
        startedAt: existing?.startedAt || new Date().toLocaleString(),
        endedAt: wasEnded ? undefined : existing?.endedAt,
        status: wasEnded ? "active" : existing?.status ?? "active",
        participants:
          existing?.participants ??
          [buildParticipant(senderProfile), buildParticipant(receiverProfile)],
      };

      const filtered = activeChats.filter((c) => c.sessionId !== sessionId);
      localStorage.setItem(
        "heartlink_admin_live_chats",
        JSON.stringify([liveSessionData, ...filtered])
      );
    },
    []
  );

  // Mark a chat as finished for the admin (it is NEVER removed from the admin)
  const markChatEnded = useCallback(
    (matchId: string, status: "deleted" | "expired" | "reported" | "ended" | "unmatched") => {
      const sessionId = chatSessionIdsRef.current[matchId];
      if (!sessionId) return;
      try {
        const all: LiveChatSession[] = JSON.parse(
          localStorage.getItem("heartlink_admin_live_chats") || "[]"
        );
        const updated = all.map((c) =>
          c.sessionId === sessionId
            ? { ...c, status, endedAt: new Date().toLocaleString() }
            : c
        );
        localStorage.setItem("heartlink_admin_live_chats", JSON.stringify(updated));
      } catch {
        // ignore
      }
      delete chatSessionIdsRef.current[matchId];
    },
    []
  );

  const checkAdminApprovalStatus = useCallback(() => {
    if (!account) return;
    const sharedQueue = JSON.parse(
      localStorage.getItem("heartlink_admin_verification_queue") || "[]"
    );
    const found = sharedQueue.find(
      (item: { id: string; email: string; verificationStatus?: string; status?: string }) =>
        item.id === account.id || item.email === account.email
    );
    let resolvedStatus = found?.verificationStatus || found?.status;
    if (!resolvedStatus || resolvedStatus === "pending") {
      // The admin site also writes the decision straight onto the stored account
      try {
        const stored = JSON.parse(localStorage.getItem("heartlink_student_account") || "null");
        if (stored && (stored.id === account.id || stored.email === account.email) && stored.verificationStatus) {
          resolvedStatus = stored.verificationStatus;
        }
      } catch {
        // ignore
      }
    }

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
    checkAdminApprovalStatus();
    const interval = setInterval(checkAdminApprovalStatus, 1000);
    const onStorage = () => checkAdminApprovalStatus();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, [account, checkAdminApprovalStatus]);

  // ======================================================================
  // SAFETY: block list, one-active-device login, screenshot deterrents
  // ======================================================================
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [blockTarget, setBlockTarget] = useState<StudentProfile | null>(null);
  const [privacyShield, setPrivacyShield] = useState<"" | "hidden" | "idle" | "capture">("");
  const deviceIdRef = useRef<string>("");

  // keep block list fresh (so blocks made by the OTHER student apply here too)
  useEffect(() => {
    const load = () => {
      const next = readBlocks();
      setBlocks((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    load();
    const t = setInterval(load, 2000);
    window.addEventListener("storage", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", load);
    };
  }, []);

  // One active device per account: each tab/device gets an id, the LAST login wins
  useEffect(() => {
    let id = sessionStorage.getItem("heartlink_device_id");
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("heartlink_device_id", id);
    }
    deviceIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!account?.email) return;
    const key = account.email.toLowerCase();
    try {
      const all = JSON.parse(localStorage.getItem("heartlink_active_sessions") || "{}");
      if (all[key]?.deviceId !== deviceIdRef.current) {
        all[key] = { deviceId: deviceIdRef.current, at: Date.now() };
        localStorage.setItem("heartlink_active_sessions", JSON.stringify(all));
      }
    } catch {
      // ignore
    }
    const check = () => {
      try {
        const all = JSON.parse(localStorage.getItem("heartlink_active_sessions") || "{}");
        const owner = all[key];
        if (owner && owner.deviceId !== deviceIdRef.current) forceLogoutOtherDevice();
      } catch {
        // ignore
      }
    };
    const t = setInterval(check, 1500);
    window.addEventListener("storage", check);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.email]);

  // Screenshot deterrents while a chat is open: hide on tab switch / Print Screen / inactivity
  useEffect(() => {
    if (activeTab !== "chat") {
      setPrivacyShield("");
      return;
    }
    const IDLE_MS = 20000;
    let idleTimer: ReturnType<typeof setTimeout>;
    const armIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setPrivacyShield((p) => p || "idle"), IDLE_MS);
    };
    const wake = () => {
      setPrivacyShield((p) => (p === "idle" ? "" : p));
      armIdle();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setPrivacyShield("hidden");
      else setPrivacyShield((p) => (p === "hidden" ? "" : p));
    };
    const onBlur = () => setPrivacyShield((p) => p || "hidden");
    const onFocus = () => setPrivacyShield((p) => (p === "hidden" ? "" : p));
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setPrivacyShield("capture");
        try {
          navigator.clipboard.writeText(" ");
        } catch {
          // ignore
        }
        setTimeout(() => setPrivacyShield((p) => (p === "capture" ? "" : p)), 4000);
      }
    };
    // Hide the chat the moment a screenshot / print shortcut is pressed (before the OS grabs the screen)
    const lock = (ms: number) => {
      setPrivacyShield("capture");
      setTimeout(() => setPrivacyShield((p) => (p === "capture" ? "" : p)), ms);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      const shot =
        k === "printscreen" ||
        k === "meta" ||
        k === "os" ||
        (e.metaKey && e.shiftKey) ||
        (e.ctrlKey && e.shiftKey && k === "s") ||
        ((e.ctrlKey || e.metaKey) && (k === "p" || k === "s"));
      if (shot) lock(4000);
    };
    const onPrint = () => lock(4000);
    armIdle();
    const evs = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;
    evs.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeprint", onPrint);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(idleTimer);
      evs.forEach((ev) => window.removeEventListener(ev, wake));
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeprint", onPrint);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeTab]);

  // Approved but no nickname yet -> always land on the nickname step (no reload needed)
  useEffect(() => {
    if (account?.verificationStatus === "verified" && !myProfile && activeTab !== "onboarding") {
      setActiveTab("onboarding");
    }
  }, [account?.verificationStatus, myProfile, activeTab]);

  const dispatchEmailOtp = async (
    targetEmail: string,
    provider: "google_oauth" | "email_otp"
  ) => {
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
        setOtpDeliveryNote(`✓ OTP sent to ${targetEmail}`);
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

  const handleLoginOrSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!email.trim() || !email.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (phone.length !== 10) {
      setAuthError("Mobile number must be exactly 10 digits.");
      return;
    }

    const check = evaluateLoginCredentials(email, phone);

    if (check.outcome === "error") {
      setAuthError(check.errorMessage || "Invalid login credentials.");
      return;
    }

    if (check.outcome === "direct_login" || check.outcome === "pending_or_rejected") {
      return;
    }

    await dispatchEmailOtp(email.trim().toLowerCase(), "email_otp");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (enteredOtp.trim() !== generatedOtp) {
      setAuthError("Invalid OTP code. Please check and try again.");
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

    if (
      !fullName.trim() ||
      !collegeName.trim() ||
      !branch.trim() ||
      !idCardFrontBase64 ||
      !idCardBackBase64
    ) {
      setAuthError("All fields and ID card images (front & back) are required.");
      return;
    }

    const check = evaluateLoginCredentials(email, phone);
    if (check.outcome === "error") {
      setAuthError(check.errorMessage || "Email or Mobile number conflict.");
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

      const existingQueue = JSON.parse(
        localStorage.getItem("heartlink_admin_verification_queue") || "[]"
      );
      const queueItem = {
        ...newAccount,
        status: "pending",
        submittedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      localStorage.setItem(
        "heartlink_admin_verification_queue",
        JSON.stringify([
          queueItem,
          ...existingQueue.filter((i: { email: string }) => i.email !== newAccount.email),
        ])
      );

      const existingUsers = JSON.parse(
        localStorage.getItem("college_dating_all_users") || "[]"
      );
      const pendingStudentEntry: StudentProfile = {
        id: ticketId,
        alias: `User_${phone.slice(-4)}`,
        avatar: "🪪",
        yearDept: `${newAccount.year} • ${newAccount.branch}`,
        bio: "Campus explorer & student.",
        interests: [newAccount.branch, newAccount.year],
        compatibility: 92,
        status: "pending",
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
        JSON.stringify([
          pendingStudentEntry,
          ...existingUsers.filter((u: { id: string }) => u.id !== ticketId),
        ])
      );
    } catch {
      setAuthError("Storage error. Please upload smaller images.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setAccount(newAccount);
  };

  // All nicknames already taken by OTHER students (fresh read every time)
  const getTakenNicknames = () => {
    const taken = new Set<string>();
    try {
      const all: { id: string; alias?: string }[] = JSON.parse(
        localStorage.getItem("college_dating_all_users") || "[]"
      );
      all.forEach((u) => {
        if (u.alias && u.id !== account?.id) taken.add(normalizeNick(u.alias));
      });
    } catch {
      // ignore
    }
    feed.forEach((u) => {
      if (u.alias && u.id !== account?.id) taken.add(normalizeNick(u.alias));
    });
    return taken;
  };

  const handleRandomAlias = () => {
    const taken = getTakenNicknames();
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    let name = "";
    for (let i = 0; i < 300; i++) {
      const candidate = `${pick(NICK_ADJECTIVES)}${pick(NICK_NOUNS)}`;
      if (!taken.has(normalizeNick(candidate))) {
        name = candidate;
        break;
      }
    }
    if (!name) {
      // every two-word combo used up: use three words (still no numbers)
      for (let i = 0; i < 300 && !name; i++) {
        const candidate = `${pick(NICK_ADJECTIVES)}${pick(NICK_ADJECTIVES)}${pick(NICK_NOUNS)}`;
        if (!taken.has(normalizeNick(candidate))) name = candidate;
      }
    }
    setAlias(name);
    setAliasError("");
  };

  const handleCreatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !alias.trim()) return;

    if (getTakenNicknames().has(normalizeNick(alias))) {
      setAliasError(`"${alias.trim()}" is already taken by another student. Please choose a different nickname.`);
      return;
    }
    setAliasError("");

    if (!selectedAvatar) {
      setAvatarError("Please choose an avatar to continue.");
      return;
    }
    setAvatarError("");

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
      idCardFrontImage: account.idCardFrontImage,
      idCardBackImage: account.idCardBackImage,
    };

    localStorage.setItem("heartlink_student_profile", JSON.stringify(newProfile));

    const allUsers = JSON.parse(
      localStorage.getItem("college_dating_all_users") || "[]"
    );
    localStorage.setItem(
      "college_dating_all_users",
      JSON.stringify([
        newProfile,
        ...allUsers.filter(
          (u: { id: string; email?: string }) =>
            u.id !== newProfile.id && u.email !== newProfile.email
        ),
      ])
    );

    setMyProfile(newProfile);
    syncFeedAndLiveChats();
    setActiveTab("discover");
  };

  const filteredFeed = feed.filter((candidate) => {
    if (account && candidate.email === account.email) return false;
    if (myProfile && isPairBlocked(myProfile.id, candidate.id)) return false;

    const userGender = account?.gender || myProfile?.gender;
    const candidateGender = candidate.gender;

    if (userGender === "Male" && candidateGender !== "Female") return false;
    if (userGender === "Female" && candidateGender !== "Male") return false;

    if (collegeFilter === "same") {
      return candidate.collegeName === (account?.collegeName || myProfile?.collegeName);
    } else {
      return candidate.collegeName !== (account?.collegeName || myProfile?.collegeName);
    }
  });

  const currentCandidate = filteredFeed[currentIndex];

  // ------------------------------------------------------------------------
  // Chats no longer expire. Instead every student chooses whether THEIR OWN
  // messages vanish (after seen / 1 hour / 24 hours). The admin copy is permanent.
  // ------------------------------------------------------------------------
  const [chatStarts, setChatStarts] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  // On laptop (two-pane chat) open the first match automatically
  useEffect(() => {
    if (activeTab === "chat" && !activeMatch && matches.length > 0) {
      setActiveMatch(matches[0]);
    }
  }, [activeTab, activeMatch, matches]);

  const handleSelectMatch = (m: StudentProfile) => {
    setActiveMatch(m);
  };

  // Delete chat: removes the match and its messages entirely
  const handleDeleteChat = () => {
    if (!activeMatch) return;
    const deletedId = activeMatch.id;
    const delReq = reqIdByMatchRef.current[deletedId];
    if (delReq && myProfile) {
      updateSparkRequest(delReq, (r) => ({ ...r, hiddenFor: [...r.hiddenFor, myProfile.id] }));
    }
    delete reqIdByMatchRef.current[deletedId];
    markChatEnded(deletedId, "deleted");
    setMatches((prev) => prev.filter((m) => m.id !== deletedId));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[deletedId];
      return next;
    });
    setChatStarts((prev) => {
      const next = { ...prev };
      delete next[deletedId];
      return next;
    });
    setActiveMatch(null);
  };

  // ========================================================================
  // SPARK REQUESTS: a Spark is only a request. The other student must ACCEPT
  // it before any chat exists. They are notified the moment it is sent.
  // ========================================================================
  const [sparkRequests, setSparkRequests] = useState<SparkRequest[]>([]);
  const [toast, setToast] = useState<{ text: string; tab?: "sparks" | "chat" | "confess" } | null>(null);
  const reqIdByMatchRef = useRef<Record<string, string>>({});
  const notifiedRef = useRef<Set<string>>(new Set());
  const firstPollRef = useRef<boolean>(true);

  const notifyUser = useCallback((text: string, tab?: "sparks" | "chat" | "confess") => {
    setToast({ text, tab });
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("CampusSpark ⚡", { body: text });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!myProfile) return;
    const me = myProfile;

    const sync = () => {
      let list = readSparkRequests();
      let changed = false;

      // Demo students (stu_xxx) are not real people, so they "accept" after 5 seconds
      list = list.map((r) => {
        if (
          r.status === "pending" &&
          r.fromId === me.id &&
          r.toId.startsWith("stu_") &&
          Date.now() - r.createdAt >= 5000
        ) {
          changed = true;
          appendSharedMessage(r.id, {
            id: `msg_${Date.now()}_demo_accept`,
            senderAlias: r.toAlias,
            text: `Hey ${me.alias}! Thanks for the Spark ⚡ Happy to chat!`,
            timestamp: nowLabel(),
          });
          return { ...r, status: "accepted" as const, respondedAt: Date.now() };
        }
        return r;
      });
      if (changed) writeSparkRequests(list);

      const mine = list.filter((r) => r.fromId === me.id || r.toId === me.id);
      setSparkRequests((prev) =>
        JSON.stringify(prev) === JSON.stringify(mine) ? prev : mine
      );

      // 1) Notify about incoming Sparks waiting for my answer
      const incoming = mine.filter(
        (r) => r.toId === me.id && r.status === "pending" && !isPairBlocked(me.id, r.fromId)
      );
      if (firstPollRef.current) {
        incoming.forEach((r) => notifiedRef.current.add(`in:${r.id}`));
        if (incoming.length > 0) {
          notifyUser(
            `⚡ You have ${incoming.length} pending Spark request${incoming.length > 1 ? "s" : ""}`,
            "sparks"
          );
        }
      } else {
        incoming.forEach((r) => {
          const k = `in:${r.id}`;
          if (!notifiedRef.current.has(k)) {
            notifiedRef.current.add(k);
            notifyUser(`⚡ ${r.fromAlias} sent you a Spark! Accept or decline it.`, "sparks");
          }
        });
      }
      firstPollRef.current = false;

      // 2) Tell me when someone accepted / declined the Spark I sent
      const results = mine.filter(
        (r) => r.fromId === me.id && r.status !== "pending" && !r.seenByFrom
      );
      if (results.length > 0) {
        results.forEach((r) =>
          notifyUser(
            r.status === "accepted"
              ? `🎉 ${r.toAlias} accepted your Spark! You can chat now.`
              : `${r.toAlias} declined your Spark.`,
            r.status === "accepted" ? "chat" : "sparks"
          )
        );
        writeSparkRequests(
          readSparkRequests().map((r) =>
            results.some((x) => x.id === r.id) ? { ...r, seenByFrom: true } : r
          )
        );
      }

      // 2b) A student rejected the other AFTER accepting: close that chat here too
      const ended = mine.filter((r) => r.status === "rejected" && r.wasAccepted);
      if (ended.length > 0) {
        const otherIdOf = (r: SparkRequest) => (r.fromId === me.id ? r.toId : r.fromId);
        const endedIds = ended.map(otherIdOf);
        setMatches((prev) => (prev.some((m) => endedIds.includes(m.id)) ? prev.filter((m) => !endedIds.includes(m.id)) : prev));
        setActiveMatch((cur) => (cur && endedIds.includes(cur.id) ? null : cur));
        endedIds.forEach((id) => {
          delete reqIdByMatchRef.current[id];
          delete chatSessionIdsRef.current[id];
        });
        const unseen = ended.filter(
          (r) => r.rejectedBy !== me.id && !(r.endSeenBy || []).includes(me.id)
        );
        if (unseen.length > 0) {
          unseen.forEach((r) =>
            notifyUser(
              `${r.fromId === me.id ? r.toAlias : r.fromAlias} unsparked you. The chat has been closed.`,
              "sparks"
            )
          );
          writeSparkRequests(
            readSparkRequests().map((r) =>
              unseen.some((x) => x.id === r.id)
                ? { ...r, endSeenBy: [...(r.endSeenBy || []), me.id] }
                : r
            )
          );
        }
      }

      // 3) Open chats exist ONLY for accepted Sparks
      const now = Date.now();
      const active = mine.filter(
        (r) =>
          r.status === "accepted" &&
          !!r.respondedAt &&
          !r.hiddenFor.includes(me.id)
      );
      const sharedAll = readSharedMessages();
      const otherOf = (r: SparkRequest) => (r.fromId === me.id ? r.toProfile : r.fromProfile);

      // Vanishing messages: make sure the admin has a permanent copy, then remove them for students
      let purged = false;
      active.forEach((r) => {
        const thread = sharedAll[r.id] || [];
        const gone = thread.filter((m) => isMsgExpired(m, now));
        if (gone.length === 0) return;
        const stamp = new Date().toLocaleString();
        pushChatToAdminLive(
          me,
          otherOf(r),
          thread.map((m) => (gone.includes(m) ? { ...m, vanishedAt: m.vanishedAt || stamp } : m))
        );
        sharedAll[r.id] = thread.filter((m) => !isMsgExpired(m, now));
        purged = true;
      });
      if (purged) localStorage.setItem(SHARED_MSG_KEY, JSON.stringify(sharedAll));

      active.forEach((r) => {
        const other = otherOf(r);
        reqIdByMatchRef.current[other.id] = r.id;
        chatSessionIdsRef.current[other.id] = `${getSharedSessionId(r.fromAlias, r.toAlias)}`;
      });

      setMatches((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const add = active.map(otherOf).filter((m) => !ids.has(m.id));
        return add.length > 0 ? [...prev, ...add] : prev;
      });
      setChatStarts((prev) => {
        let ch = false;
        const next = { ...prev };
        active.forEach((r) => {
          const id = otherOf(r).id;
          if (next[id] !== r.respondedAt) {
            next[id] = r.respondedAt as number;
            ch = true;
          }
        });
        return ch ? next : prev;
      });
      setMessages((prev) => {
        let ch = false;
        const next = { ...prev };
        active.forEach((r) => {
          const id = otherOf(r).id;
          const thread = sharedAll[r.id] || [];
          const cur = prev[id] || [];
          if (JSON.stringify(thread) !== JSON.stringify(cur)) {
            next[id] = thread;
            ch = true;
          }
        });
        return ch ? next : prev;
      });
    };

    sync();
    const iv = setInterval(sync, 1500);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(iv);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile, notifyUser]);

  // ========================================================================
  // CONFESSIONS: NGL-style anonymous wall. A confession goes to EVERY student
  // of the same college. Nobody sees who wrote it (only admin moderators can).
  // ========================================================================
  const myCollege = myProfile?.collegeName || account?.collegeName || "";
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [confessionText, setConfessionText] = useState<string>("");
  const [confessionTheme, setConfessionTheme] = useState<number>(0);
  const [confessionNote, setConfessionNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confessLastSeen, setConfessLastSeen] = useState<number>(0);
  const knownConfessionsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!myProfile) return;
    const me = myProfile;
    const saved = Number(localStorage.getItem(`heartlink_confess_seen_${me.id}`) || "0");
    setConfessLastSeen(saved);
  }, [myProfile]);

  useEffect(() => {
    if (!myProfile || !myCollege) return;
    const me = myProfile;
    const sync = () => {
      const visible = readConfessions()
        .filter(
          (c) =>
            c.college === myCollege &&
            !c.hidden &&
            c.reports.length < 3 &&
            !c.reports.includes(me.id)
        )
        .sort((a, b) => b.createdAt - a.createdAt);
      setConfessions((prev) => (JSON.stringify(prev) === JSON.stringify(visible) ? prev : visible));
      if (knownConfessionsRef.current === null) {
        knownConfessionsRef.current = new Set(visible.map((c) => c.id));
      } else {
        const fresh = visible.filter((c) => !knownConfessionsRef.current!.has(c.id));
        fresh.forEach((c) => knownConfessionsRef.current!.add(c.id));
        if (fresh.some((c) => c.authorId !== me.id)) {
          notifyUser("🤫 New anonymous confession at your college!", "confess");
        }
      }
    };
    sync();
    const iv = setInterval(sync, 2000);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(iv);
      window.removeEventListener("storage", sync);
    };
  }, [myProfile, myCollege, notifyUser]);

  useEffect(() => {
    if (activeTab !== "confess" || !myProfile) return;
    const t = Date.now();
    setConfessLastSeen(t);
    localStorage.setItem(`heartlink_confess_seen_${myProfile.id}`, String(t));
  }, [activeTab, myProfile, confessions.length]);

  const unreadConfessions = myProfile
    ? confessions.filter((c) => c.createdAt > confessLastSeen && c.authorId !== myProfile.id).length
    : 0;

  const handleSubmitConfession = () => {
    if (!myProfile || !myCollege) return;
    const text = confessionText.trim();
    if (text.length < 5) {
      setConfessionNote({ ok: false, text: "Write a few more words 💭" });
      return;
    }
    const issue = confessionIssue(text);
    if (issue) {
      setConfessionNote({ ok: false, text: issue });
      return;
    }
    const all = readConfessions();
    const recent = all.filter((c) => c.authorId === myProfile.id && Date.now() - c.createdAt < 60 * 60 * 1000);
    if (recent.length >= 5) {
      setConfessionNote({ ok: false, text: "You've posted a lot! Try again in a bit ⏳" });
      return;
    }
    const c: Confession = {
      id: `CNF_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      college: myCollege,
      text,
      theme: confessionTheme,
      createdAt: Date.now(),
      authorId: myProfile.id,
      authorAlias: myProfile.alias,
      reactions: {},
      reports: [],
    };
    writeConfessions([c, ...all]);
    knownConfessionsRef.current?.add(c.id);
    setConfessions((prev) => [c, ...prev]);
    setConfessionText("");
    setConfessionNote({ ok: true, text: "🚀 Sent! Everyone at your college can see it now — nobody knows it's you." });
    setTimeout(() => setConfessionNote(null), 5000);
  };

  const handleReactConfession = (id: string, emoji: string) => {
    if (!myProfile) return;
    const next = readConfessions().map((c) => {
      if (c.id !== id) return c;
      const reactions = { ...c.reactions };
      if (reactions[myProfile.id] === emoji) delete reactions[myProfile.id];
      else reactions[myProfile.id] = emoji;
      return { ...c, reactions };
    });
    writeConfessions(next);
    setConfessions((prev) =>
      prev.map((c) => (c.id === id ? next.find((x) => x.id === id) || c : c))
    );
  };

  const handleReportConfession = (id: string) => {
    if (!myProfile) return;
    writeConfessions(
      readConfessions().map((c) =>
        c.id === id && !c.reports.includes(myProfile.id)
          ? { ...c, reports: [...c.reports, myProfile.id] }
          : c
      )
    );
    setConfessions((prev) => prev.filter((c) => c.id !== id));
    notifyUser("🚩 Thanks — we hid it for you and sent it to the moderators.");
  };

  // ========================================================================
  // CHAT EXTRAS: disappearing messages, reply, reactions, GIFs, couple games
  // ========================================================================
  const [vanishMode, setVanishMode] = useState<VanishMode>("off");
  const [showVanishMenu, setShowVanishMenu] = useState<boolean>(false);
  const [showChatMenu, setShowChatMenu] = useState<boolean>(false);
  const chatMenuRef = useRef<HTMLDivElement | null>(null);

  // Close the ⋮ menu when the user taps/clicks anywhere outside it (or presses Esc)
  useEffect(() => {
    if (!showChatMenu) return;
    const onOutside = (e: Event) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setShowChatMenu(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowChatMenu(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showChatMenu]);

  // ---- Online / last-seen presence ----
  // Every signed-in student stamps "I'm active" every 10s while the tab is visible.
  const [presence, setPresence] = useState<Record<string, number>>({});
  useEffect(() => {
    const read = () => {
      try {
        const raw = JSON.parse(localStorage.getItem(PRESENCE_KEY) || "{}");
        setPresence(raw && typeof raw === "object" ? raw : {});
      } catch {
        setPresence({});
      }
    };
    const beat = () => {
      if (!myProfile?.id || document.visibilityState !== "visible") return;
      try {
        const raw = JSON.parse(localStorage.getItem(PRESENCE_KEY) || "{}");
        raw[myProfile.id] = Date.now();
        localStorage.setItem(PRESENCE_KEY, JSON.stringify(raw));
      } catch {
        // ignore
      }
    };
    beat();
    read();
    const beatTimer = setInterval(beat, 10000);
    const readTimer = setInterval(read, 5000);
    const onVisible = () => {
      beat();
      read();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", read);
    return () => {
      clearInterval(beatTimer);
      clearInterval(readTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", read);
    };
  }, [myProfile?.id]);

  const presenceInfo = (id?: string): { online: boolean; label: string } => {
    const ts = id ? presence[id] : undefined;
    if (!ts) return { online: false, label: "Offline" };
    const diff = Date.now() - ts;
    if (diff < ONLINE_WINDOW_MS) return { online: true, label: "Online" };
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return { online: false, label: "Last seen just now" };
    if (mins < 60) return { online: false, label: `Last seen ${mins}m ago` };
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return { online: false, label: `Last seen ${hrs}h ago` };
    return { online: false, label: `Last seen ${Math.floor(hrs / 24)}d ago` };
  };

  // ⚡ / ❤️ / ✕ burst effects (fired from Spark, Pass, Accept and Reject buttons)
  const fxCounter = useRef<number>(0);
  const [fxBursts, setFxBursts] = useState<FxBurst[]>([]);
  const triggerFx = (e: React.MouseEvent<HTMLElement>, kind: "spark" | "pass") => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(kind === "spark" ? [14, 30, 14] : 10);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const parts: FxPart[] = [];
    if (kind === "spark") {
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + rnd(-0.3, 0.3);
        const dist = rnd(60, 115);
        parts.push({ ch: "⚡", dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, s: rnd(0.9, 1.4), r: rnd(-40, 40), delay: 0, dur: 0.75 });
      }
      const hearts = ["❤️", "💖", "💗", "💘"];
      for (let i = 0; i < 6; i++) {
        parts.push({ ch: hearts[i % hearts.length], dx: rnd(-70, 70), dy: rnd(-230, -130), s: rnd(0.9, 1.6), r: rnd(-25, 25), delay: rnd(0, 0.25), dur: rnd(1.0, 1.4) });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        parts.push({ ch: i % 2 === 0 ? "✕" : "💨", dx: rnd(-95, 95), dy: rnd(-25, 75), s: rnd(0.7, 1.2), r: rnd(-60, 60), delay: 0, dur: 0.6 });
      }
    }
    const id = ++fxCounter.current;
    setFxBursts((prev) => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind, parts }]);
    setTimeout(() => setFxBursts((prev) => prev.filter((b) => b.id !== id)), 1900);
  };

  const fxLayer = (
    <>
      <style>{GLOBAL_FX_CSS}</style>
      {fxBursts.length > 0 && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
          {fxBursts.map((b) => (
            <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
              <span className={`fx-ring ${b.kind === "spark" ? "fx-ring-spark" : "fx-ring-pass"}`} />
              {b.parts.map((p, i) => (
                <span
                  key={i}
                  className={`fx-part ${b.kind === "pass" ? "fx-pass" : ""}`}
                  style={
                    {
                      "--dx": `${p.dx}px`,
                      "--dy": `${p.dy}px`,
                      "--s": p.s,
                      "--r": `${p.r}deg`,
                      animationDelay: `${p.delay}s`,
                      animationDuration: `${p.dur}s`,
                    } as React.CSSProperties
                  }
                >
                  {p.ch}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
  const [vanishHintSeen, setVanishHintSeen] = useState<boolean>(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [actionMsgId, setActionMsgId] = useState<string | null>(null);
  const [showGames, setShowGames] = useState<boolean>(false);
  const [gameTab, setGameTab] = useState<ChatGame["type"]>("icebreaker");
  const [gamePrompt, setGamePrompt] = useState<string>("");
  const [truthOrDare, setTruthOrDare] = useState<"truth" | "dare">("truth");
  const [flirtyLevel, setFlirtyLevel] = useState<"cute" | "flirty" | "bold">("cute");
  const [twoTruths, setTwoTruths] = useState<string[]>(["", "", ""]);
  const [lieIndex, setLieIndex] = useState<number>(0);
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [emojiCategory, setEmojiCategory] = useState<string>("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    if (!myProfile) return;
    const saved = localStorage.getItem(`heartlink_vanish_mode_${myProfile.id}`) as VanishMode | null;
    if (saved && VANISH_OPTIONS.some((o) => o.id === saved)) setVanishMode(saved);
    setVanishHintSeen(localStorage.getItem("heartlink_vanish_hint_seen") === "1");
  }, [myProfile]);

  const toggleVanishMenu = () => {
    setShowVanishMenu((v) => !v);
    setShowChatMenu(false);
    if (!vanishHintSeen) {
      setVanishHintSeen(true);
      localStorage.setItem("heartlink_vanish_hint_seen", "1");
    }
  };

  const chooseVanishMode = (mode: VanishMode) => {
    setVanishMode(mode);
    setShowVanishMenu(false);
    if (myProfile) localStorage.setItem(`heartlink_vanish_mode_${myProfile.id}`, mode);
  };

  // Reset the chat panels when switching chats
  useEffect(() => {
    setReplyTo(null);
    setActionMsgId(null);
    setShowGames(false);
    setShowEmoji(false);
    setShowVanishMenu(false);
    setShowChatMenu(false);
  }, [activeMatch?.id]);

  // Remember recently used emojis (per browser)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_EMOJI_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentEmojis(parsed.filter((x) => typeof x === "string").slice(0, 24));
      }
    } catch {
      // ignore
    }
  }, []);

  // Tapping an emoji drops it into the message box (the picker stays open for more)
  const insertEmoji = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((x) => x !== emoji)].slice(0, 24);
      try {
        localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Update one message inside a shared thread (reactions, seen, game guesses) and keep the admin copy in sync
  const patchMessageIn = (
    match: StudentProfile,
    msgId: string,
    fn: (m: ChatMessage) => ChatMessage
  ) => {
    if (!myProfile) return;
    const reqId = reqIdByMatchRef.current[match.id];
    if (!reqId) return;
    const all = readSharedMessages();
    const thread = (all[reqId] || []).map((m) => (m.id === msgId ? fn(m) : m));
    all[reqId] = thread;
    localStorage.setItem(SHARED_MSG_KEY, JSON.stringify(all));
    setMessages((prev) => ({ ...prev, [match.id]: thread }));
    pushChatToAdminLive(myProfile, match, thread);
  };

  // Mark the other student's messages as seen when this chat is open and visible
  useEffect(() => {
    if (activeTab !== "chat" || !activeMatch || !myProfile || privacyShield) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const reqId = reqIdByMatchRef.current[activeMatch.id];
    if (!reqId) return;
    const thread = messages[activeMatch.id] || [];
    const unseen = thread.filter(
      (m) =>
        m.senderAlias !== myProfile.alias &&
        m.senderAlias !== SYSTEM_SENDER &&
        !(m.seenBy || []).includes(myProfile.alias)
    );
    if (unseen.length === 0) return;
    const ids = new Set(unseen.map((m) => m.id));
    const now = Date.now();
    const all = readSharedMessages();
    const next = (all[reqId] || []).map((m) =>
      ids.has(m.id)
        ? {
            ...m,
            seenBy: [...(m.seenBy || []), myProfile.alias],
            seenAt: now,
            expiresAt: m.vanish === "seen" ? now + SEEN_VANISH_MS : m.expiresAt,
          }
        : m
    );
    all[reqId] = next;
    localStorage.setItem(SHARED_MSG_KEY, JSON.stringify(all));
    setMessages((prev) => ({ ...prev, [activeMatch.id]: next }));
    pushChatToAdminLive(myProfile, activeMatch, next);
  }, [messages, activeTab, activeMatch, myProfile, privacyShield, pushChatToAdminLive]);

  const buildMessage = (extra: Partial<ChatMessage> & { text: string }): ChatMessage => {
    const created = Date.now();
    const quoted = extra.replyTo ?? (replyTo ? { id: replyTo.id, senderAlias: replyTo.senderAlias, text: replyTo.text } : undefined);
    return {
      id: `msg_${created}_${Math.floor(Math.random() * 1000)}`,
      senderAlias: myProfile!.alias,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: created,
      vanish: vanishMode,
      expiresAt:
        vanishMode === "1h" ? created + 60 * 60 * 1000 : vanishMode === "24h" ? created + 24 * 60 * 60 * 1000 : undefined,
      ...extra,
      replyTo: quoted,
    };
  };

  // One place that stores a message, tells the admin and (for demo students) fakes a reply
  const deliverMessage = (newMsg: ChatMessage) => {
    if (!activeMatch || !myProfile) return;
    const reqId = reqIdByMatchRef.current[activeMatch.id];
    if (!reqId) return; // no accepted Spark = no chat
    const currentThread = appendSharedMessage(reqId, newMsg);
    setMessages((prev) => ({ ...prev, [activeMatch.id]: currentThread }));
    setReplyTo(null);
    pushChatToAdminLive(myProfile, activeMatch, currentThread);

    if (activeMatch.id.startsWith("stu_10")) {
      const targetSnapshot = activeMatch;
      // demo student "sees" the message a moment later
      setTimeout(() => {
        patchMessageIn(targetSnapshot, newMsg.id, (m) => {
          const now = Date.now();
          return {
            ...m,
            seenBy: [...(m.seenBy || []), targetSnapshot.alias],
            seenAt: now,
            expiresAt: m.vanish === "seen" ? now + SEEN_VANISH_MS : m.expiresAt,
          };
        });
      }, 1800);
      setTimeout(() => {
        const autoReplies = [
          "Haha no way! Which block do you usually hang out near?",
          "That's awesome! Have you tried the cold coffee at the campus canteen?",
          "Totally agree! Are you coming for the upcoming college fest?",
          "Wait really? What department are you in?",
        ];
        const replyMsg: ChatMessage = {
          id: `msg_${Date.now()}_reply`,
          senderAlias: targetSnapshot.alias,
          text: pick(autoReplies),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
        };
        const rid = reqIdByMatchRef.current[targetSnapshot.id];
        if (!rid) return;
        const updatedWithReply = appendSharedMessage(rid, replyMsg);
        pushChatToAdminLive(myProfile, targetSnapshot, updatedWithReply);
        setMessages((prev) => ({ ...prev, [targetSnapshot.id]: updatedWithReply }));
      }, 3200);
    }
  };

  const handleToggleReaction = (msg: ChatMessage, emoji: string) => {
    if (!activeMatch || !myProfile) return;
    patchMessageIn(activeMatch, msg.id, (m) => {
      const reactions = { ...(m.reactions || {}) };
      if (reactions[myProfile.alias] === emoji) delete reactions[myProfile.alias];
      else reactions[myProfile.alias] = emoji;
      return { ...m, reactions };
    });
    setActionMsgId(null);
  };

  const handleSendGame = (game: ChatGame) => {
    if (!myProfile || !activeMatch) return;
    const readable =
      game.type === "two_truths"
        ? `🎮 ${game.title}: ${(game.options || []).map((o, i) => `${i + 1}) ${o}`).join("  ")} — (lie is #${(game.lieIndex ?? 0) + 1})`
        : `🎮 ${game.title}: ${game.prompt}`;
    deliverMessage(buildMessage({ text: readable, game }));
    setShowGames(false);
  };

  const handleGuessLie = (msg: ChatMessage, idx: number) => {
    if (!activeMatch) return;
    patchMessageIn(activeMatch, msg.id, (m) =>
      m.game ? { ...m, game: { ...m.game, guess: idx } } : m
    );
  };

  const openGamePanel = (type: ChatGame["type"]) => {
    setGameTab(type);
    setGamePrompt("");
  };

  const drawPrompt = (): string => {
    switch (gameTab) {
      case "icebreaker": return pick(ICEBREAKERS, gamePrompt);
      case "truth_dare": return pick(truthOrDare === "truth" ? TRUTHS : DARES, gamePrompt);
      case "flirty": return pick(FLIRTY[flirtyLevel].items, gamePrompt);
      case "wyr": return pick(WYR, gamePrompt);
      case "nhie": return pick(NHIE, gamePrompt);
      case "who": return pick(WHO, gamePrompt);
      default: return "";
    }
  };

  const handleAcceptSpark = (req: SparkRequest) => {
    if (!myProfile) return;
    const other = req.fromProfile;
    const sys: ChatMessage = {
      id: `msg_${Date.now()}_sys`,
      senderAlias: "⚡ CampusSpark",
      text: `${req.fromAlias} and ${myProfile.alias} are matched! Say hi 👋 Tip: you can make your messages vanish from the 👻 button.`,
      timestamp: nowLabel(),
    };
    const respondedAt = Date.now();
    appendSharedMessage(req.id, sys);
    updateSparkRequest(req.id, (r) => ({ ...r, status: "accepted", respondedAt }));
    reqIdByMatchRef.current[other.id] = req.id;
    chatSessionIdsRef.current[other.id] = `${getSharedSessionId(req.fromAlias, req.toAlias)}`;
    pushChatToAdminLive(myProfile, other, [sys]);

    setSparkRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "accepted", respondedAt } : r))
    );
    setMatches((prev) => (prev.some((m) => m.id === other.id) ? prev : [...prev, other]));
    setChatStarts((prev) => ({ ...prev, [other.id]: respondedAt }));
    setMessages((prev) => ({ ...prev, [other.id]: [sys] }));
    setActiveMatch(other);
    setActiveTab("chat");
  };

  const handleRejectSpark = (req: SparkRequest) => {
    const respondedAt = Date.now();
    updateSparkRequest(req.id, (r) => ({ ...r, status: "rejected", respondedAt }));
    setSparkRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "rejected", respondedAt } : r))
    );
  };

  // Reject someone AFTER accepting: closes the chat for BOTH students
  const handleUnmatch = (target: StudentProfile) => {
    if (!myProfile) return;
    const reqId = reqIdByMatchRef.current[target.id];
    if (reqId) {
      updateSparkRequest(reqId, (r) => ({
        ...r,
        status: "rejected",
        rejectedBy: myProfile.id,
        wasAccepted: true,
        respondedAt: Date.now(),
        endSeenBy: [myProfile.id],
      }));
      setSparkRequests((prev) =>
        prev.map((r) =>
          r.id === reqId
            ? { ...r, status: "rejected", rejectedBy: myProfile.id, wasAccepted: true }
            : r
        )
      );
    }
    markChatEnded(target.id, "unmatched");
    delete reqIdByMatchRef.current[target.id];
    setMatches((prev) => prev.filter((m) => m.id !== target.id));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[target.id];
      return next;
    });
    setChatStarts((prev) => {
      const next = { ...prev };
      delete next[target.id];
      return next;
    });
    setActiveMatch((cur) => (cur && cur.id === target.id ? null : cur));
    setUnmatchTarget(null);
    notifyUser(`You unsparked ${target.alias}. The chat has been closed for both of you.`);
  };

  // Block: ends the chat for both, hides each student from the other, tells the admin
  const handleBlock = (target: StudentProfile) => {
    if (!myProfile) return;
    const entry: BlockEntry = {
      blockerId: myProfile.id,
      blockedId: target.id,
      blockedAlias: target.alias,
      at: new Date().toLocaleString(),
    };
    const next = [entry, ...readBlocks().filter((b) => !(b.blockerId === entry.blockerId && b.blockedId === entry.blockedId))];
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(next));
    setBlocks(next);

    try {
      const adminBlocks = JSON.parse(localStorage.getItem("heartlink_admin_blocks") || "[]");
      localStorage.setItem(
        "heartlink_admin_blocks",
        JSON.stringify([{ ...entry, blockerAlias: myProfile.alias }, ...adminBlocks])
      );
    } catch {
      // ignore
    }

    // decline any pending Spark between the two
    writeSparkRequests(
      readSparkRequests().map((r) =>
        r.status === "pending" &&
        ((r.fromId === myProfile.id && r.toId === target.id) || (r.fromId === target.id && r.toId === myProfile.id))
          ? { ...r, status: "rejected" as const, respondedAt: Date.now(), seenByFrom: true }
          : r
      )
    );

    handleUnmatch(target);
    setBlockTarget(null);
    notifyUser(`🚫 ${target.alias} is blocked. You will not see each other anymore.`);
  };

  const handleUnblock = (blockedId: string) => {
    if (!myProfile) return;
    const next = readBlocks().filter((b) => !(b.blockerId === myProfile.id && b.blockedId === blockedId));
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(next));
    setBlocks(next);
  };

  // Testing helper: pretend a demo student sent ME a Spark
  const handleSimulateIncomingSpark = () => {
    if (!myProfile) return;
    const all = readSparkRequests();
    const pool = DEFAULT_APPROVED_STUDENTS.filter(
      (d) =>
        d.email !== myProfile.email &&
        !all.some((r) => r.fromId === d.id && r.toId === myProfile.id)
    );
    if (pool.length === 0) {
      notifyUser("No more demo students available to send you a Spark.");
      return;
    }
    const demo = pool[Math.floor(Math.random() * pool.length)];
    const req: SparkRequest = {
      id: `SPK_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fromId: demo.id,
      fromAlias: demo.alias,
      fromProfile: slimProfile(demo),
      toId: myProfile.id,
      toAlias: myProfile.alias,
      toProfile: slimProfile(myProfile),
      status: "pending",
      createdAt: Date.now(),
      hiddenFor: [],
    };
    writeSparkRequests([req, ...all]);
  };

  const handleEnableNotifications = async () => {
    try {
      if (typeof Notification === "undefined") {
        notifyUser("This browser does not support desktop notifications.");
        return;
      }
      const result = await Notification.requestPermission();
      notifyUser(
        result === "granted"
          ? "🔔 Desktop notifications enabled!"
          : "Notifications are blocked in your browser settings."
      );
    } catch {
      // ignore
    }
  };

  const handleSwipe = (action: "pass" | "spark") => {
    setFpsBoost(true);
    setTimeout(() => setFpsBoost(false), 600);

    if (currentIndex >= filteredFeed.length) return;
    const target = filteredFeed[currentIndex];

    if (action === "spark" && myProfile) {
      const all = readSparkRequests();
      const now = Date.now();
      const sameChatIsLive = (r: SparkRequest) =>
        r.status === "accepted" &&
        !!r.respondedAt &&
        !r.hiddenFor.includes(myProfile.id);
      const existing = all.find(
        (r) =>
          (r.fromId === myProfile.id && r.toId === target.id) ||
          (r.fromId === target.id && r.toId === myProfile.id)
      );

      if (existing && existing.status === "pending") {
        notifyUser(
          existing.fromId === myProfile.id
            ? `⏳ You already sent ${target.alias} a Spark. Waiting for them to accept.`
            : `${target.alias} already sent you a Spark — accept it in the Sparks tab!`,
          "sparks"
        );
      } else if (existing && existing.status === "rejected") {
        notifyUser(`${target.alias} has declined a Spark, so you can't send another one.`);
      } else if (existing && sameChatIsLive(existing)) {
        notifyUser(`You are already matched with ${target.alias} — opening chat.`, "chat");
        setActiveMatch(target);
        setActiveTab("chat");
      } else {
        const req: SparkRequest = {
          id: `SPK_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          fromId: myProfile.id,
          fromAlias: myProfile.alias,
          fromProfile: slimProfile(myProfile),
          toId: target.id,
          toAlias: target.alias,
          toProfile: slimProfile(target),
          status: "pending",
          createdAt: now,
          hiddenFor: [],
        };
        writeSparkRequests([req, ...all]);
        setSparkRequests((prev) => [req, ...prev]);
        notifyUser(`⚡ Spark sent to ${target.alias}! You can chat once they accept it.`, "sparks");
      }
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeMatch || !myProfile) return;
    deliverMessage(buildMessage({ text: messageInput.trim() }));
    setMessageInput("");
  };

  const handleConfirmReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatch || !myProfile) return;

    const fullHistory = messages[activeMatch.id] || [];
    const newReport: ReportedUserTicket = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      reportedAlias: activeMatch.alias,
      reporterAlias: myProfile.alias,
      reporterEmail: account?.email || "anonymous",
      reason: reportReason.trim() || "No specific reason given",
      reportedAt: new Date().toLocaleString(),
      chatHistory: fullHistory,
    };

    const existingReports = JSON.parse(
      localStorage.getItem("heartlink_admin_reported_chats") || "[]"
    );
    localStorage.setItem(
      "heartlink_admin_reported_chats",
      JSON.stringify([newReport, ...existingReports])
    );

    const repReq = reqIdByMatchRef.current[activeMatch.id];
    if (repReq) {
      updateSparkRequest(repReq, (r) => ({ ...r, hiddenFor: [...r.hiddenFor, myProfile.id] }));
    }
    delete reqIdByMatchRef.current[activeMatch.id];
    markChatEnded(activeMatch.id, "reported");
    setMatches((prev) => prev.filter((m) => m.id !== activeMatch.id));
    setActiveMatch(null);
    setShowReportModal(false);
    setReportReason("");
    setReportSubmittedNote("User reported and chat log submitted to admin.");
    setTimeout(() => setReportSubmittedNote(""), 4000);
  };

  // Another device logged into this account: log THIS one out (keeps the new session's data)
  const forceLogoutOtherDevice = () => {
    setMatches([]);
    setMessages({});
    setChatStarts({});
    setActiveMatch(null);
    setSparkRequests([]);
    reqIdByMatchRef.current = {};
    chatSessionIdsRef.current = {};
    notifiedRef.current = new Set();
    firstPollRef.current = true;
    setToast(null);
    setAccount(null);
    setMyProfile(null);
    setAuthStep("login");
    setAuthError("🔒 You were logged out because this account was opened on another device. Only one active device is allowed per account.");
  };

  const handleLogoutReset = () => {
    // release my claim on the account so I can log in again anywhere
    try {
      if (account?.email) {
        const all = JSON.parse(localStorage.getItem("heartlink_active_sessions") || "{}");
        if (all[account.email.toLowerCase()]?.deviceId === deviceIdRef.current) {
          delete all[account.email.toLowerCase()];
          localStorage.setItem("heartlink_active_sessions", JSON.stringify(all));
        }
      }
    } catch {
      // ignore
    }
    localStorage.removeItem("heartlink_student_account");
    localStorage.removeItem("heartlink_student_profile");
    setMatches([]);
    setMessages({});
    setChatStarts({});
    setActiveMatch(null);
    setSparkRequests([]);
    reqIdByMatchRef.current = {};
    chatSessionIdsRef.current = {};
    notifiedRef.current = new Set();
    firstPollRef.current = true;
    setToast(null);
    setAccount(null);
    setMyProfile(null);
    setAuthError("");
    setAuthStep("login");
  };

  // ==========================================================================
  // SCREEN 1: LOGIN / OTP / COLLEGE DETAILS (KYC)
  // ==========================================================================
  if (!account) {
    const activeColleges =
      baseLocation === "Bangalore" ? BANGALORE_COLLEGES : MYSORE_COLLEGES;
    const filteredColleges = activeColleges.filter((c) =>
      c.toLowerCase().includes(collegeName.toLowerCase())
    );
    const filteredDegrees = DEGREES_DEPARTMENTS.filter((d) =>
      d.toLowerCase().includes(branch.toLowerCase())
    );

    return (
      <main className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans overflow-hidden">
        {fxLayer}
        <FpsMotionBackground boost={fpsBoost || isSendingOtp || isSubmitting} />

        <div
          className={`relative z-10 w-full bg-slate-900/85 backdrop-blur-xl glass-card border border-pink-500/30 rounded-3xl shadow-2xl shadow-pink-500/10 ${
            authStep === "kyc"
              ? "max-w-md lg:max-w-4xl p-4 lg:p-6 space-y-2 lg:space-y-3"
              : "max-w-md lg:max-w-2xl p-6 lg:p-10 space-y-5 lg:space-y-7 lg:[&_input]:text-base lg:[&_input]:py-3.5 lg:[&_select]:text-base lg:[&_select]:py-3.5 lg:[&_label]:text-sm lg:[&_button]:text-base"
          }`}
        >
          <div className="text-center">
            <div className={`rounded-2xl bg-gradient-to-tr from-pink-600 to-violet-600 mx-auto flex items-center justify-center shadow-lg shadow-pink-500/30 ${authStep === "kyc" ? "w-9 h-9 text-lg" : "w-12 h-12 text-2xl"}`}>
              🎭
            </div>
            <h1 className={`font-bold ${authStep === "kyc" ? "text-lg lg:text-xl mt-1.5" : "text-2xl mt-3"}`}>
              {authStep === "login" && "Student Login & Sign Up"}
              {authStep === "otp" && "Verify Your OTP"}
              {authStep === "kyc" && "College Details & ID Upload"}
            </h1>
            {authStep === "login" && (
              <p className="text-xs text-slate-400 mt-1">
                Enter your Email ID and 10-digit Mobile Number. Approved students log in directly; new students proceed to OTP &amp; College ID verification.
              </p>
            )}
          </div>

          {authStep === "login" && (
            <form onSubmit={handleLoginOrSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="name@college.edu.in"
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Mobile Number (10 Digits) *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {phone.length}/10
                  </span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => {
                    handlePhoneChange(e);
                    setAuthError("");
                  }}
                  placeholder="9876543210"
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-medium leading-relaxed">
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 font-semibold text-sm shadow-lg shadow-pink-600/20 transition cursor-pointer"
              >
                {isSendingOtp ? "Sending OTP..." : "Continue →"}
              </button>
            </form>
          )}

          {authStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span>
                    OTP Code:{" "}
                    <strong className="text-white tracking-widest">
                      {generatedOtp}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[11px] cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                {otpDeliveryNote && (
                  <p className="text-[11px] text-slate-400">{otpDeliveryNote}</p>
                )}
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={enteredOtp}
                onChange={(e) =>
                  setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="• • • • • •"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] font-bold"
              />

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-xs text-rose-300">
                  {authError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthStep("login")}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm cursor-pointer"
                >
                  Verify OTP &amp; Enter College Details →
                </button>
              </div>
            </form>
          )}

          {authStep === "kyc" && (
            <form
              onSubmit={handleKycSubmit}
              className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2.5"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name (as per College ID) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Gender *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Male", "Female", "Other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select Base Location *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBaseLocation("Bangalore");
                      setCollegeName("");
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
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
                    className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition ${
                      baseLocation === "Mysore"
                        ? "bg-pink-600 border-pink-500 text-white shadow-lg"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    📍 Mysore
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Study Year *
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>5th Year / PG</option>
                </select>
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
                  onBlur={() =>
                    setTimeout(() => setShowCollegeDropdown(false), 200)
                  }
                  onChange={(e) => {
                    setCollegeName(e.target.value);
                    setShowCollegeDropdown(true);
                  }}
                  placeholder={`Search or type college name in ${baseLocation}...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
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
                  onBlur={() =>
                    setTimeout(() => setShowDegreeDropdown(false), 200)
                  }
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setShowDegreeDropdown(true);
                  }}
                  placeholder="Search degrees..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
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

              <div className="grid grid-cols-2 gap-2 lg:contents">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-pink-500/30 space-y-1.5">
                <span className="text-[10px] font-bold text-pink-400 uppercase block">
                  🪪 College ID — FRONT *
                </span>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold cursor-pointer shadow transition">
                    Browse Front
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFrontUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400 truncate max-w-[110px] lg:max-w-[200px]">
                    {idCardFrontBase64 ? "✓ Front ID attached" : "No file chosen"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-pink-500/30 space-y-1.5">
                <span className="text-[10px] font-bold text-pink-400 uppercase block">
                  🪪 College ID — BACK *
                </span>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold cursor-pointer shadow transition">
                    Browse Back
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400 truncate max-w-[110px] lg:max-w-[200px]">
                    {idCardBackBase64 ? "✓ Back ID attached" : "No file chosen"}
                  </span>
                </div>
              </div>
              </div>

              {authError && (
                <div className="lg:col-span-2 p-2 rounded-xl bg-rose-500/10 text-xs text-rose-300">
                  {authError}
                </div>
              )}

              <div className="flex gap-2 pt-1 lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setAuthStep("otp")}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 font-semibold text-sm cursor-pointer"
                >
                  {isSubmitting ? "Submitting..." : "Send Request to Admin →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    );
  }

  // ==========================================================================
  // SCREEN 2: PENDING / REJECTED ADMIN REVIEW
  // ==========================================================================
  if (
    account.verificationStatus === "pending" ||
    account.verificationStatus === "rejected"
  ) {
    return (
      <main className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
        {fxLayer}
        <FpsMotionBackground boost={false} />
        <div className="relative z-10 max-w-md lg:max-w-xl w-full bg-slate-900/85 backdrop-blur-xl glass-card border border-slate-800 rounded-3xl p-6 lg:p-10 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-3xl">
            {account.verificationStatus === "rejected" ? "❌" : "⏳"}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {account.verificationStatus === "rejected"
                ? "Verification Rejected"
                : "Under Admin Review"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {account.verificationStatus === "rejected"
                ? "Your verification was rejected by admin. Please check details or re-upload."
                : "Your College ID and details have been sent to the Admin Dashboard. Once approved, you can log in anytime using this same Email ID and Mobile Number!"}
            </p>
          </div>
          <button
            onClick={handleLogoutReset}
            className="w-full py-2 rounded-xl border border-slate-800 text-xs text-slate-400 cursor-pointer hover:bg-slate-800 transition"
          >
            ← Back to Login
          </button>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // SCREEN 3: VERIFIED STUDENT PORTAL (DISCOVER, CHAT, FULL PROFILE)
  // ==========================================================================
  const navVisible = !!myProfile && activeTab !== "onboarding";
  const pendingIncoming = sparkRequests.filter(
    (r) => r.toId === myProfile?.id && r.status === "pending" && !isPairBlocked(myProfile?.id ?? "", r.fromId)
  );
  const renderIncomingSparks = () => (
    <div className="space-y-2.5">
      {pendingIncoming.map((r) => (
        <div
          key={r.id}
          className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/40 space-y-2.5 shadow-lg shadow-pink-900/30"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{r.fromProfile.avatar}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {r.fromAlias} <span className="text-pink-400 font-semibold">sent you a Spark ⚡</span>
              </p>
              <p className="text-[10px] text-white/50 truncate">{r.fromProfile.collegeName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { triggerFx(e, "pass"); handleRejectSpark(r); }}
              className="flex-1 h-10 rounded-full bg-white/10 border border-white/15 text-xs font-semibold cursor-pointer hover:bg-rose-500/30 transition"
            >
              ✕ Reject
            </button>
            <button
              onClick={(e) => { triggerFx(e, "spark"); handleAcceptSpark(r); }}
              className="flex-1 h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-xs font-bold cursor-pointer shadow-lg shadow-pink-600/40"
            >
              ✓ Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
  const chatPreview = (matchId: string): { text: string; time: string; unread: boolean } => {
    const thread = (messages[matchId] || []).filter(
      (m) => !isMsgExpired(m, nowTick) && m.senderAlias !== SYSTEM_SENDER
    );
    const last = thread[thread.length - 1];
    if (!last) return { text: "Say hi 👋", time: "", unread: false };
    const mineLast = last.senderAlias === myProfile?.alias;
    const body = last.gif ? "🎞 GIF" : last.game ? `🎮 ${last.game.title}` : last.text;
    return {
      text: `${mineLast ? "You: " : ""}${body}`,
      time: last.timestamp,
      unread: !mineLast && !(last.seenBy || []).includes(myProfile?.alias || "") && activeMatch?.id !== matchId,
    };
  };
  const navBadge = (id: string) =>
    id === "chat" ? matches.length : id === "sparks" ? pendingIncoming.length : id === "confess" ? unreadConfessions : 0;
  const navItems: {
    id: "discover" | "sparks" | "chat" | "confess" | "profile";
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "discover",
      label: "Discover",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z" /></svg>
      ),
    },
    {
      id: "sparks",
      label: "Sparks",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
      ),
    },
    {
      id: "chat",
      label: "Chats",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>
      ),
    },
    {
      id: "confess",
      label: "Confess",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.2 2 11.5c0 2.7 1.2 5.1 3.1 6.8V22l4-2.1c.9.2 1.9.3 2.9.3 5.5 0 10-4.2 10-9.5S17.5 2 12 2Zm-3.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" /></svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z" /></svg>
      ),
    },
  ];

  return (
    <main
      ref={mainRef}
      className="relative min-h-screen lg:h-screen text-white flex flex-col font-sans overflow-hidden"
      style={{
        backgroundColor: "#050006",
        backgroundImage:
          "radial-gradient(ellipse 80% 55% at 100% 0%, rgba(190,24,93,0.55) 0%, rgba(120,10,60,0.25) 45%, transparent 70%), radial-gradient(ellipse 70% 50% at 0% 100%, rgba(88,28,135,0.45) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(30,10,40,0.6) 0%, transparent 80%)",
      }}
    >
      {fxLayer}
      {/* Dark-mode aesthetic background: subtle grid + ghost watermark */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div
        className="pointer-events-none select-none absolute -top-4 left-1/2 -translate-x-1/2 z-0 text-[7.5rem] sm:text-[10rem] lg:text-[16rem] font-black tracking-tighter leading-none whitespace-nowrap"
        style={{ color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.07)" }}
      >
        SPARK
      </div>
      <div className="pointer-events-none absolute -right-24 top-1/3 w-72 h-72 lg:w-[28rem] lg:h-[28rem] rounded-full bg-pink-600/20 blur-3xl z-0" />
      <div className="pointer-events-none absolute -left-24 bottom-1/4 w-72 h-72 lg:w-[28rem] lg:h-[28rem] rounded-full bg-violet-700/20 blur-3xl z-0" />

      {/* ===================== NOTIFICATION TOAST ===================== */}
      {toast && (
        <button
          onClick={() => {
            if (toast.tab) setActiveTab(toast.tab);
            setToast(null);
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-[60] max-w-sm w-[92%] lg:w-96 text-left flex items-start gap-3 p-4 rounded-2xl bg-black/85 backdrop-blur-xl border border-pink-500/40 shadow-2xl shadow-pink-900/50 cursor-pointer"
        >
          <span className="text-2xl">🔔</span>
          <span className="flex-1 text-sm font-semibold text-white">{toast.text}</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            className="text-white/40 hover:text-white text-xs"
          >
            ✕
          </span>
        </button>
      )}

      {/* ===================== LAPTOP SIDEBAR ===================== */}
      {navVisible && myProfile && (
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 z-30 flex-col p-5 bg-black/55 backdrop-blur-xl border-r border-white/10">
          <span className="text-2xl font-extrabold tracking-tight mb-8 px-2">
            Campus<span className="text-pink-500">Spark</span>
          </span>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-3 h-12 px-4 rounded-full text-sm font-semibold cursor-pointer transition ${
                  activeTab === item.id
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-600/50"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {navBadge(item.id) > 0 && (
                  <span
                    className={`ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${
                      item.id === "sparks" ? "bg-rose-500 animate-pulse" : item.id === "confess" ? "bg-fuchsia-500 animate-pulse" : "bg-sky-500"
                    }`}
                  >
                    {navBadge(item.id)}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl">{myProfile.avatar}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">@{myProfile.alias}</p>
                <p className="text-[10px] text-emerald-400">✓ Verified student</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full h-11 rounded-full border border-white/15 hover:bg-white/10 text-xs font-semibold text-white/80 cursor-pointer transition"
            >
              Log Out
            </button>
          </div>
        </aside>
      )}

      {/* Phone top bar */}
      <header className="lg:hidden relative z-20 max-w-md w-full mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
        <span className="text-2xl font-extrabold tracking-tight">
          Campus<span className="text-pink-500">Spark</span>
        </span>
        {myProfile && (
          <button
            onClick={() => setActiveTab("profile")}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-xl cursor-pointer"
            title="Profile"
          >
            {myProfile.avatar}
          </button>
        )}
      </header>

      <div
        ref={contentRef}
        className={`relative z-10 flex-1 w-full mx-auto px-5 pt-2 pb-32 flex flex-col max-w-md ${
          navVisible
            ? "lg:max-w-none lg:pl-72 lg:pr-8 lg:py-8 lg:pb-8 lg:h-screen lg:overflow-y-auto"
            : activeTab === "onboarding"
            ? "lg:max-w-5xl lg:justify-center lg:pb-8"
            : "lg:max-w-xl lg:justify-center lg:pb-8"
        }`}
      >
        {reportSubmittedNote && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl mb-4 text-center backdrop-blur-md">
            {reportSubmittedNote}
          </div>
        )}

        {/* ---------------- ONBOARDING ---------------- */}
        {activeTab === "onboarding" && (
          <section className="my-auto bg-black/50 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-2xl shadow-pink-900/20">
            {/* phone: one vertical column · laptop: two columns side by side */}
            <form onSubmit={handleCreatePersona} className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-5 lg:items-center">
              {/* LEFT: nickname */}
              <div className="space-y-4">
                <h1 className="text-2xl lg:text-3xl font-extrabold">Build Your Secret Persona</h1>
                <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-2xl">
                  ⚠️ Note: Your nickname and avatar are permanent. Once set, they cannot be changed again. Everyone else in the app will see them.
                </p>
                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/40 rounded-2xl px-3 py-2.5">
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="text-red-500 font-extrabold text-xs uppercase tracking-wide animate-pulse">
                    Do not enter your real name!
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-16 h-16 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-4xl transition ${
                      selectedAvatar
                        ? "border-pink-500 bg-pink-500/15 shadow-lg shadow-pink-600/30"
                        : "border-dashed border-white/25 bg-white/5 text-white/30"
                    }`}
                  >
                    {selectedAvatar || "?"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {selectedAvatar ? "Your avatar" : "No avatar selected yet"}
                    </p>
                    <p className="text-[11px] text-white/50">
                      {selectedAvatar ? "This is permanent — you can't change it later." : "Pick one from the avatars."}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">
                    Your Nickname *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={alias}
                      onChange={(e) => {
                        setAlias(e.target.value);
                        setAliasError(
                          e.target.value.trim() && getTakenNicknames().has(normalizeNick(e.target.value))
                            ? "This nickname is already taken. Try another one."
                            : ""
                        );
                      }}
                      placeholder="Enter a nickname (not your real name)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="button"
                      onClick={handleRandomAlias}
                      className="px-4 bg-white/10 rounded-2xl text-pink-400 cursor-pointer"
                      title="Randomize"
                    >
                      🎲
                    </button>
                  </div>
                  {aliasError && (
                    <p className="mt-1.5 text-xs font-semibold text-red-400">❌ {aliasError}</p>
                  )}
                </div>
              </div>

              {/* RIGHT: avatars */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2 text-center">
                  Choose Avatar *
                </label>
                <div className="grid grid-cols-[repeat(auto-fill,3.5rem)] justify-center gap-2 max-h-[11.5rem] lg:max-h-[19.5rem] overflow-y-auto">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setSelectedAvatar(emoji); setAvatarError(""); }}
                      className={`w-14 h-14 flex items-center justify-center text-2xl rounded-2xl border-2 cursor-pointer transition ${
                        selectedAvatar === emoji
                          ? "border-pink-500 bg-pink-500/15 shadow-lg shadow-pink-600/30"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {avatarError && (
                  <p className="mt-2 text-xs font-semibold text-red-400 text-center">❌ {avatarError}</p>
                )}
              </div>

              {/* BUTTONS (full width) */}
              <div className="flex gap-2 pt-2 lg:col-span-2 lg:pt-0">
                <button
                  type="button"
                  onClick={handleLogoutReset}
                  className="py-3 px-5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/80 transition cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-sm cursor-pointer shadow-lg shadow-pink-600/40"
                >
                  Enter Discovery →
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ---------------- DISCOVER (card deck) ---------------- */}
        {activeTab === "discover" && (
          <section className="space-y-4 lg:space-y-0 lg:flex lg:flex-col lg:gap-5 lg:h-full lg:min-h-0 lg:overflow-hidden">
            {/* Filter chips + heading */}
            <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
              <h2 className="hidden lg:block text-2xl font-extrabold">
                Pick your <span className="text-pink-500">Spark</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollegeFilter("same");
                    setCurrentIndex(0);
                  }}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-full text-xs lg:text-sm font-bold transition cursor-pointer border ${
                    collegeFilter === "same"
                      ? "bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-600/40"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  🏫 Same College
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollegeFilter("different");
                    setCurrentIndex(0);
                  }}
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-full text-xs lg:text-sm font-bold transition cursor-pointer border ${
                    collegeFilter === "different"
                      ? "bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-600/40"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  🌍 Different College
                </button>
              </div>
              <h2 className="lg:hidden text-lg font-bold text-white/90">
                Pick your <span className="text-pink-500">Spark</span>
              </h2>
            </div>

            {pendingIncoming.length > 0 && (
              <div className="lg:hidden space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  ⚡ {pendingIncoming.length} new Spark request{pendingIncoming.length > 1 ? "s" : ""}
                </p>
                {renderIncomingSparks()}
              </div>
            )}

            {/* Confession wall teaser - always visible on the main dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab("confess")}
              className="relative w-full lg:shrink-0 overflow-hidden text-left rounded-[2rem] p-4 lg:px-5 lg:py-3 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 shadow-xl shadow-pink-700/40 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition"
            >
              <span className="absolute -right-4 -top-6 text-[7rem] opacity-20 rotate-12 select-none">🤫</span>
              <span className="relative flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-white/80 truncate">
                    Anonymous · {myCollege || "your college"}
                  </span>
                  <span className="block text-base lg:text-xl font-extrabold leading-tight">
                    🤫 Confession Wall
                    {unreadConfessions > 0 && (
                      <span className="ml-2 align-middle px-2 py-0.5 rounded-full bg-white text-pink-600 text-[10px] font-extrabold animate-pulse">
                        {unreadConfessions} new
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-white/90 truncate mt-0.5">
                    {confessions[0]
                      ? <>&ldquo;{confessions[0].text}&rdquo;</>
                      : "Be the first to confess — everyone at your college will see it."}
                  </span>
                </span>
                <span className="shrink-0 px-4 h-10 rounded-full bg-white text-pink-600 text-xs lg:text-sm font-extrabold flex items-center shadow-lg">
                  Confess 💌
                </span>
              </span>
            </button>

            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:flex-1 lg:min-h-0">
              {currentCandidate ? (
                <div className="relative lg:h-full lg:min-h-0">
                  {/* peeking card behind (deck effect) */}
                  <div className="absolute inset-x-4 -bottom-3 lg:-bottom-2 h-full rounded-[2rem] bg-white/5 border border-white/10" />
                  <div className="relative lg:h-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-pink-900/40 bg-black/60 backdrop-blur-xl glass-card lg:grid lg:grid-cols-2">
                    {/* Hero area */}
                    <div
                      className="relative h-72 lg:h-full flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 35%, rgba(236,72,153,0.45), rgba(76,5,40,0.85) 60%, #0a0008 100%)",
                      }}
                    >
                      <span className="text-[8rem] lg:text-[11rem] drop-shadow-[0_10px_30px_rgba(236,72,153,0.5)]">
                        {currentCandidate.avatar}
                      </span>
                      <span className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] lg:text-xs font-semibold border border-white/10">
                        <span className={`w-2 h-2 rounded-full ${presenceInfo(currentCandidate.id).online ? "bg-emerald-400" : "bg-slate-500"}`} />{" "}
                        {presenceInfo(currentCandidate.id).online ? "Online" : presenceInfo(currentCandidate.id).label}
                      </span>
                      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] lg:text-xs font-semibold border border-pink-500/40 text-pink-300">
                        {currentCandidate.gender}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent lg:hidden" />
                    </div>

                    {/* Details */}
                    <div className="p-5 -mt-10 lg:mt-0 lg:p-6 xl:p-8 relative min-w-0 space-y-3 lg:space-y-4 lg:flex lg:flex-col lg:justify-start lg:min-h-0 lg:overflow-hidden overscroll-none">
                      <div>
                        <h3 className="text-xl lg:text-2xl xl:text-3xl font-extrabold leading-tight [overflow-wrap:anywhere]">{currentCandidate.alias}</h3>
                        <p className="text-xs lg:text-sm text-white/60 mt-1">{currentCandidate.yearDept}</p>
                        <p className="text-[11px] lg:text-sm text-pink-400 font-medium mt-1">
                          📍 {currentCandidate.collegeName}
                        </p>
                      </div>
                      {currentCandidate.interests && currentCandidate.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                          {currentCandidate.interests.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 lg:px-3.5 py-1 lg:py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] lg:text-xs text-white/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-white/80 text-sm lg:text-base italic">
                        &ldquo;{currentCandidate.bio}&rdquo;
                      </p>
                      <div className="flex flex-wrap items-center justify-end lg:justify-start gap-3 pt-1 lg:pt-2">
                        <button
                          onClick={(e) => { triggerFx(e, "pass"); handleSwipe("pass"); }}
                          className="w-12 h-12 lg:w-auto lg:h-12 lg:px-6 whitespace-nowrap rounded-full bg-white/10 border border-white/15 text-white/80 text-lg lg:text-base font-semibold cursor-pointer hover:bg-white/20 transition flex items-center justify-center gap-2"
                          title="Pass"
                        >
                          ✕ <span className="hidden lg:inline">Pass</span>
                        </button>
                        <button
                          onClick={(e) => { triggerFx(e, "spark"); handleSwipe("spark"); }}
                          className="w-14 h-14 lg:w-auto lg:h-12 lg:px-7 whitespace-nowrap rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white text-2xl lg:text-base font-bold cursor-pointer shadow-lg shadow-pink-600/50 hover:scale-105 transition flex items-center justify-center gap-2"
                          title="Send Spark request"
                        >
                          ⚡ <span className="hidden lg:inline">Send Spark</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/50 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] p-10 text-center space-y-3 lg:flex lg:flex-col lg:items-center lg:justify-center">
                  <h3 className="text-lg lg:text-2xl font-bold">No more profiles in this filter</h3>
                  <p className="text-xs lg:text-sm text-white/50">
                    Switch between Same College / Different College or reset the swipe deck.
                  </p>
                  <button
                    onClick={() => setCurrentIndex(0)}
                    className="px-6 py-2.5 lg:py-3 rounded-full bg-pink-500 text-white text-xs lg:text-sm font-bold cursor-pointer shadow-lg shadow-pink-600/40"
                  >
                    🔄 Reset Deck
                  </button>
                </div>
              )}

              {/* Laptop-only side panel: quick access to matches */}
              <aside className="hidden lg:flex flex-col gap-4 min-h-0">
                <div className="bg-black/50 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] p-5 flex-1 min-h-0 flex flex-col">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-pink-400 mb-3 flex items-center gap-2">
                    ⚡ Your Sparks
                    {pendingIncoming.length > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                        {pendingIncoming.length}
                      </span>
                    )}
                  </h3>
                  <div className="overflow-y-auto min-h-0 space-y-3">
                  {pendingIncoming.length > 0 ? (
                    renderIncomingSparks()
                  ) : (
                    <p className="text-[11px] text-white/40">
                      🔔 New Spark requests will appear here as soon as someone sends you one.
                    </p>
                  )}
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 pt-1">
                    💬 Your Matches ({matches.length})
                  </p>
                  {matches.length === 0 ? (
                    <p className="text-xs text-white/50">
                      No matches yet. Send a Spark — once they accept it, you can chat!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {matches.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveMatch(m);
                            setActiveTab("chat");
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left cursor-pointer transition"
                        >
                          <span className="text-2xl">{m.avatar}</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold truncate">{m.alias}</span>
                            <span className="block text-[10px] text-white/50 truncate">{m.collegeName}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* ---------------- SPARK REQUESTS ---------------- */}
        {activeTab === "sparks" && myProfile && (() => {
          const received = sparkRequests.filter((r) => r.toId === myProfile.id);
          const sent = sparkRequests.filter((r) => r.fromId === myProfile.id);
          const liveChat = (r: SparkRequest) =>
            r.status === "accepted" &&
            !!r.respondedAt &&
            !r.hiddenFor.includes(myProfile.id);
          return (
            <section className="space-y-5 lg:h-full lg:overflow-y-auto lg:pr-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg lg:text-2xl font-extrabold">
                  ⚡ Spark <span className="text-pink-500">Requests</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleEnableNotifications}
                    className="px-4 h-10 rounded-full bg-white/10 border border-white/15 text-xs font-semibold cursor-pointer hover:bg-white/15 transition"
                  >
                    🔔 Enable desktop alerts
                  </button>
                  <button
                    onClick={handleSimulateIncomingSpark}
                    className="px-4 h-10 rounded-full bg-white/5 border border-dashed border-white/20 text-xs text-white/60 cursor-pointer hover:bg-white/10 transition"
                    title="Testing only: a demo student sends you a Spark"
                  >
                    🧪 Simulate incoming Spark
                  </button>
                </div>
              </div>

              <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
                {/* RECEIVED */}
                <div className="bg-black/50 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] p-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-pink-400">
                    📥 Received ({pendingIncoming.length} waiting)
                  </h3>
                  {received.length === 0 ? (
                    <p className="text-xs text-white/50 py-6 text-center">
                      Nobody has sent you a Spark yet. You will get a notification as soon as someone does!
                    </p>
                  ) : (
                    received.map((r) => (
                      <div key={r.id} className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{r.fromProfile.avatar}</span>
                          <div className="min-w-0">
                            <p className="text-base font-bold truncate">{r.fromAlias}</p>
                            <p className="text-[11px] text-white/60 truncate">{r.fromProfile.yearDept}</p>
                            <p className="text-[11px] text-pink-400 truncate">📍 {r.fromProfile.collegeName}</p>
                          </div>
                        </div>
                        <p className="text-xs italic text-white/70">&ldquo;{r.fromProfile.bio}&rdquo;</p>
                        {r.status === "pending" ? (
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => { triggerFx(e, "pass"); handleRejectSpark(r); }}
                              className="flex-1 h-12 rounded-full bg-white/10 border border-white/15 text-sm font-semibold cursor-pointer hover:bg-rose-500/30 transition"
                            >
                              ✕ Decline
                            </button>
                            <button
                              onClick={(e) => { triggerFx(e, "spark"); handleAcceptSpark(r); }}
                              className="flex-1 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-sm font-bold cursor-pointer shadow-lg shadow-pink-600/40 hover:scale-[1.02] transition"
                            >
                              ✓ Accept &amp; Chat
                            </button>
                          </div>
                        ) : r.status === "accepted" ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-emerald-400 font-semibold">✅ You accepted</span>
                            {liveChat(r) && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setUnmatchTarget(r.fromProfile)}
                                  className="px-4 h-9 rounded-full bg-white/10 border border-white/15 hover:bg-rose-500/30 text-xs font-semibold cursor-pointer transition"
                                >
                                  💔 Unspark
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMatch(r.fromProfile);
                                    setActiveTab("chat");
                                  }}
                                  className="px-4 h-9 rounded-full bg-pink-500 text-xs font-bold cursor-pointer"
                                >
                                  💬 Open chat
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">
                            {r.wasAccepted
                              ? r.rejectedBy === myProfile.id
                                ? "💔 You unsparked this chat"
                                : "💔 They unsparked you"
                              : "❌ You declined"}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* SENT */}
                <div className="bg-black/50 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] p-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-pink-400">
                    📤 Sent ({sent.length})
                  </h3>
                  {sent.length === 0 ? (
                    <p className="text-xs text-white/50 py-6 text-center">
                      You haven&apos;t sent any Sparks. Go to Discover and press ⚡ Send Spark!
                    </p>
                  ) : (
                    sent.map((r) => (
                      <div key={r.id} className="p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <span className="text-3xl">{r.toProfile.avatar}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{r.toAlias}</p>
                          <p className="text-[11px] text-white/50 truncate">{r.toProfile.collegeName}</p>
                        </div>
                        {r.status === "pending" && (
                          <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ⏳ Waiting for them
                          </span>
                        )}
                        {r.status === "accepted" && (
                          liveChat(r) ? (
                            <button
                              onClick={() => {
                                setActiveMatch(r.toProfile);
                                setActiveTab("chat");
                              }}
                              className="px-4 h-9 rounded-full bg-pink-500 text-xs font-bold cursor-pointer"
                            >
                              ✅ Accepted · Chat
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 rounded-full text-[11px] bg-white/10 text-white/50">
                              Chat ended
                            </span>
                          )
                        )}
                        {r.status === "rejected" && (
                          <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            {r.wasAccepted
                              ? r.rejectedBy === myProfile.id
                                ? "🚫 You ended it"
                                : "🚫 Match ended"
                              : "❌ Declined"}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          );
        })()}

        {/* ---------------- CHAT (two panes on laptop) ---------------- */}
        {activeTab === "chat" && (
          <section className="relative bg-[#0b0610]/85 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] overflow-hidden flex flex-col lg:flex-row h-[calc(100dvh-200px)] min-h-[500px] lg:h-full lg:min-h-0 shadow-2xl shadow-pink-900/20">
            <style>{CHAT_ANIM_CSS}</style>

            {/* PRIVACY SHIELD: fully opaque + blurred shapes, nothing of the chat can show through */}
            {privacyShield && (
              <div className="absolute inset-0 z-40 overflow-hidden bg-[#06020a] flex flex-col items-center justify-center text-center p-6 gap-2">
                <div
                  className="absolute -top-16 -left-10 w-72 h-72 rounded-full bg-pink-600/40 blur-3xl"
                  style={{ animation: "shieldFloat 6s ease-in-out infinite" }}
                />
                <div
                  className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full bg-violet-700/40 blur-3xl"
                  style={{ animation: "shieldFloat 7s ease-in-out infinite reverse" }}
                />
                <div className="relative text-5xl">🔒</div>
                <p className="relative font-extrabold text-base">
                  {privacyShield === "capture"
                    ? "Screenshots are not allowed here"
                    : privacyShield === "idle"
                    ? "Chat hidden for your privacy"
                    : "Chat hidden while you're away"}
                </p>
                <p className="relative text-xs text-white/60 max-w-xs">
                  {privacyShield === "idle"
                    ? "Move your mouse, press a key or tap to continue."
                    : privacyShield === "capture"
                    ? "Your chat is hidden. Your username and phone number are watermarked on this screen."
                    : "Come back to this window to continue."}
                </p>
              </div>
            )}

            {/* faint watermark with the viewer's own username + phone number */}
            <div
              className="pointer-events-none absolute inset-0 z-30"
              style={{ backgroundImage: watermarkBackground(`${account?.fullName || account?.email?.split("@")[0] || ""} • ${account?.phone ?? ""}`) }}
            />

            {matches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                <div className="text-6xl">💬</div>
                <p className="text-base font-bold">No chats yet</p>
                <p className="text-xs lg:text-sm text-white/50 max-w-xs">
                  Send a ⚡ Spark in Discover. When they accept it, your chat opens here.
                </p>
              </div>
            ) : (
              <div className={`chat-private flex flex-col lg:flex-row flex-1 min-w-0 min-h-0 ${privacyShield ? "invisible blur-3xl" : ""}`}>
                {/* ================= CONVERSATION LIST ================= */}
                <div className="shrink-0 lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 bg-black/30 flex flex-col min-h-0">
                  <div className="hidden lg:flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-xl font-extrabold">Messages</h3>
                    <span className="min-w-[24px] h-6 px-2 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold flex items-center justify-center">
                      {matches.length}
                    </span>
                  </div>
                  <div className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto p-3 lg:px-3 lg:pb-4 lg:pt-0 min-h-0 [scrollbar-width:none]">
                    {matches.map((m) => {
                      const active = activeMatch?.id === m.id;
                      const pv = chatPreview(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMatch(m)}
                          className={`group shrink-0 flex lg:flex-row flex-col items-center gap-1.5 lg:gap-3 lg:w-full text-center lg:text-left rounded-2xl p-2 lg:p-3 transition-all duration-200 cursor-pointer ${
                            active
                              ? "lg:bg-gradient-to-r lg:from-pink-500/25 lg:to-fuchsia-500/10 lg:ring-1 lg:ring-pink-500/40"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <span className="relative shrink-0">
                            <span
                              className={`w-14 h-14 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-600/30 flex items-center justify-center text-3xl lg:text-2xl ring-2 transition ${
                                active ? "ring-pink-500" : pv.unread ? "ring-fuchsia-400" : "ring-white/10"
                              }`}
                            >
                              {m.avatar}
                            </span>
                            {presenceInfo(m.id).online && (
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0610]" />
                            )}
                          </span>
                          <span className="lg:hidden text-[11px] font-semibold max-w-[64px] truncate">{m.alias}</span>
                          <span className="hidden lg:block min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className={`text-sm truncate ${pv.unread ? "font-extrabold" : "font-bold"}`}>{m.alias}</span>
                              <span className="text-[10px] text-white/40 shrink-0">{pv.time}</span>
                            </span>
                            <span className="flex items-center justify-between gap-2 mt-0.5">
                              <span className={`text-xs truncate ${pv.unread ? "text-white" : "text-white/50"}`}>{pv.text}</span>
                              {pv.unread && <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ================= CONVERSATION ================= */}
                {activeMatch ? (
                  <div className="flex-1 min-w-0 min-h-0 flex flex-col relative">
                    {/* ---- header ---- */}
                    <div className="relative z-20 px-3 lg:px-5 py-2.5 lg:py-3 flex items-center gap-3 bg-black/40 backdrop-blur-xl border-b border-white/10">
                      <span className="relative shrink-0">
                        <span className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-600/30 flex items-center justify-center text-2xl lg:text-3xl ring-2 ring-pink-500/50">
                          {activeMatch.avatar}
                        </span>
                        {presenceInfo(activeMatch.id).online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b0610]" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm lg:text-base font-extrabold truncate leading-tight">{activeMatch.alias}</p>
                        <p
                          className={`text-[11px] leading-tight mt-0.5 flex items-center gap-1.5 ${
                            presenceInfo(activeMatch.id).online ? "text-emerald-400 font-semibold" : "text-white/45"
                          }`}
                        >
                          {presenceInfo(activeMatch.id).online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {presenceInfo(activeMatch.id).label}
                        </p>
                        {/* Highlighted disappearing-messages control */}
                        <button
                          type="button"
                          onClick={toggleVanishMenu}
                          style={!vanishHintSeen && vanishMode === "off" ? { animation: "vanishGlow 1.8s ease-in-out infinite" } : undefined}
                          className={`mt-1 inline-flex items-center gap-1.5 pl-2 pr-2.5 h-7 rounded-full text-[11px] font-bold cursor-pointer transition-all duration-200 border max-w-full ${
                            vanishMode === "off"
                              ? "bg-violet-500/20 border-violet-400/60 text-violet-100 hover:bg-violet-500/30"
                              : "bg-gradient-to-r from-violet-500 to-fuchsia-500 border-transparent text-white shadow-lg shadow-fuchsia-600/40"
                          }`}
                        >
                          <span className="text-sm leading-none">👻</span>
                          <span className="truncate">
                            Disappearing: {VANISH_OPTIONS.find((o) => o.id === vanishMode)?.short}
                          </span>
                          <span className="opacity-70">▾</span>
                        </button>
                      </div>

                      {/* kebab menu */}
                      <div ref={chatMenuRef} className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowChatMenu((v) => !v);
                            setShowVanishMenu(false);
                          }}
                          title="More"
                          className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {showChatMenu && (
                          <>
                            <div
                              className="absolute right-0 top-12 z-40 w-52 rounded-2xl bg-[#150b1d] border border-white/15 shadow-2xl shadow-black/60 p-1.5"
                              style={{ animation: "panelIn .2s cubic-bezier(.2,.8,.2,1)" }}
                            >
                              {[
                                { icon: "🚩", label: "Report", cls: "text-rose-300", fn: () => setShowReportModal(true) },
                                { icon: "⛔", label: "Block", cls: "text-white/90", fn: () => setBlockTarget(activeMatch) },
                                { icon: "💔", label: "Unspark", cls: "text-rose-300", fn: () => setUnmatchTarget(activeMatch) },
                                { icon: "🗑", label: "Delete chat", cls: "text-white/90", fn: handleDeleteChat },
                              ].map((it) => (
                                <button
                                  key={it.label}
                                  type="button"
                                  onClick={() => {
                                    setShowChatMenu(false);
                                    it.fn();
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 cursor-pointer transition ${it.cls}`}
                                >
                                  <span className="text-base">{it.icon}</span>
                                  {it.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ---- disappearing-messages sheet ---- */}
                    {showVanishMenu && (
                      <div
                        className="relative z-20 px-4 lg:px-6 py-4 bg-gradient-to-b from-violet-950/80 to-[#0b0610]/95 border-b border-violet-400/20 space-y-3"
                        style={{ animation: "panelIn .25s cubic-bezier(.2,.8,.2,1)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-extrabold">👻 Disappearing messages</p>
                            <p className="text-[11px] text-white/55 mt-0.5">
                              Choose when <b>your</b> messages vanish. Moderators keep a safety copy of every chat.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowVanishMenu(false)}
                            className="w-8 h-8 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-xs cursor-pointer transition"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {VANISH_OPTIONS.map((o) => {
                            const d = VANISH_DETAILS[o.id];
                            const on = vanishMode === o.id;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => chooseVanishMode(o.id)}
                                className={`flex items-center gap-3 text-left p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                                  on
                                    ? "bg-gradient-to-r from-violet-500/40 to-fuchsia-500/30 border-fuchsia-400/70 shadow-lg shadow-fuchsia-700/20"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                }`}
                              >
                                <span className="text-2xl">{d.icon}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-bold">{d.title}</span>
                                  <span className="block text-[11px] text-white/55">{d.desc}</span>
                                </span>
                                <span
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    on ? "border-fuchsia-300" : "border-white/25"
                                  }`}
                                >
                                  {on && <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-300" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ---- messages ---- */}
                    <div
                      ref={chatScrollRef}
                      className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-3 lg:px-6 py-4 text-sm lg:text-[15px] bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.08),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(236,72,153,0.08),transparent_60%)]"
                    >
                      {(() => {
                        const thread = (messages[activeMatch.id] || []).filter((m) => !isMsgExpired(m, nowTick));
                        const realCount = thread.filter((m) => m.senderAlias !== SYSTEM_SENDER).length;
                        const lastOwn = [...thread].reverse().find((m) => m.senderAlias === myProfile?.alias);
                        const seedHash = activeMatch.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                        const starters = [0, 1, 2].map((i) => ICEBREAKERS[(seedHash + i * 4) % ICEBREAKERS.length]);
                        return (
                          <>
                            {vanishMode !== "off" && (
                              <div className="sticky top-0 z-10 flex justify-center pb-2">
                                <button
                                  type="button"
                                  onClick={toggleVanishMenu}
                                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 backdrop-blur text-[11px] font-bold shadow-lg shadow-fuchsia-700/30 cursor-pointer"
                                >
                                  👻 Disappearing on · {VANISH_DETAILS[vanishMode].title} · Change
                                </button>
                              </div>
                            )}
                            <div className="flex justify-center mb-2">
                              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                                Today
                              </span>
                            </div>

                            {thread.map((msg, i) => {
                              const prev = thread[i - 1];
                              const next = thread[i + 1];
                              const mine = msg.senderAlias === myProfile?.alias;
                              const isSystem = msg.senderAlias === SYSTEM_SENDER;
                              if (isSystem) {
                                return (
                                  <div key={msg.id} className="flex justify-center my-3" style={{ animation: "msgIn .28s ease-out" }}>
                                    <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60 text-center max-w-[88%]">
                                      {msg.text}
                                    </span>
                                  </div>
                                );
                              }
                              const firstOfGroup = !prev || prev.senderAlias !== msg.senderAlias;
                              const lastOfGroup = !next || next.senderAlias !== msg.senderAlias;
                              const reactionCounts = Object.values(msg.reactions || {}).reduce<Record<string, number>>(
                                (acc, e) => ({ ...acc, [e]: (acc[e] || 0) + 1 }),
                                {}
                              );
                              const seen = (msg.seenBy || []).length > 0;
                              const radius = mine
                                ? `rounded-[20px] ${lastOfGroup ? "rounded-br-md" : ""}`
                                : `rounded-[20px] ${lastOfGroup ? "rounded-bl-md" : ""}`;
                              const bubbleBase = msg.gif
                                ? "p-1.5 bg-white/5 border border-white/10"
                                : msg.game
                                ? "px-4 py-3 bg-gradient-to-br from-violet-600/60 to-fuchsia-600/60 border border-white/20"
                                : mine
                                ? "px-3.5 py-2 bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-900/30"
                                : "px-3.5 py-2 bg-white/10 text-white/95 border border-white/5";
                              return (
                                <div
                                  key={msg.id}
                                  style={{ animation: "msgIn .28s cubic-bezier(.2,.8,.2,1)" }}
                                  className={`flex flex-col ${mine ? "items-end" : "items-start"} ${firstOfGroup ? "mt-3" : "mt-0.5"}`}
                                >
                                  <div className={`group flex items-end gap-1.5 max-w-[86%] lg:max-w-[68%] ${mine ? "flex-row-reverse" : ""}`}>
                                    <div
                                      onClick={() => setActionMsgId(actionMsgId === msg.id ? null : msg.id)}
                                      className={`min-w-0 cursor-pointer ${radius} ${bubbleBase}`}
                                    >
                                      {msg.replyTo && (
                                        <div className="mb-1.5 px-2.5 py-1.5 rounded-xl bg-black/25 border-l-[3px] border-white/60 text-[11px] max-w-full">
                                          <p className="font-bold opacity-80 truncate">{msg.replyTo.senderAlias}</p>
                                          <p className="opacity-70 truncate">{msg.replyTo.text}</p>
                                        </div>
                                      )}
                                      {msg.gif ? (
                                        msg.gif.url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={msg.gif.url} alt={msg.gif.label} className="rounded-2xl max-h-52 w-auto" />
                                        ) : (
                                          <div className="text-center px-5 py-2">
                                            <div className="text-6xl animate-bounce">{msg.gif.emoji}</div>
                                            <div className="text-[10px] uppercase tracking-wider text-white/70 mt-1">{msg.gif.label}</div>
                                          </div>
                                        )
                                      ) : msg.game ? (
                                        <div className="space-y-2">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">🎮 {msg.game.title}</p>
                                          {msg.game.type === "two_truths" ? (
                                            <>
                                              <p className="text-xs text-white/80">
                                                {mine ? "Waiting for them to spot the lie…" : "Which one is the lie? 🤥"}
                                              </p>
                                              {(msg.game.options || []).map((o, oi) => {
                                                const guessed = msg.game!.guess !== undefined;
                                                const isLie = oi === msg.game!.lieIndex;
                                                return (
                                                  <button
                                                    key={oi}
                                                    type="button"
                                                    disabled={mine || guessed}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleGuessLie(msg, oi);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs border transition ${
                                                      guessed && isLie
                                                        ? "bg-rose-500/30 border-rose-400"
                                                        : guessed && msg.game!.guess === oi
                                                        ? "bg-emerald-500/20 border-emerald-400"
                                                        : "bg-black/25 border-white/15"
                                                    } ${!mine && !guessed ? "hover:bg-black/40 cursor-pointer" : ""}`}
                                                  >
                                                    {oi + 1}. {o}
                                                    {(guessed || mine) && isLie ? "  🤥 lie" : ""}
                                                  </button>
                                                );
                                              })}
                                              {msg.game.guess !== undefined && (
                                                <p className="text-xs font-semibold">
                                                  {msg.game.guess === msg.game.lieIndex
                                                    ? "🎯 Spot on! They found the lie."
                                                    : "😎 Fooled them! That wasn't the lie."}
                                                </p>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              <p className="font-semibold leading-snug">{msg.game.prompt}</p>
                                              {!mine && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReplyTo(msg);
                                                  }}
                                                  className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold cursor-pointer transition"
                                                >
                                                  ↩ Answer
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</span>
                                      )}

                                      {/* time + vanish timer + ticks, inside the bubble */}
                                      <span className="flex items-center justify-end gap-1 mt-0.5 text-[10px] opacity-70 select-none">
                                        {msg.vanish && msg.vanish !== "off" && (
                                          <span title="Disappearing message">
                                            👻{msg.expiresAt ? ` ${fmtLeft(msg.expiresAt - nowTick)}` : ""}
                                          </span>
                                        )}
                                        {msg.timestamp}
                                        {mine && (
                                          <span className={seen ? "text-sky-200 font-bold" : ""}>{seen ? "✓✓" : "✓"}</span>
                                        )}
                                      </span>
                                    </div>

                                    {/* hover quick actions (desktop) */}
                                    <div className="hidden lg:flex gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                      <button
                                        type="button"
                                        onClick={() => setActionMsgId(actionMsgId === msg.id ? null : msg.id)}
                                        title="React"
                                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-sm cursor-pointer transition"
                                      >
                                        😊
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReplyTo(msg)}
                                        title="Reply"
                                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-xs cursor-pointer transition"
                                      >
                                        ↩
                                      </button>
                                    </div>
                                  </div>

                                  {Object.keys(reactionCounts).length > 0 && (
                                    <div className={`flex gap-1 -mt-2 relative z-[1] px-2 ${mine ? "self-end" : "self-start"}`}>
                                      {Object.entries(reactionCounts).map(([e, n]) => (
                                        <span
                                          key={e}
                                          className="px-1.5 h-5 rounded-full bg-[#1d1226] border border-white/20 text-xs flex items-center gap-0.5 shadow"
                                        >
                                          {e}
                                          {n > 1 && <span className="text-[10px] text-white/70">{n}</span>}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {actionMsgId === msg.id && (
                                    <div
                                      className="mt-1.5 flex items-center gap-0.5 px-2 py-1 rounded-full bg-[#1a1022] border border-white/15 shadow-2xl shadow-black/50"
                                      style={{ animation: "panelIn .2s cubic-bezier(.2,.8,.2,1)" }}
                                    >
                                      {QUICK_REACTIONS.map((e) => (
                                        <button
                                          key={e}
                                          type="button"
                                          onClick={() => handleToggleReaction(msg, e)}
                                          className="w-9 h-9 text-xl rounded-full hover:bg-white/15 hover:scale-125 cursor-pointer transition-transform"
                                        >
                                          {e}
                                        </button>
                                      ))}
                                      <span className="w-px h-5 bg-white/15 mx-1" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReplyTo(msg);
                                          setActionMsgId(null);
                                        }}
                                        className="px-3 h-9 text-xs font-bold rounded-full hover:bg-white/15 cursor-pointer transition"
                                      >
                                        ↩ Reply
                                      </button>
                                    </div>
                                  )}
                                  {mine && lastOwn?.id === msg.id && seen && (
                                    <span className="text-[10px] text-sky-300/80 px-1 mt-0.5">Seen</span>
                                  )}
                                </div>
                              );
                            })}

                            {realCount === 0 && (
                              <div className="mt-6 mx-auto max-w-sm text-center space-y-3 p-5 rounded-3xl bg-white/5 border border-white/10" style={{ animation: "msgIn .4s ease-out" }}>
                                <div className="text-5xl">{activeMatch.avatar}</div>
                                <p className="font-extrabold">You matched with {activeMatch.alias} 🎉</p>
                                <p className="text-xs text-white/55">Break the ice with one tap:</p>
                                <div className="space-y-2">
                                  {starters.map((q) => (
                                    <button
                                      key={q}
                                      type="button"
                                      onClick={() => handleSendGame({ type: "icebreaker", title: "Icebreaker", prompt: q })}
                                      className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600/30 to-pink-600/30 border border-white/15 hover:border-pink-400/60 text-xs font-medium cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                    >
                                      🧊 {q}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowGames(true)}
                                  className="text-xs font-bold text-pink-300 hover:text-pink-200 cursor-pointer"
                                >
                                  🎮 Or play a game together
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* ---- reply preview ---- */}
                    {replyTo && (
                      <div className="relative z-10 px-4 py-2.5 border-t border-white/10 bg-black/40 flex items-center gap-3 text-xs" style={{ animation: "panelIn .2s ease-out" }}>
                        <div className="min-w-0 flex-1 border-l-[3px] border-pink-500 pl-3">
                          <p className="font-bold text-pink-300 truncate">Replying to {replyTo.senderAlias}</p>
                          <p className="text-white/60 truncate">{replyTo.gif ? "🎞 GIF" : replyTo.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 cursor-pointer transition"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {showEmoji && (() => {
                      const cats = [
                        ...(recentEmojis.length > 0 ? [{ id: "recent", label: "🕘", emojis: recentEmojis }] : []),
                        ...EMOJI_CATEGORIES,
                      ];
                      const active = cats.find((c) => c.id === emojiCategory) || cats[0];
                      return (
                        <div
                          className="border-t border-white/10 bg-black/70 backdrop-blur-xl flex flex-col h-[300px] lg:h-[340px]"
                          style={{ animation: "panelIn .25s cubic-bezier(.2,.8,.2,1)" }}
                        >
                          <div className="flex items-center gap-1 p-2 border-b border-white/10 shrink-0">
                            <div className="flex-1 flex gap-1 overflow-x-auto [scrollbar-width:none]">
                              {cats.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setEmojiCategory(c.id)}
                                  className={`shrink-0 w-10 h-10 rounded-xl text-xl cursor-pointer transition ${
                                    active.id === c.id ? "bg-pink-500/40 ring-1 ring-pink-400" : "hover:bg-white/10"
                                  }`}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowEmoji(false)}
                              className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-sm cursor-pointer transition"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2">
                            <p className="text-[10px] uppercase tracking-wider text-white/40 px-1 pb-1">
                              {active.id === "recent" ? "Recently used" : active.id} · {active.emojis.length}
                            </p>
                            <div className="grid grid-cols-8 sm:grid-cols-10 gap-0.5">
                              {active.emojis.map((e) => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => insertEmoji(e)}
                                  className="h-10 rounded-lg text-2xl hover:bg-white/10 active:scale-90 cursor-pointer transition"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {showGames && (
                      <div
                        className="border-t border-white/10 bg-black/60 p-3 lg:p-4 max-h-[320px] overflow-y-auto space-y-3"
                        style={{ animation: "panelIn .25s cubic-bezier(.2,.8,.2,1)" }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wider text-pink-400">🎮 Play together</p>
                          <button
                            type="button"
                            onClick={() => setShowGames(false)}
                            className="text-white/50 hover:text-white text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {GAME_TABS.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => openGamePanel(t.id)}
                              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition border ${
                                gameTab === t.id
                                  ? "bg-pink-500 border-pink-400 text-white"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {gameTab === "two_truths" ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-white/60">
                              Write 2 truths and 1 lie about yourself, then pick the lie. They have to guess it!
                            </p>
                            {twoTruths.map((t, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="lie"
                                  checked={lieIndex === i}
                                  onChange={() => setLieIndex(i)}
                                  title="This one is the lie"
                                  className="accent-pink-500 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={t}
                                  maxLength={120}
                                  onChange={(e) =>
                                    setTwoTruths((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                                  }
                                  placeholder={lieIndex === i ? "This one is your lie 🤥" : "A true fact about you"}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs placeholder:text-white/30 focus:outline-none focus:border-pink-500"
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              disabled={twoTruths.some((t) => !t.trim())}
                              onClick={() => {
                                handleSendGame({
                                  type: "two_truths",
                                  title: "2 Truths & 1 Lie",
                                  prompt: "Spot the lie!",
                                  options: twoTruths.map((t) => t.trim()),
                                  lieIndex,
                                });
                                setTwoTruths(["", "", ""]);
                                setLieIndex(0);
                              }}
                              className="w-full h-10 rounded-full bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold cursor-pointer transition"
                            >
                              Send game 🤥
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {gameTab === "truth_dare" && (
                              <div className="flex gap-2">
                                {(["truth", "dare"] as const).map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    onClick={() => {
                                      setTruthOrDare(k);
                                      setGamePrompt("");
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition border ${
                                      truthOrDare === k
                                        ? "bg-violet-500 border-violet-300 text-white"
                                        : "bg-white/5 border-white/10 text-white/70"
                                    }`}
                                  >
                                    {k === "truth" ? "😇 Truth" : "😈 Dare"}
                                  </button>
                                ))}
                              </div>
                            )}
                            {gameTab === "flirty" && (
                              <div className="flex gap-2">
                                {(Object.keys(FLIRTY) as ("cute" | "flirty" | "bold")[]).map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    onClick={() => {
                                      setFlirtyLevel(k);
                                      setGamePrompt("");
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition border ${
                                      flirtyLevel === k
                                        ? "bg-pink-500 border-pink-300 text-white"
                                        : "bg-white/5 border-white/10 text-white/70"
                                    }`}
                                  >
                                    {FLIRTY[k].label}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="rounded-2xl bg-gradient-to-br from-violet-600/40 to-pink-600/40 border border-white/15 p-4 text-sm min-h-[72px] flex items-center">
                              {gamePrompt || "Tap 🎲 Shuffle to draw a card"}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setGamePrompt(drawPrompt())}
                                className="flex-1 h-10 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold cursor-pointer transition"
                              >
                                🎲 Shuffle
                              </button>
                              <button
                                type="button"
                                disabled={!gamePrompt}
                                onClick={() =>
                                  handleSendGame({
                                    type: gameTab,
                                    title:
                                      gameTab === "truth_dare"
                                        ? truthOrDare === "truth" ? "Truth" : "Dare"
                                        : gameTab === "flirty"
                                        ? `Flirty Question (${FLIRTY[flirtyLevel].label.split(" ")[1]})`
                                        : GAME_TABS.find((t) => t.id === gameTab)!.label.replace(/^\S+\s/, ""),
                                    prompt: gamePrompt,
                                  })
                                }
                                className="flex-1 h-10 rounded-full bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold cursor-pointer transition"
                              >
                                Send to chat
                              </button>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-white/40">
                          💛 Anyone can skip a question. Keep it fun, respectful and consensual.
                        </p>
                      </div>
                    )}

                    {/* ---- composer ---- */}
                    <div className="relative z-10 p-3 lg:p-4 bg-black/40 backdrop-blur-xl border-t border-white/10">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-2 lg:gap-3">
                        <div className="flex-1 flex items-center gap-1 bg-white/10 border border-white/10 focus-within:border-pink-500/70 focus-within:bg-white/[0.13] rounded-full px-1.5 transition-all duration-200">
                          <button
                            type="button"
                            onClick={() => {
                              setShowGames((v) => !v);
                              setShowEmoji(false);
                            }}
                            title="Games & icebreakers"
                            className={`w-10 h-10 shrink-0 rounded-full text-lg cursor-pointer transition ${
                              showGames ? "bg-pink-500/30" : "hover:bg-white/10"
                            }`}
                          >
                            🎮
                          </button>
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={vanishMode === "off" ? "Message anonymously…" : "👻 Disappearing message…"}
                            className="flex-1 min-w-0 bg-transparent px-2 py-3 text-sm lg:text-base placeholder:text-white/35 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowEmoji((v) => !v);
                              setShowGames(false);
                            }}
                            title="Emojis"
                            className={`w-10 h-10 shrink-0 rounded-full text-xl cursor-pointer transition ${
                              showEmoji ? "bg-pink-500/30" : "hover:bg-white/10"
                            }`}
                          >
                            😊
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={!messageInput.trim()}
                          title="Send"
                          className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-90 enabled:hover:scale-110 enabled:active:scale-95 ${
                            vanishMode === "off"
                              ? "bg-gradient-to-tr from-pink-500 to-rose-600 shadow-pink-600/50"
                              : "bg-gradient-to-tr from-violet-500 to-fuchsia-600 shadow-fuchsia-600/50"
                          }`}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                            <path d="M2.5 20.5 22 12 2.5 3.5l.01 6.6L15 12 2.5 13.9z" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-white/40">
                    <div className="text-5xl">💬</div>
                    <p className="text-sm">Select a chat to start talking</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ---------------- CONFESSIONS (NGL-style) ---------------- */}
        {activeTab === "confess" && myProfile && (
          <section className="space-y-5 lg:h-full lg:overflow-y-auto lg:pr-1">
            <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-6 space-y-5 lg:space-y-0">
              {/* Composer */}
              <div className="lg:sticky lg:top-0 lg:self-start space-y-3">
                <div
                  className={`relative overflow-hidden rounded-[2rem] p-5 lg:p-7 bg-gradient-to-br ${CONFESSION_THEMES[confessionTheme]} shadow-2xl shadow-pink-900/40 transition-all duration-500`}
                >
                  <div className="pointer-events-none absolute -right-8 -bottom-10 text-[9rem] opacity-15 select-none rotate-12">💌</div>
                  <p className="relative text-[11px] font-bold uppercase tracking-widest text-white/85 truncate">
                    🏫 {myCollege || "Your college"}
                  </p>
                  <h2 className="relative text-2xl lg:text-3xl font-black mt-1 leading-tight">
                    Send an anonymous confession to your whole college
                  </h2>
                  <p className="relative text-xs lg:text-sm text-white/90 mt-1.5">
                    Nobody sees your name. Every student from your college gets it on their wall. 🤫
                  </p>

                  <div className="relative mt-4 rounded-3xl bg-black/30 glass-card backdrop-blur-md border border-white/25 p-3">
                    <textarea
                      value={confessionText}
                      onChange={(e) => setConfessionText(e.target.value.slice(0, CONFESSION_MAX))}
                      rows={4}
                      placeholder="Type your confession, crush, shoutout or secret…"
                      className="w-full resize-none bg-transparent text-sm lg:text-base text-white placeholder:text-white/50 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        {CONFESSION_THEMES.map((t, i) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setConfessionTheme(i)}
                            aria-label={`Theme ${i + 1}`}
                            className={`w-5 h-5 rounded-full bg-gradient-to-br ${t} cursor-pointer transition ${
                              confessionTheme === i ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-white/70">
                        {confessionText.length}/{CONFESSION_MAX}
                      </span>
                    </div>
                  </div>

                  <div className="relative flex flex-wrap gap-1.5 mt-3">
                    {CONFESSION_PROMPTS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setConfessionText(chip)}
                        className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-semibold cursor-pointer transition"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitConfession}
                    className="relative w-full mt-4 h-12 rounded-full bg-white text-pink-600 font-extrabold text-sm lg:text-base shadow-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition"
                  >
                    Send anonymously 🚀
                  </button>
                </div>

                {confessionNote && (
                  <div
                    className={`p-3 rounded-2xl text-xs text-center border backdrop-blur-md ${
                      confessionNote.ok
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {confessionNote.text}
                  </div>
                )}
                <p className="text-[11px] text-white/40 px-2">
                  💛 Be kind. No names, phone numbers or links. Abusive posts can be reported and are reviewed by moderators.
                </p>
              </div>

              {/* Wall */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg lg:text-xl font-extrabold">
                    🔥 Campus <span className="text-pink-500">Wall</span>
                  </h3>
                  <span className="text-[11px] text-white/50">{confessions.length} confession{confessions.length === 1 ? "" : "s"}</span>
                </div>
                {confessions.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-white/15 bg-black/40 p-10 text-center space-y-2">
                    <div className="text-5xl">🤫</div>
                    <p className="text-sm font-semibold">Nothing here yet</p>
                    <p className="text-xs text-white/50">Be the first to drop a confession — your whole college will see it.</p>
                  </div>
                ) : (
                  confessions.map((c) => {
                    const counts = CONFESSION_REACTIONS.map((e) => ({
                      e,
                      n: Object.values(c.reactions).filter((x) => x === e).length,
                    }));
                    return (
                      <div
                        key={c.id}
                        className={`relative overflow-hidden rounded-[2rem] p-5 bg-gradient-to-br ${CONFESSION_THEMES[c.theme % CONFESSION_THEMES.length]} shadow-xl shadow-black/30`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/80">
                          <span>🤫 Anonymous</span>
                          <span>{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-base lg:text-lg font-bold leading-snug whitespace-pre-wrap break-words">
                          {c.text}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {counts.map(({ e, n }) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => handleReactConfession(c.id, e)}
                                className={`px-2.5 h-8 rounded-full text-xs font-bold cursor-pointer transition ${
                                  c.reactions[myProfile.id] === e
                                    ? "bg-white text-pink-600 scale-105"
                                    : "bg-black/25 hover:bg-black/40 text-white"
                                }`}
                              >
                                {e} {n > 0 ? n : ""}
                              </button>
                            ))}
                          </div>
                          {c.authorId !== myProfile.id && (
                            <button
                              type="button"
                              onClick={() => handleReportConfession(c.id)}
                              className="text-[11px] text-white/70 hover:text-white cursor-pointer"
                              title="Report this confession"
                            >
                              🚩 Report
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- PROFILE (two columns on laptop) ---------------- */}
        {activeTab === "profile" && myProfile && (
          <section className="bg-black/55 backdrop-blur-xl glass-card border border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-2xl shadow-pink-900/20 max-h-[78vh] lg:max-h-none overflow-y-auto">
            <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
              <div className="space-y-5">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-pink-500/30 to-violet-700/30 border border-white/10 flex items-center justify-center text-4xl lg:text-6xl shrink-0">
                    {myProfile.avatar}
                  </div>
                  <div className="text-left">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Admin Approved Student
                    </span>
                    <h2 className="text-xl lg:text-3xl font-extrabold mt-1">@{myProfile.alias}</h2>
                    <p className="text-xs text-white/50">
                      Ticket ID: <span className="font-mono text-pink-400">{account.id}</span>
                    </p>
                  </div>
                </div>

                {(account.idCardFrontImage ||
                  account.idCardBackImage ||
                  myProfile.idCardFrontImage ||
                  myProfile.idCardBackImage) && (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-2">
                    <h3 className="text-pink-400 font-bold uppercase tracking-wider text-[11px]">
                      🪪 Verified College ID Cards
                    </h3>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {(account.idCardFrontImage || myProfile.idCardFrontImage) && (
                        <div>
                          <p className="text-[10px] text-white/50 mb-1">Front Side:</p>
                          <img
                            src={account.idCardFrontImage || myProfile.idCardFrontImage}
                            alt="College ID Front"
                            className="w-full h-24 lg:h-32 object-cover rounded-2xl border border-white/10"
                          />
                        </div>
                      )}
                      {(account.idCardBackImage || myProfile.idCardBackImage) && (
                        <div>
                          <p className="text-[10px] text-white/50 mb-1">Back Side:</p>
                          <img
                            src={account.idCardBackImage || myProfile.idCardBackImage}
                            alt="College ID Back"
                            className="w-full h-24 lg:h-32 object-cover rounded-2xl border border-white/10"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {blocks.some((b) => b.blockerId === myProfile.id) && (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-2">
                    <h3 className="text-pink-400 font-bold uppercase tracking-wider text-[11px]">⛔ Blocked Users</h3>
                    {blocks
                      .filter((b) => b.blockerId === myProfile.id)
                      .map((b) => (
                        <div key={b.blockedId} className="flex items-center justify-between text-xs">
                          <span className="text-white/80">{b.blockedAlias}</span>
                          <button
                            onClick={() => handleUnblock(b.blockedId)}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-3 lg:h-14 rounded-full border border-white/15 hover:bg-white/10 text-xs lg:text-sm font-semibold text-white/80 cursor-pointer transition"
                >
                  Log Out
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-4 lg:p-6 space-y-2.5 text-xs lg:text-sm self-start">
                <h3 className="text-pink-400 font-bold uppercase tracking-wider text-[11px] mb-2">
                  📋 Complete Student Details
                </h3>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/50">Full Name:</span>
                  <span className="font-semibold text-white">
                    {account.fullName || myProfile.fullName || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/50">Gender:</span>
                  <span className="font-semibold text-white">
                    {account.gender || myProfile.gender || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/50">Email Address:</span>
                  <span className="font-semibold text-white">
                    {account.email || myProfile.email}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/50">Mobile Number:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {account.phone || myProfile.phone}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10">
                  <span className="text-white/50">Base Location:</span>
                  <span className="font-semibold text-pink-400">
                    📍 {account.baseLocation || myProfile.baseLocation || "Bangalore"}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10 gap-4">
                  <span className="text-white/50 shrink-0">College Name:</span>
                  <span className="font-semibold text-white text-right">
                    {account.collegeName || myProfile.collegeName || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/10 gap-4">
                  <span className="text-white/50 shrink-0">Degree &amp; Branch:</span>
                  <span className="font-semibold text-white text-right">
                    {account.branch || myProfile.yearDept}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-white/50">Study Year:</span>
                  <span className="font-semibold text-white">{account.year}</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ===================== PHONE BOTTOM NAV PILL ===================== */}
      {navVisible && (
        <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2.5 py-2 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl shadow-pink-900/40">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition ${
                activeTab === item.id
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-600/60"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {item.icon}
              {navBadge(item.id) > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                    item.id === "sparks" ? "bg-rose-500 animate-pulse" : item.id === "confess" ? "bg-fuchsia-500 animate-pulse" : "bg-sky-500"
                  }`}
                >
                  {navBadge(item.id)}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Block confirmation */}
      {blockTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl shadow-pink-900/30">
            <div className="text-4xl">⛔</div>
            <h3 className="font-bold text-lg">Block {blockTarget.alias}?</h3>
            <p className="text-xs text-white/60">
              The chat closes for both of you and you will never see each other in Discover or Sparks again.
              You can unblock later from your Profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBlockTarget(null)}
                className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBlock(blockTarget)}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-sm font-bold cursor-pointer shadow-lg shadow-rose-600/40"
              >
                Yes, Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unspark confirmation */}
      {unmatchTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl shadow-pink-900/30">
            <div className="text-4xl">💔</div>
            <h3 className="font-bold text-lg">Unspark {unmatchTarget.alias}?</h3>
            <p className="text-xs text-white/60">
              You already accepted this Spark. If you unspark now, the chat closes for both of you,
              they are notified, and neither of you can send a new Spark to the other.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnmatchTarget(null)}
                className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnmatch(unmatchTarget)}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-sm font-bold cursor-pointer shadow-lg shadow-rose-600/40"
              >
                Yes, Unspark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl shadow-pink-900/30">
            <div className="text-4xl">👋</div>
            <h3 className="font-bold text-lg">Log out of CampusSpark?</h3>
            <p className="text-xs text-white/60">
              Are you sure you want to log out? You will have to log in again. Your chats will be here when you log back in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold cursor-pointer transition"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogoutReset();
                }}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-sm font-bold cursor-pointer shadow-lg shadow-pink-600/40"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
              🚩 Report &amp; Block User
            </h3>
            <p className="text-xs text-slate-400">
              Reporting will send this user and your full chat log directly to the Admin for review.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the violation..."
              className="w-full h-20 bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2 bg-slate-800 text-xs rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReport}
                className="flex-1 py-2 bg-rose-600 text-xs text-white rounded-xl font-bold cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}