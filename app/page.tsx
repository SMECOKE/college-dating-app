'use client';

import React, { useState } from 'react';

export default function StudentPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // We will connect this to your backend/API route next!
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 flex flex-col items-center justify-center text-white px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">HeartLink 💖</h1>
          <p className="text-pink-200 text-sm">The exclusive, verified dating app for college students.</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-pink-200 mb-1">
                College Email (.edu / .ac.in)
              </label>
              <input
                type="email"
                required
                placeholder="yourname@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-white/50 text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 font-bold transition shadow-lg text-white"
            >
              Verify Student Email
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">Verification Pending</h2>
            <p className="text-sm text-pink-200">
              We've logged your request! Your friend can now review it in the admin dashboard at <span className="underline font-mono">/admin</span>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}