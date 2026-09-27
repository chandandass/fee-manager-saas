"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Bell,
  Users,
  IndianRupee,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-blue-500/20">
              ₹
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">
                FeeManager
              </span>
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full ml-1.5 border border-blue-500/20">
                SaaS
              </span>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5"
          >
            Get Started
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-md mx-auto px-4 pt-6 pb-12 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold animate-pulse-subtle">
            <Sparkles size={13} className="text-blue-400" />
            Designed for Tuition & Coaching Centres
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Stop the Hectic <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Fee Management Hassle.
            </span>
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed font-normal max-w-xs mx-auto">
            Automatically calculate monthly student fees, track pending payments, and send 1-click WhatsApp reminders & calls to parents.
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} fill="currentColor" />
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <ShieldCheck size={13} className="text-emerald-400" />
              Free trial · No credit card required · Setup in 30s
            </p>
          </div>
        </div>

        {/* Live Interactive Interactive Preview Mockup Card */}
        <div className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-4 shadow-2xl space-y-3 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">
                Live App Demonstration
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              Automated Calculation
            </span>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-700/60 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-white">Rahul Sharma</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Class 10 - Maths · <span className="text-rose-400 font-medium">5 days overdue</span>
                </p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Pending
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <div>
                <p className="text-base font-extrabold text-white">₹1,500</p>
                <p className="text-[10px] text-slate-400">Monthly Fee</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <PhoneCall size={14} />
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <svg viewBox="0 0 32 32" width="15" height="15" fill="currentColor">
                    <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.13 6.742 3.047 9.371L1.052 31.15l5.957-1.91A15.928 15.928 0 0 0 16.004 32C24.828 32 32 24.822 32 16S24.828 0 16.004 0zm9.394 22.617c-.39 1.098-1.934 2.01-3.17 2.275-.844.18-1.946.324-5.654-1.214-4.748-1.97-7.805-6.79-8.04-7.105-.228-.315-1.916-2.552-1.916-4.867 0-2.314 1.214-3.444 1.645-3.882.39-.39.867-.487 1.157-.487.14 0 .267.006.38.012.333.014.502.032.72.56.271.654.932 2.267 1.014 2.432.084.166.167.39.053.617-.105.235-.198.34-.365.53-.166.19-.324.334-.49.539-.151.178-.323.37-.133.703.19.327.847 1.396 1.818 2.261 1.25 1.112 2.295 1.457 2.66 1.608.27.11.592.086.79-.126.252-.275.562-.732.878-1.184.228-.322.516-.36.82-.247.308.105 1.95.92 2.285 1.085.334.166.557.247.638.384.08.136.08.784-.31 1.882z"/>
                  </svg>
                </div>
                <div className="px-3 h-8 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-600/30">
                  <CheckCircle2 size={13} />
                  Paid
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why FeeManager Feature Cards */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Why Coaching Owners Love Us
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Built specifically for tutors & coaching institutes in India
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <IndianRupee size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Automatic Fee Calculation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  No manual math! Monthly fees are automatically calculated for every student from their joining date.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  1-Click WhatsApp Reminders
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Send pre-filled professional WhatsApp fee reminders to parents with single-tap quick action.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Flexible Snooze & Direct Calling
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Call parents directly from the app or snooze reminders for students who need extra time to pay.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Batch & Student Management
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Organize students by subject batches, view total collected revenue, and track overdue balances instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/70 space-y-4">
          <h3 className="text-base font-bold text-white text-center">
            How It Works in 3 Easy Steps
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <p className="text-xs font-semibold text-slate-200">
                Create your coaching centre & add batches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <p className="text-xs font-semibold text-slate-200">
                Add students with their joining date & monthly fee
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <p className="text-xs font-semibold text-slate-200">
                Track pending fees & send 1-click WhatsApp reminders
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-3 pt-2">
          <h3 className="text-lg font-bold text-white">
            Ready to simplify your fee collection?
          </h3>
          <Link
            href="/login"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
          >
            Get Started Free
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-xs px-4">
        <p>© {new Date().getFullYear()} FeeManager SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
