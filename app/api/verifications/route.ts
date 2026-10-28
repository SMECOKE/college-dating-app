import { NextResponse } from "next/server";

export interface VerificationRequest {
  id: string;
  email: string;
  phoneMasked: string;
  phoneHash: string;
  dob: string;
  branch: string;
  year: string;
  authType: "college_email" | "gmail_manual";
  idCardImage?: string; // Base64 or URL
  selfieImage?: string; // Base64 or URL
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
}

// In-memory store for local dev (replace with MongoDB/Supabase/Postgres in production)
let verificationQueue: VerificationRequest[] = [];

// GET: Admin fetches all pending ID + Selfie requests, or Student polls their status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (email) {
    const record = verificationQueue.find(
      (item) => item.email.toLowerCase() === email.toLowerCase()
    );
    return NextResponse.json({ record: record || null });
  }

  return NextResponse.json({ queue: verificationQueue });
}

// POST: Student submits login / ID + Selfie upload
export async function POST(request: Request) {
  const body = await request.json();

  const newRequest: VerificationRequest = {
    id: `VER-${Math.floor(100 + Math.random() * 900)}`,
    email: body.email,
    phoneMasked: body.phoneMasked,
    phoneHash: body.phoneHash,
    dob: body.dob,
    branch: body.branch,
    year: body.year,
    authType: body.authType,
    idCardImage: body.idCardImage || "",
    selfieImage: body.selfieImage || "",
    status: body.authType === "college_email" ? "verified" : "pending",
    submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  // Replace existing entry if same email retries
  verificationQueue = [
    ...verificationQueue.filter((item) => item.email !== newRequest.email),
    newRequest,
  ];

  return NextResponse.json({ success: true, record: newRequest });
}

// PATCH: Admin Approves or Rejects a Gmail student's ID + Selfie
export async function PATCH(request: Request) {
  const { id, status } = await request.json();

  verificationQueue = verificationQueue.map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          // Privacy Shield: Purge raw ID & Selfie photos once verified!
          idCardImage: status === "verified" ? "PURGED_FOR_PRIVACY" : item.idCardImage,
          selfieImage: status === "verified" ? "PURGED_FOR_PRIVACY" : item.selfieImage,
        }
      : item
  );

  return NextResponse.json({ success: true });
}