'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles, BookOpen, CheckCircle, Bookmark, BookMarked,
  Target, ChevronRight, Library, TrendingUp, Search, Quote, Lightbulb, Flame,
} from 'lucide-react';
import { QUOTES, WORDS, DID_YOU_KNOW, TRIVIA } from './dailyContent';
import { recommendations as recApi, library as libraryApi } from '../../../lib/api';
import { getRecentlyViewed } from '../../../lib/recentlyViewed';
import HorizontalBookScroll from '../../../components/HorizontalBookScroll';
import GettingStartedChecklist from '../../../components/GettingStartedChecklist';
import OnboardingWizard from '../../../components/OnboardingWizard';
import { useAuth } from '../../../context/AuthContext';

// ── Constants ──────────────────────────────────────────────────────────────────

const MOOD_POOL = [
  { label: '✨ Uplifting',          query: 'uplifting feel-good hopeful inspiring' },
  { label: '🔥 Gripping Thriller',  query: 'gripping page-turner thriller suspense' },
  { label: '🏰 Epic Fantasy',       query: 'epic fantasy magic adventure dragons' },
  { label: '☕ Cozy & Relaxing',    query: 'cozy relaxing warm comfortable read' },
  { label: '🚀 Mind-Bending Sci-Fi',query: 'mind-bending science fiction space future' },
  { label: '💡 Mind-Expanding',     query: 'thought-provoking philosophical deep intellectual' },
  { label: '😂 Laugh-Out-Loud',     query: 'funny hilarious comedy laugh witty humour' },
  { label: '💔 Emotional & Moving', query: 'emotional heart-wrenching moving tearjerker' },
  { label: '🌍 Epic Adventure',     query: 'epic adventure journey travel exploration' },
  { label: '🔮 Dark & Mysterious',  query: 'dark mysterious gothic atmospheric eerie' },
  { label: '💘 Swoony Romance',     query: 'romantic love story swoon heartwarming' },
  { label: '🧠 True Crime',         query: 'true crime real crime detective investigation' },
  { label: '🌱 Coming of Age',      query: 'coming of age young adult self-discovery growth' },
  { label: '🗺️ Historical Epic',    query: 'historical fiction epic period drama past' },
  { label: '👻 Spine-Tingling',     query: 'horror spine-chilling scary ghost supernatural' },
  { label: '🎭 Literary Fiction',   query: 'literary fiction character-driven beautiful prose' },
  { label: '🌊 Survival Story',     query: 'survival wilderness man vs nature grit endurance' },
  { label: '🤖 Dystopian',          query: 'dystopian future society rebellion resistance' },
  { label: '🧬 Hard Science',       query: 'hard science space exploration physics real science' },
  { label: '🕵️ Classic Mystery',   query: 'classic mystery detective whodunit Agatha Christie style' },
  { label: '📖 Short & Sweet',      query: 'short stories novellas quick satisfying reads' },
  { label: '🦸 Superhero Vibes',    query: 'superheroes powers action urban fantasy modern heroes' },
  { label: '🌸 Feel-Good Fiction',  query: 'feel-good warm slice of life contemporary fiction' },
  { label: '💼 Ambition & Power',   query: 'ambition power corporate politics rivalry drama' },
  { label: '🎶 Music & Art',        query: 'music art creativity passion bohemian artists' },
  { label: '🌏 Cultural Journey',   query: 'multicultural world travel different cultures perspectives' },
  { label: '🧘 Mindful & Spiritual',query: 'mindfulness spirituality self-help inner peace wellness' },
  { label: '⚔️ War & Conflict',     query: 'war conflict soldiers battle sacrifice historical military' },
  { label: '🦊 Clever & Witty',     query: 'clever witty smart satirical sharp humour' },
  { label: '🌌 Space Opera',        query: 'space opera galaxy aliens epic sci-fi adventure' },
];

const MOOD_SESSION_KEY = 'folio_mood_chips';

function pickSessionMoods() {
  try {
    const cached = sessionStorage.getItem(MOOD_SESSION_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }
  // Fisher-Yates shuffle, pick 6
  const pool = [...MOOD_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, 6);
  try { sessionStorage.setItem(MOOD_SESSION_KEY, JSON.stringify(picked)); } catch { /* ignore */ }
  return picked;
}

const GOAL_KEY        = 'folio_reading_goal';
const QUOTE_KEY       = 'folio_quote';
const WORD_KEY        = 'folio_word';
const DYK_KEY         = 'folio_dyk';
const TRIVIA_KEY      = 'folio_trivia';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting(name) {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] || 'there';
  if (h < 12) return `Good morning, ${first}`;
  if (h < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function pickOne(pool, key) {
  try {
    const idx = sessionStorage.getItem(key);
    if (idx !== null) return pool[parseInt(idx, 10)] ?? pool[0];
  } catch {}
  const picked = Math.floor(Math.random() * pool.length);
  try { sessionStorage.setItem(key, String(picked)); } catch {}
  return pool[picked];
}

function loadGoal() {
  try { return JSON.parse(localStorage.getItem(GOAL_KEY) || 'null'); } catch { return null; }
}

function saveGoal(g) {
  try { localStorage.setItem(GOAL_KEY, JSON.stringify(g)); } catch {}
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border overflow-hidden animate-pulse flex-shrink-0 w-40" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="aspect-[2/3] w-full" style={{ backgroundColor: '#2a2d3e' }} />
      <div className="p-3 space-y-2">
        <div className="h-3 rounded" style={{ backgroundColor: '#2a2d3e', width: '80%' }} />
        <div className="h-2.5 rounded" style={{ backgroundColor: '#2a2d3e', width: '55%' }} />
        <div className="h-7 rounded-xl mt-2" style={{ backgroundColor: '#2a2d3e' }} />
      </div>
    </div>
  );
}

// ── Reading Goal widget ────────────────────────────────────────────────────────

function ReadingGoalWidget({ finishedCount }) {
  const year = new Date().getFullYear();
  const [goal, setGoal] = useState(null);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    const g = loadGoal();
    if (g?.year === year) setGoal(g);
  }, [year]);

  const handleSave = () => {
    const n = parseInt(inputVal, 10);
    if (!n || n < 1) return;
    const g = { year, target: n };
    saveGoal(g);
    setGoal(g);
    setEditing(false);
    setInputVal('');
  };

  const pct = goal ? Math.min(100, Math.round((finishedCount / goal.target) * 100)) : 0;
  const remaining = goal ? Math.max(0, goal.target - finishedCount) : 0;

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-semibold text-sm" style={{ color: '#f0f0f5' }}>{year} Reading Goal</span>
        </div>
        {goal && !editing && (
          <button onClick={() => { setInputVal(String(goal.target)); setEditing(true); }} className="text-xs hover:text-indigo-400 transition-colors" style={{ color: '#8b8fa8' }}>
            Edit
          </button>
        )}
      </div>

      {!goal && !editing ? (
        <div className="text-center py-1">
          <p className="text-xs mb-3" style={{ color: '#8b8fa8' }}>How many books will you read in {year}?</p>
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            Set a Goal
          </button>
        </div>
      ) : editing ? (
        <div className="flex gap-2">
          <input
            type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. 24" min="1" autoFocus
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border transition-all focus:border-amber-500"
            style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f0f0f5' }}
          />
          <button onClick={handleSave} className="px-3 py-2 text-white rounded-xl text-sm font-medium hover:opacity-90" style={{ backgroundColor: '#f59e0b' }}>Save</button>
          {goal && <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#2a2d3e', color: '#8b8fa8' }}>✕</button>}
        </div>
      ) : (
        <div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>
              {finishedCount}<span className="text-sm font-normal ml-1" style={{ color: '#8b8fa8' }}>/ {goal.target} books</span>
            </span>
            <span className="text-sm font-bold text-amber-400">{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#2a2d3e' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: '#f59e0b' }} />
          </div>
          <p className="text-xs" style={{ color: '#8b8fa8' }}>
            {remaining === 0 ? '🎉 Goal achieved! Incredible reading!' : `${remaining} more book${remaining !== 1 ? 's' : ''} to go`}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Quote of the Session ──────────────────────────────────────────────────────

function QuoteCard({ quote }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border px-4 py-3 flex flex-col overflow-hidden h-full" style={{ backgroundColor: '#1a1d27', borderColor: 'rgba(99,102,241,0.3)' }}>
      <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
        <Quote className="w-3 h-3 flex-shrink-0" style={{ color: '#818cf8' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#818cf8' }}>Quote of the Session</span>
      </div>
      <p className="text-xs leading-relaxed italic flex-1 overflow-hidden" style={{ color: '#e2e4f0', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>&ldquo;{quote.text}&rdquo;</p>
      <p className="text-xs mt-2 flex-shrink-0 truncate" style={{ color: '#6b7280' }}>— {quote.author}</p>
    </div>
  );
}

// ── Word of the Session ───────────────────────────────────────────────────────

function WordCard({ word }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border px-4 py-3 flex flex-col overflow-hidden h-full" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Aa</span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4ade80' }}>Word of the Session</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1.5 flex-shrink-0 flex-wrap">
        <span className="text-sm font-bold" style={{ color: '#f0f0f5' }}>{word.word}</span>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#2a2d3e', color: '#6b7280' }}>{word.type}</span>
      </div>
      <p className="text-xs leading-relaxed overflow-hidden flex-1" style={{ color: '#8b8fa8', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{word.definition}</p>
    </div>
  );
}

// ── Did You Know ──────────────────────────────────────────────────────────────

function DidYouKnowCard({ fact }) {
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Lightbulb className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Did You Know?</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#8b8fa8' }}>{fact.fact}</p>
    </div>
  );
}

// ── Book Trivia Section ───────────────────────────────────────────────────────

function BookTriviaSection({ initial }) {
  const [current, setCurrent] = useState(initial);
  const [revealed, setRevealed] = useState(false);

  const nextQuestion = () => {
    let next;
    do { next = TRIVIA[Math.floor(Math.random() * TRIVIA.length)]; }
    while (next.q === current.q && TRIVIA.length > 1);
    setCurrent(next);
    setRevealed(false);
  };

  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">🧩</span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#818cf8' }}>Book Trivia</span>
      </div>

      <p className="text-xs font-semibold leading-relaxed mb-3" style={{ color: '#f0f0f5' }}>{current.q}</p>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full px-4 py-2 rounded-xl text-xs font-medium border transition-all hover:opacity-90"
          style={{ backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)', color: '#818cf8' }}
        >
          Reveal Answer
        </button>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl px-3 py-2.5 border" style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#4ade80' }}>{current.a}</p>
            {current.detail && <p className="text-xs leading-relaxed" style={{ color: '#8b8fa8' }}>{current.detail}</p>}
          </div>
          <button
            onClick={nextQuestion}
            className="text-xs font-medium transition-colors hover:text-indigo-300"
            style={{ color: '#6b7280' }}
          >
            Next question →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reading Streak widget ─────────────────────────────────────────────────────

function calcStreak(entries) {
  const finished = entries.filter((e) => e.status === 'FINISHED' && e.finishedAt);
  if (!finished.length) return { booksThisMonth: 0, monthStreak: 0, booksThisYear: 0 };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthStart = new Date(currentYear, currentMonth, 1);
  const booksThisMonth = finished.filter((e) => new Date(e.finishedAt) >= thisMonthStart).length;
  const booksThisYear  = finished.filter((e) => new Date(e.finishedAt).getFullYear() === currentYear).length;

  // Consecutive months with at least 1 book finished
  const monthsWithBooks = new Set(
    finished.map((e) => {
      const d = new Date(e.finishedAt);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  let monthStreak = 0;
  let y = currentYear;
  let m = currentMonth;
  while (monthsWithBooks.has(`${y}-${m}`)) {
    monthStreak++;
    m--;
    if (m < 0) { m = 11; y--; }
    if (monthStreak > 36) break;
  }
  return { booksThisMonth, monthStreak, booksThisYear };
}

function ReadingStreakWidget({ entries }) {
  const { booksThisMonth, monthStreak, booksThisYear } = calcStreak(entries);

  if (booksThisYear === 0) return null;

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(251,191,36,0.12)' }}>
          <Flame className="w-4 h-4 text-amber-400" />
        </div>
        <span className="font-semibold text-sm" style={{ color: '#f0f0f5' }}>Reading Streak</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{booksThisMonth}</p>
          <p className="text-xs mt-0.5" style={{ color: '#8b8fa8' }}>this month</p>
        </div>
        <div className="text-center border-x" style={{ borderColor: '#2a2d3e' }}>
          <p className="text-2xl font-bold" style={{ color: monthStreak >= 3 ? '#f97316' : '#f0f0f5' }}>
            {monthStreak}
            {monthStreak >= 1 && <span className="text-base ml-0.5">🔥</span>}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8b8fa8' }}>mo. streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>{booksThisYear}</p>
          <p className="text-xs mt-0.5" style={{ color: '#8b8fa8' }}>this year</p>
        </div>
      </div>
      {monthStreak >= 3 && (
        <p className="text-xs text-center mt-3" style={{ color: '#f59e0b' }}>
          {monthStreak} months in a row — keep it up! 🎉
        </p>
      )}
    </div>
  );
}

// ── Up Next widget ────────────────────────────────────────────────────────────

function UpNextCard({ entries, loading }) {
  const wishlist = entries.filter(e => e.status === 'WISHLIST').slice(0, 4);

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Up Next</span>
        </div>
        <Link href="/library" className="text-xs transition-colors hover:text-indigo-400" style={{ color: '#8b8fa8' }}>
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-12 rounded-lg flex-shrink-0" style={{ backgroundColor: '#2a2d3e' }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 rounded" style={{ backgroundColor: '#2a2d3e', width: '75%' }} />
                <div className="h-2 rounded" style={{ backgroundColor: '#2a2d3e', width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: '#4a4d62' }}>No books in your wishlist yet.</p>
          <Link href="/search" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
            Search to add some →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {wishlist.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-9 h-12 rounded-lg flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: '#2a2d3e' }}>
                {entry.book?.coverUrl ? (
                  <Image src={entry.book.coverUrl} alt={entry.book.title || ''} fill className="object-cover" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" style={{ color: '#4a4d62' }} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: '#f0f0f5' }}>{entry.book?.title}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: '#6b7280' }}>{entry.book?.author}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recently Viewed widget ────────────────────────────────────────────────────

function RecentlyViewedCard() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    setBooks(getRecentlyViewed());
  }, []);

  if (books.length === 0) return null;

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: '#818cf8' }} />
          <span className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>Recently Viewed</span>
        </div>
      </div>
      <div className="space-y-3">
        {books.map((book) => (
          <Link
            key={book.googleBooksId}
            href={`/book/${book.googleBooksId}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-12 rounded-lg flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: '#2a2d3e' }}>
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title || ''} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: '#4a4d62' }} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors" style={{ color: '#f0f0f5' }}>{book.title}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: '#6b7280' }}>{book.author}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Quick Actions widget ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { href: '/recommendations', label: 'Discover', icon: Sparkles, color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  { href: '/library',         label: 'Library',  icon: Library,   color: '#4ade80', bg: 'rgba(34,197,94,0.12)'  },
  { href: '/trending',        label: 'Trending', icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { href: '/search',          label: 'Search',   icon: Search,    color: '#a78bfa', bg: 'rgba(168,85,247,0.12)' },
];

function QuickActionsCard() {
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#4a4d62' }}>Quick Actions</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:border-indigo-500/40 hover:bg-[#0f1117]"
            style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#8b8fa8' }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const [showWizard, setShowWizard] = useState(false);
  const [goalWidgetKey, setGoalWidgetKey] = useState(0);
  const [entries, setEntries] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryBookIds, setLibraryBookIds] = useState(new Set());
  const [forYou, setForYou] = useState({ books: [], loading: true, empty: false });
  const [moodResult, setMoodResult] = useState({ books: [], loading: false, activeChip: null });
  const [sessionMoods]  = useState(() => pickSessionMoods());
  const [sessionQuote]  = useState(() => pickOne(QUOTES,      QUOTE_KEY));
  const [sessionWord]   = useState(() => pickOne(WORDS,       WORD_KEY));
  const [sessionDyk]    = useState(() => pickOne(DID_YOU_KNOW, DYK_KEY));
  const [sessionTrivia] = useState(() => pickOne(TRIVIA,      TRIVIA_KEY));

  const fetchLibrary = useCallback(async () => {
    try {
      const data = await libraryApi.getLibrary();
      const all = data.entries || [];
      setEntries(all);
      setLibraryBookIds(new Set(all.map(e => e.book?.googleBooksId).filter(Boolean)));
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem('folio_show_wizard') === '1') {
        setShowWizard(true);
        // Reset all checklist state so it appears fresh after onboarding
        localStorage.removeItem('folio_checklist_dismissed');
        localStorage.removeItem('folio_got_recommendation');
        localStorage.removeItem('folio_first_review_done');
      }
    } catch {}
  }, []);

  useEffect(() => {
    async function init() {
      try {
        await fetchLibrary();
      } finally {
        setLibraryLoading(false);
      }

      try {
        const data = await recApi.getRecommendations('history', '', 10);
        const books = data.recommendations || [];
        setForYou({ books, loading: false, empty: books.length === 0 });
      } catch {
        setForYou({ books: [], loading: false, empty: true });
      }
    }
    init();
  }, [fetchLibrary]);

  const handleAddToLibrary = useCallback(async (book) => {
    try {
      await libraryApi.addToLibrary(book);
      if (book.googleBooksId) setLibraryBookIds(prev => new Set([...prev, book.googleBooksId]));
    } catch (err) {
      if (err?.message?.includes('already') && book.googleBooksId) {
        setLibraryBookIds(prev => new Set([...prev, book.googleBooksId]));
      }
    }
  }, []);

  const handleMoodChip = async (chip) => {
    setMoodResult({ books: [], loading: true, activeChip: chip.label, error: false });
    try {
      const data = await recApi.getRecommendations('mood', chip.query, 10);
      setMoodResult({ books: data.recommendations || [], loading: false, activeChip: chip.label, error: false });
    } catch {
      setMoodResult({ books: [], loading: false, activeChip: chip.label, error: true });
    }
  };

  const stats = {
    finished: entries.filter(e => e.status === 'FINISHED').length,
    reading: entries.filter(e => e.status === 'READING').length,
    wishlist: entries.filter(e => e.status === 'WISHLIST').length,
  };
  const currentlyReading = entries.filter(e => e.status === 'READING').map(e => e.book);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1117' }}>
      {showWizard && (
        <OnboardingWizard onComplete={async () => {
          setGoalWidgetKey(k => k + 1); // force ReadingGoalWidget to re-read localStorage
          await fetchLibrary();          // fetch fresh entries BEFORE closing wizard
          setShowWizard(false);          // close wizard only after entries are up to date
        }} />
      )}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 py-8 pb-16">

        {/* Greeting + Stats + top cards */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">

          {/* Left: greeting + date + stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: '#f0f0f5' }}>
              {getGreeting(user?.name)} 👋
            </h1>
            <p className="text-sm mb-6" style={{ color: '#8b8fa8' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {!libraryLoading && (
              <div className="flex gap-3 flex-wrap">
                {[
                  { icon: CheckCircle, cls: 'text-green-400', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', count: stats.finished, label: 'Finished' },
                  { icon: BookOpen, cls: 'text-indigo-400', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', count: stats.reading, label: 'Reading' },
                  { icon: Bookmark, cls: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', count: stats.wishlist, label: 'Wishlist' },
                ].map(({ icon: Icon, cls, bg, border, count, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl px-4 py-3 border" style={{ backgroundColor: bg, borderColor: border }}>
                    <Icon className={`w-4 h-4 ${cls}`} />
                    <span className="text-sm font-medium" style={{ color: '#f0f0f5' }}>
                      <span className="font-bold">{count}</span>
                      <span className="ml-1.5" style={{ color: '#8b8fa8' }}>{label}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Quote + Word side by side */}
          <div className="hidden lg:flex gap-3 flex-shrink-0" style={{ width: '520px', height: '130px' }}>
            <QuoteCard quote={sessionQuote} />
            <WordCard word={sessionWord} />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Currently Reading */}
            {currentlyReading.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold tracking-tight" style={{ color: '#f0f0f5' }}>📖 Currently Reading</h2>
                  <Link href="/library" className="flex items-center gap-1 text-xs hover:text-indigo-300 transition-colors" style={{ color: '#8b8fa8' }}>
                    View library <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <HorizontalBookScroll books={currentlyReading} onAddToLibrary={handleAddToLibrary} libraryBookIds={libraryBookIds} />
              </section>
            )}

            {/* Recommended For You */}
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="text-base font-bold tracking-tight" style={{ color: '#f0f0f5' }}>Recommended for You</h2>
              </div>

              {forYou.loading ? (
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : forYou.empty ? (
                <div className="rounded-2xl border px-6 py-8 text-center" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
                  <BookMarked className="w-8 h-8 mx-auto mb-3" style={{ color: '#4a4d62' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#8b8fa8' }}>No personalised picks yet</p>
                  <p className="text-xs" style={{ color: '#4a4d62' }}>
                    Mark books as Finished in your{' '}
                    <Link href="/library" className="text-indigo-400 hover:text-indigo-300">library</Link>{' '}
                    and we&apos;ll recommend what to read next.
                  </p>
                </div>
              ) : (
                <HorizontalBookScroll books={forYou.books} onAddToLibrary={handleAddToLibrary} libraryBookIds={libraryBookIds} />
              )}
            </section>

            {/* Browse by Mood */}
            <section>
              <h2 className="text-base font-bold tracking-tight mb-4" style={{ color: '#f0f0f5' }}>🎭 Browse by Mood</h2>

              <div className="flex flex-wrap gap-2 mb-5">
                {sessionMoods.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleMoodChip(chip)}
                    disabled={moodResult.loading}
                    className="px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-60"
                    style={
                      moodResult.activeChip === chip.label
                        ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#fff' }
                        : { backgroundColor: '#1a1d27', borderColor: '#2a2d3e', color: '#8b8fa8' }
                    }
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {moodResult.loading && (
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}
              {!moodResult.loading && moodResult.error && (
                <div className="rounded-2xl border px-6 py-8 text-center" style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" style={{ color: '#ef4444' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#f0f0f5' }}>Couldn&apos;t load mood picks</p>
                  <p className="text-xs mb-4" style={{ color: '#8b8fa8' }}>Give it another try.</p>
                  <button
                    onClick={() => {
                      const chip = sessionMoods.find(c => c.label === moodResult.activeChip);
                      if (chip) handleMoodChip(chip);
                    }}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#6366f1' }}
                  >
                    Try Again
                  </button>
                </div>
              )}
              {!moodResult.loading && !moodResult.error && moodResult.books.length > 0 && (
                <HorizontalBookScroll books={moodResult.books} onAddToLibrary={handleAddToLibrary} libraryBookIds={libraryBookIds} />
              )}
            </section>

          </div>

          {/* Right: sidebar */}
          <div className="lg:border-l lg:pl-6" style={{ borderColor: '#2a2d3e' }}>
            <div className="space-y-8">
              <GettingStartedChecklist entries={entries} loading={libraryLoading} wizardOpen={showWizard} />
              <ReadingStreakWidget entries={entries} />
              <ReadingGoalWidget key={goalWidgetKey} finishedCount={stats.finished} />
              <UpNextCard entries={entries} loading={libraryLoading} />
              <RecentlyViewedCard />
              <BookTriviaSection initial={sessionTrivia} />
              <DidYouKnowCard fact={sessionDyk} />
              <QuickActionsCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
