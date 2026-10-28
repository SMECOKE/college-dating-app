import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ sent: false, error: "Missing email or OTP" }, { status: 400 });
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return NextResponse.json({
        sent: false,
        reason: "Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env.local",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"CampusSpark Verification" <${user}>`,
      to: email,
      subject: `${otp} is your CampusSpark verification code`,
      html: `
        <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
          <h2 style="color: #ec4899; margin-bottom: 8px;">🎭 CampusSpark Verification</h2>
          <p style="font-size: 14px; color: #cbd5e1;">Use the 6-digit code below to verify your student login:</p>
          <div style="margin: 20px 0; padding: 16px; background: #020617; border: 1px solid #334155; border-radius: 12px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #64748b;">Next step: Upload your College ID card for admin approval.</p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ sent: false, error: String(error) }, { status: 500 });
  }
}