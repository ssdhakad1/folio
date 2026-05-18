'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Sparkles, Library, TrendingUp, BarChart2,
  Search, Star, Users, Target, MessageSquare, ArrowRight,
  Quote, CheckCircle, BookMarked, Flame,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [previewBooks, setPreviewBooks] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || user) return;
    async function fetchPreview() {
      try {
        const res = await fetch(`${API_URL}/api/trending`);
        const data = await res.json();
        setPreviewBooks((data.books || []).slice(0, 12));
      } catch { /* non-critical */ } finally {
        setPreviewLoading(false);
      }
    }
    fetchPreview();
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1117' }}>
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1117' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b h-16 flex items-center justify-between px-6 flex-shrink-0"
        style={{ backgroundColor: 'rgba(15,17,23,0.95)', backdropFilter: 'blur(16px)', borderColor: '#2a2d3e' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6366f1' }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base" style={{ color: '#f0f0f5' }}>Folio</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-[#1a1d27]"
            style={{ color: '#8b8fa8' }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#6366f1', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden text-center px-6 pt-20 pb-24">
          {/* Background radial glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="relative max-w-3xl mx-auto">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-8"
              style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Your complete reading companion
            </div>

            {/* Headline */}
            <h1
              className="font-bold tracking-tight leading-tight mb-6"
              style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', color: '#f0f0f5' }}
            >
              Track, Discover &amp;<br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Love Every Book
              </span>
            </h1>

            {/* Subtext */}
            <p
              className="text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto"
              style={{ color: '#8b8fa8' }}
            >
              Folio is your personal reading hub — track your library, get smart recommendations,
              hit your reading goals, and connect with a community of book lovers. Free, forever.
            </p>

            {/* CTAs */}
            <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#6366f1', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
              >
                Start Reading Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-8 py-3.5 rounded-xl font-semibold text-sm border transition-all hover:bg-[#1a1d27]"
                style={{ color: '#8b8fa8', borderColor: '#2a2d3e' }}
              >
                Sign In
              </Link>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: Library,     label: 'Library Tracking',        color: '#4ade80' },
                { icon: Sparkles,    label: '4 Recommendation Modes',  color: '#818cf8' },
                { icon: BarChart2,   label: 'Reading Stats & Charts',  color: '#60a5fa' },
                { icon: Target,      label: 'Goals & Streaks',         color: '#f59e0b' },
                { icon: TrendingUp,  label: 'Top 50 Trending',         color: '#fbbf24' },
                { icon: Users,       label: 'Community Reviews',       color: '#34d399' },
              ].map(({ icon: Icon, label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e', color: '#8b8fa8' }}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature Grid ─────────────────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <div className="max-w-5xl mx-auto">

            <div className="text-center mb-12">
              <h2
                className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
                style={{ color: '#f0f0f5' }}
              >
                Everything a book lover needs
              </h2>
              <p className="text-sm md:text-base" style={{ color: '#8b8fa8' }}>
                Nine powerful features, one beautiful app — completely free.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* 1 · Library */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-green-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(74,222,128,0.1)' }}>
                  <Library className="w-5 h-5" style={{ color: '#4ade80' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Personal Library</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Organise every book into four shelves — Wishlist, Reading, Finished, and Did Not Finish. Track pages, add private notes, and see your full reading history.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[['Wishlist', '#fbbf24'], ['Reading', '#818cf8'], ['Finished', '#4ade80'], ['DNF', '#6b7280']].map(([s, c]) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}35` }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2 · Recommendations */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-indigo-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                  <Sparkles className="w-5 h-5" style={{ color: '#818cf8' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Smart Recommendations</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Four recommendation modes that learn your taste: discover books by favourite author, genre, current mood, or based on your full reading history.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['By Author', 'By Genre', 'By Mood', 'My History'].map((m) => (
                    <div
                      key={m}
                      className="rounded-lg px-3 py-1.5 text-xs text-center font-medium"
                      style={{ backgroundColor: '#0f1117', color: '#8b8fa8', border: '1px solid #2a2d3e' }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 · Stats */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-blue-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(96,165,250,0.1)' }}>
                  <BarChart2 className="w-5 h-5" style={{ color: '#60a5fa' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Reading Stats &amp; Charts</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Monthly reading bar charts, top genres, favourite authors, and star-rating distribution — a full picture of your reading life.
                </p>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1" style={{ height: '36px' }}>
                  {[35, 60, 45, 80, 55, 95, 40, 70, 50, 85, 60, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{ height: `${h}%`, backgroundColor: i === 5 ? '#818cf8' : '#2a2d3e' }}
                    />
                  ))}
                </div>
              </div>

              {/* 4 · Goals & Streaks */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-amber-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                  <Target className="w-5 h-5" style={{ color: '#f59e0b' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Reading Goals &amp; Streaks</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Set an annual reading goal, track your streak month by month, and celebrate every milestone along the way.
                </p>
                {/* Mini goal progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#8b8fa8' }}>
                    <span>Annual Goal</span>
                    <span style={{ color: '#f0f0f5' }}>14 <span style={{ color: '#4a4d62' }}>/ 24 books</span></span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: '58%', background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }}
                    />
                  </div>
                </div>
              </div>

              {/* 5 · Trending */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-amber-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(251,191,36,0.1)' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: '#fbbf24' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Top 50 Trending</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  A curated, daily-refreshed list of 50 books readers are buzzing about. Discover your next obsession every single day.
                </p>
                {/* Mini rank list */}
                <div className="space-y-2">
                  {[['#FFD700', '#0f1117', '1', 'The Midnight Library'],
                    ['#94a3b8', '#0f1117', '2', 'Tomorrow & Tomorrow'],
                    ['#b45309', '#ffffff', '3', 'Piranesi']].map(([bg, fg, rank, title]) => (
                    <div key={rank} className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                        style={{ backgroundColor: bg, color: fg, fontSize: '10px' }}
                      >
                        {rank}
                      </span>
                      <span className="text-xs truncate" style={{ color: '#8b8fa8' }}>{title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 · Search */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-purple-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(167,139,250,0.1)' }}>
                  <Search className="w-5 h-5" style={{ color: '#a78bfa' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Powerful Book Search</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Search millions of books by title, author, or ISBN via Open Library. One click adds anything you find straight to your library.
                </p>
                {/* Mini search bar mockup */}
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e' }}
                >
                  <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4a4d62' }} />
                  <span className="text-xs" style={{ color: '#4a4d62' }}>Search millions of books…</span>
                </div>
              </div>

              {/* 7 · Reviews & Notes */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-yellow-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(251,191,36,0.1)' }}>
                  <MessageSquare className="w-5 h-5" style={{ color: '#fbbf24' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Reviews &amp; Notes</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Write star-rated reviews for every book you finish. Keep private reading notes and page progress. Your personal reading diary.
                </p>
                {/* Stars + quote */}
                <div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4" style={{ color: '#fbbf24' }} fill="#fbbf24" />
                    ))}
                  </div>
                  <p className="text-xs italic leading-relaxed" style={{ color: '#6b7280' }}>
                    &ldquo;Completely changed how I see the world…&rdquo;
                  </p>
                </div>
              </div>

              {/* 8 · Community */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-emerald-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}>
                  <Users className="w-5 h-5" style={{ color: '#34d399' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Community &amp; Leaderboards</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Browse the community review feed, explore public reader profiles, and see who&apos;s reading what on the active readers leaderboard.
                </p>
                {/* Avatar row */}
                <div className="flex items-center gap-1">
                  {['A', 'J', 'M', 'R', 'S', 'K'].map((letter, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(99,102,241,0.2)',
                        border: '2px solid #1a1d27',
                        color: '#818cf8',
                        marginLeft: i === 0 ? 0 : '-6px',
                        zIndex: 6 - i,
                        position: 'relative',
                      }}
                    >
                      {letter}
                    </div>
                  ))}
                  <span className="text-xs ml-2" style={{ color: '#8b8fa8' }}>Active readers</span>
                </div>
              </div>

              {/* 9 · Daily Content */}
              <div
                className="rounded-2xl border p-6 transition-all hover:border-pink-500/40"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(244,114,182,0.1)' }}>
                  <Quote className="w-5 h-5" style={{ color: '#f472b6' }} />
                </div>
                <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }}>Daily Reading Content</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b8fa8' }}>
                  Fresh every session — a literary quote, word of the day with definition, a &ldquo;Did You Know&rdquo; fact, and a book trivia challenge.
                </p>
                {/* Quote snippet */}
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: '#0f1117', borderLeft: '3px solid rgba(99,102,241,0.5)' }}
                >
                  <p className="text-xs italic leading-relaxed" style={{ color: '#8b8fa8' }}>
                    &ldquo;Not all those who wander are lost.&rdquo;
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#4a4d62' }}>— J.R.R. Tolkien</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Bonus features strip ─────────────────────────────────────────── */}
        <section
          className="px-6 py-10 border-y"
          style={{ backgroundColor: '#13151f', borderColor: '#2a2d3e' }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: BookMarked, color: '#818cf8', bg: 'rgba(99,102,241,0.1)', label: 'Goodreads Import', sub: 'Migrate your shelves instantly' },
                { icon: Flame,      color: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: 'Reading Streaks',  sub: 'Track consecutive months' },
                { icon: CheckCircle, color: '#4ade80', bg: 'rgba(74,222,128,0.1)', label: 'Library CSV Export', sub: '15-column full export' },
                { icon: BookOpen,   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  label: 'Public Profiles',  sub: 'Share your reading journey' },
              ].map(({ icon: Icon, color, bg, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{label}</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trending preview ─────────────────────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}
                >
                  <TrendingUp className="w-3 h-3" />
                  Trending Now
                </div>
                <h2 className="text-lg font-bold tracking-tight" style={{ color: '#f0f0f5' }}>
                  What readers are loving right now
                </h2>
              </div>
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-indigo-300"
                style={{ color: '#818cf8' }}
              >
                See all 50 →
              </Link>
            </div>

            <div
              className="flex gap-3 overflow-x-auto pb-3"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {previewLoading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-24 rounded-xl border overflow-hidden animate-pulse"
                      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
                    >
                      <div className="aspect-[2/3]" style={{ backgroundColor: '#2a2d3e' }} />
                      <div className="p-1.5 space-y-1.5">
                        <div className="h-2.5 rounded" style={{ backgroundColor: '#2a2d3e', width: '80%' }} />
                        <div className="h-2 rounded" style={{ backgroundColor: '#2a2d3e', width: '55%' }} />
                      </div>
                    </div>
                  ))
                : previewBooks.map((book, idx) => (
                    <div
                      key={`${book.googleBooksId || book.title}-${idx}`}
                      className="flex-shrink-0 w-24 rounded-xl border overflow-hidden transition-all hover:border-indigo-500/30 hover:scale-105"
                      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
                    >
                      <div className="relative aspect-[2/3]" style={{ backgroundColor: '#2a2d3e' }}>
                        {book.coverUrl ? (
                          <Image src={book.coverUrl} alt={book.title || 'Book'} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-6 h-6" style={{ color: '#4a4d62' }} />
                          </div>
                        )}
                        {book.rank && book.rank <= 3 && (
                          <div
                            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center font-bold"
                            style={{
                              backgroundColor: book.rank === 1 ? '#FFD700' : book.rank === 2 ? '#94a3b8' : '#b45309',
                              color: book.rank === 3 ? '#fff' : '#0f1117',
                              fontSize: '10px',
                            }}
                          >
                            {book.rank}
                          </div>
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="text-xs font-medium line-clamp-2 leading-tight" style={{ color: '#f0f0f5' }}>{book.title}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{book.author}</p>
                      </div>
                    </div>
                  ))
              }
            </div>

            <p className="text-center text-xs mt-5" style={{ color: '#4a4d62' }}>
              <Link href="/register" className="transition-colors hover:text-indigo-300" style={{ color: '#818cf8' }}>
                Create a free account
              </Link>
              {' '}to track these, write reviews, and get personalised picks.
            </p>

          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section
          className="px-6 py-20 border-t"
          style={{ backgroundColor: '#13151f', borderColor: '#2a2d3e' }}
        >
          <div className="max-w-4xl mx-auto">

            <div className="text-center mb-14">
              <h2
                className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
                style={{ color: '#f0f0f5' }}
              >
                Up and running in minutes
              </h2>
              <p className="text-sm md:text-base" style={{ color: '#8b8fa8' }}>
                No complicated setup — just create an account and start reading smarter.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {[
                {
                  num: '01',
                  icon: BookOpen,
                  color: '#818cf8',
                  title: 'Create your free account',
                  desc: 'Sign up in seconds — no credit card, no commitment. Import from Goodreads or start fresh.',
                },
                {
                  num: '02',
                  icon: Library,
                  color: '#4ade80',
                  title: 'Build your library',
                  desc: 'Search millions of books and add them to Wishlist, Reading, or Finished with one tap.',
                },
                {
                  num: '03',
                  icon: Sparkles,
                  color: '#f472b6',
                  title: 'Discover &amp; grow',
                  desc: 'Get personalised recommendations, hit your reading goals, and connect with other readers.',
                },
              ].map(({ num, icon: Icon, color, title, desc }) => (
                <div key={num} className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center mx-auto mb-5"
                    style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}
                  >
                    <Icon className="w-6 h-6" style={{ color }} />
                    <span className="text-xs font-bold mt-0.5" style={{ color: '#4a4d62' }}>{num}</span>
                  </div>
                  <h3 className="font-bold text-base mb-2 tracking-tight" style={{ color: '#f0f0f5' }} dangerouslySetInnerHTML={{ __html: title }} />
                  <p className="text-sm leading-relaxed" style={{ color: '#8b8fa8' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-3xl border p-10 md:p-14 text-center relative overflow-hidden"
              style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
            >
              {/* Glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
              />

              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  <BookOpen className="w-8 h-8 text-white" />
                </div>

                <h2
                  className="text-2xl md:text-3xl font-bold tracking-tight mb-4"
                  style={{ color: '#f0f0f5' }}
                >
                  Start your reading journey today
                </h2>
                <p className="text-sm md:text-base leading-relaxed mb-8" style={{ color: '#8b8fa8' }}>
                  Join readers tracking their library, discovering new books, and hitting their reading goals — completely free, no card required.
                </p>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#6366f1', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
                  >
                    Create Free Account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-3.5 rounded-xl font-semibold text-sm border transition-all hover:bg-[#0f1117]"
                    style={{ color: '#8b8fa8', borderColor: '#2a2d3e' }}
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        className="py-6 text-center text-xs border-t flex-shrink-0"
        style={{ color: '#4a4d62', borderColor: '#2a2d3e' }}
      >
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6366f1' }}>
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold" style={{ color: '#6b7280' }}>Folio</span>
        </div>
        <p>Powered by Open Library &middot; Free forever</p>
      </footer>

    </div>
  );
}
