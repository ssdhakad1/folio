'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BarChart2, BookOpen, Star, Users, Tag, TrendingUp,
  CheckCircle, BookMarked, Bookmark, Clock,
} from 'lucide-react';
import { library as libraryApi } from '../../../lib/api';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMonthLabel(monthIndex) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIndex];
}

function buildMonthlyData(entries, year) {
  const counts = Array(12).fill(0);
  entries.forEach((e) => {
    if (e.status !== 'FINISHED' || !e.finishedAt) return;
    const d = new Date(e.finishedAt);
    if (d.getFullYear() === year) counts[d.getMonth()]++;
  });
  return counts.map((count, i) => ({ label: getMonthLabel(i), count }));
}

function buildGenreData(entries) {
  const map = {};
  entries.forEach((e) => {
    if (e.status !== 'FINISHED') return;
    (e.book?.genres || []).forEach((g) => {
      const key = g.toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), count }));
}

function buildAuthorData(entries) {
  const map = {};
  entries.forEach((e) => {
    if (e.status !== 'FINISHED' || !e.book?.author) return;
    const a = e.book.author;
    map[a] = (map[a] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author, count]) => ({ author, count }));
}

function buildRatingData(reviews) {
  const counts = [0, 0, 0, 0, 0]; // index 0 = 1 star
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
  });
  return counts.map((count, i) => ({ stars: i + 1, count }));
}

function avgRating(reviews) {
  if (!reviews.length) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

function totalPages(entries) {
  return entries
    .filter((e) => e.status === 'FINISHED' && e.book?.pageCount)
    .reduce((s, e) => s + (e.book.pageCount || 0), 0);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, iconBg, value, label, sub, delta }) {
  return (
    <div className="rounded-2xl border p-5 flex items-center gap-4" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: iconBg}}>
        <Icon size={20} style={{color: iconColor}} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold leading-tight" style={{color:'#f0f0f5'}}>{value}</p>
          {delta !== undefined && delta !== null && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{
              backgroundColor: delta > 0 ? 'rgba(74,222,128,0.12)' : delta < 0 ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
              color:           delta > 0 ? '#4ade80'               : delta < 0 ? '#f87171'               : '#6b7280',
            }}>
              {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '='} vs last yr
            </span>
          )}
        </div>
        <p className="text-xs font-medium" style={{color:'#8b8fa8'}}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{color:'#4a4d62'}}>{sub}</p>}
      </div>
    </div>
  );
}

function MonthlyChart({ data, year }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <div className="rounded-2xl border p-5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="w-4 h-4" style={{color:'#818cf8'}} />
        <h2 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Books Read per Month — {year}</h2>
      </div>
      <div className="flex items-end gap-1.5 h-36">
        {data.map(({ label, count }, i) => {
          const isFuture = year === currentYear && i > currentMonth;
          const pct = (count / max) * 100;
          const isActive = count > 0;
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1" title={`${label}: ${count} book${count !== 1 ? 's' : ''}`}>
              <span className="text-xs font-medium" style={{color: isActive ? '#f0f0f5' : '#4a4d62'}}>
                {count > 0 ? count : ''}
              </span>
              <div className="w-full rounded-t-md relative overflow-hidden" style={{height:'80px', backgroundColor:'rgba(42,45,62,0.6)'}}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500"
                  style={{
                    height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                    backgroundColor: isFuture ? 'transparent' : isActive ? '#6366f1' : 'transparent',
                  }}
                />
              </div>
              <span className="text-xs" style={{color: isFuture ? '#2a2d3e' : '#6b7280'}}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenreChart({ data }) {
  if (!data.length) return null;
  const max = data[0].count;
  return (
    <div className="rounded-2xl border p-5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="flex items-center gap-2 mb-5">
        <Tag className="w-4 h-4" style={{color:'#818cf8'}} />
        <h2 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Top Genres</h2>
      </div>
      <div className="space-y-3">
        {data.map(({ label, count }) => (
          <div key={label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium truncate max-w-[70%]" style={{color:'#f0f0f5'}}>{label}</span>
              <span className="text-xs" style={{color:'#6b7280'}}>{count} book{count !== 1 ? 's' : ''}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{backgroundColor:'rgba(42,45,62,0.8)'}}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{width:`${(count / max) * 100}%`, backgroundColor:'rgba(99,102,241,0.7)'}}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingChart({ data, reviews }) {
  const total = reviews.length;
  const max = Math.max(...data.map((d) => d.count), 1);
  const avg = avgRating(reviews);

  return (
    <div className="rounded-2xl border p-5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4" style={{color:'#f59e0b'}} />
          <h2 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Rating Distribution</h2>
        </div>
        {avg && (
          <span className="text-sm font-bold" style={{color:'#fbbf24'}}>{avg} Avg</span>
        )}
      </div>
      {total === 0 ? (
        <p className="text-xs text-center py-4" style={{color:'#4a4d62'}}>No Reviews Yet.</p>
      ) : (
        <div className="space-y-2.5">
          {[...data].reverse().map(({ stars, count }) => (
            <div key={stars} className="flex items-center gap-2">
              <div className="flex gap-0.5 flex-shrink-0 w-20">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-3 h-3 ${s <= stars ? 'text-amber-400 fill-amber-400' : 'text-[#2a2d3e]'}`} />
                ))}
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{backgroundColor:'rgba(42,45,62,0.8)'}}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{width:`${(count / max) * 100}%`, backgroundColor:'#f59e0b'}}
                />
              </div>
              <span className="text-xs w-4 text-right" style={{color:'#6b7280'}}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopAuthorsCard({ data }) {
  if (!data.length) return null;
  return (
    <div className="rounded-2xl border p-5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="flex items-center gap-2 mb-5">
        <Users className="w-4 h-4" style={{color:'#818cf8'}} />
        <h2 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Most Read Authors</h2>
      </div>
      <div className="space-y-3">
        {data.map(({ author, count }, i) => (
          <div key={author} className="flex items-center gap-3">
            <span className="text-xs font-bold w-4 text-right flex-shrink-0" style={{color:'#4a4d62'}}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{color:'#f0f0f5'}}>{author}</p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{backgroundColor:'rgba(99,102,241,0.12)', color:'#818cf8'}}
            >
              {count} book{count !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentBooksCard({ entries }) {
  const recent = [...entries]
    .filter((e) => e.status === 'FINISHED')
    .sort((a, b) => new Date(b.finishedAt || b.addedAt) - new Date(a.finishedAt || a.addedAt))
    .slice(0, 5);

  if (!recent.length) return null;

  return (
    <div className="rounded-2xl border p-5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="flex items-center gap-2 mb-5">
        <CheckCircle className="w-4 h-4" style={{color:'#4ade80'}} />
        <h2 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Recently Finished</h2>
      </div>
      <div className="space-y-3">
        {recent.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3">
            <div className="w-8 h-11 rounded-lg flex-shrink-0 overflow-hidden relative" style={{backgroundColor:'#2a2d3e'}}>
              {entry.book?.coverUrl ? (
                <Image src={entry.book.coverUrl} alt={entry.book.title || ''} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-3 h-3" style={{color:'#4a4d62'}} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {entry.book?.googleBooksId ? (
                <Link
                  href={`/book/${entry.book.googleBooksId}`}
                  className="text-xs font-medium line-clamp-1 hover:text-indigo-400 transition-colors"
                  style={{color:'#f0f0f5'}}
                >
                  {entry.book.title}
                </Link>
              ) : (
                <p className="text-xs font-medium line-clamp-1" style={{color:'#f0f0f5'}}>{entry.book?.title}</p>
              )}
              <p className="text-xs truncate mt-0.5" style={{color:'#6b7280'}}>{entry.book?.author}</p>
            </div>
            {entry.finishedAt && (
              <span className="text-xs flex-shrink-0" style={{color:'#4a4d62'}}>
                {new Date(entry.finishedAt).toLocaleDateString('en-US', {month:'short', day:'numeric'})}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [entries, setEntries] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await libraryApi.getStats();
      setEntries(data.entries || []);
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.message || 'Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#0f1117'}}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
          <p style={{color:'#8b8fa8'}}>Loading your stats…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor:'#0f1117'}}>
        <div className="rounded-2xl border px-8 py-10 text-center max-w-sm w-full" style={{backgroundColor:'rgba(239,68,68,0.05)', borderColor:'rgba(239,68,68,0.2)'}}>
          <BarChart2 className="w-8 h-8 mx-auto mb-3 opacity-40" style={{color:'#ef4444'}} />
          <p className="text-sm font-medium mb-1" style={{color:'#f0f0f5'}}>Couldn&apos;t load stats</p>
          <p className="text-xs mb-5" style={{color:'#8b8fa8'}}>{error}</p>
          <button
            onClick={fetchStats}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{backgroundColor:'#6366f1'}}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const finished    = entries.filter((e) => e.status === 'FINISHED');
  const reading     = entries.filter((e) => e.status === 'READING');
  const wishlist    = entries.filter((e) => e.status === 'WISHLIST');
  const pages       = totalPages(entries);
  const monthlyData = buildMonthlyData(entries, year);
  const genreData   = buildGenreData(entries);
  const authorData  = buildAuthorData(entries);
  const ratingData  = buildRatingData(reviews);
  const avgR        = avgRating(reviews);

  // Available years (from finishedAt dates)
  const years = [...new Set(
    finished.map((e) => e.finishedAt ? new Date(e.finishedAt).getFullYear() : null).filter(Boolean)
  )].sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());

  const finishedThisYear = finished.filter((e) => {
    if (!e.finishedAt) return false;
    return new Date(e.finishedAt).getFullYear() === year;
  }).length;

  const finishedPrevYear = finished.filter((e) => {
    if (!e.finishedAt) return false;
    return new Date(e.finishedAt).getFullYear() === year - 1;
  }).length;

  // Only show delta if we have data for at least one of the years
  const yearDelta = (finishedThisYear > 0 || finishedPrevYear > 0)
    ? finishedThisYear - finishedPrevYear
    : null;

  return (
    <div className="min-h-screen pb-16" style={{backgroundColor:'#0f1117'}}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BarChart2 className="w-6 h-6" style={{color:'#818cf8'}} />
              <h1 className="text-2xl font-bold tracking-tight" style={{color:'#f0f0f5'}}>Reading Stats</h1>
            </div>
            <p className="text-sm ml-9" style={{color:'#8b8fa8'}}>Your reading journey at a glance.</p>
          </div>
          {years.length > 1 && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-all"
              style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e', color:'#f0f0f5'}}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="rounded-2xl border px-8 py-16 text-center" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
            <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20" style={{color:'#818cf8'}} />
            <p className="text-base font-medium mb-2" style={{color:'#8b8fa8'}}>No Stats Yet</p>
            <p className="text-sm mb-6" style={{color:'#4a4d62'}}>
              Add books to your library and start reading to see your stats here.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/search"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                style={{backgroundColor:'#6366f1'}}
              >
                Search Books
              </Link>
              <Link
                href="/trending"
                className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[#1a1d27]"
                style={{borderColor:'#2a2d3e', color:'#8b8fa8'}}
              >
                Browse Trending
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={CheckCircle}
                iconColor="#4ade80"
                iconBg="rgba(34,197,94,0.1)"
                value={finished.length}
                label="Books Finished"
                sub={finishedThisYear !== finished.length ? `${finishedThisYear} in ${year}` : undefined}
              />
              <StatCard
                icon={BookOpen}
                iconColor="#818cf8"
                iconBg="rgba(99,102,241,0.1)"
                value={reading.length}
                label="Currently Reading"
              />
              <StatCard
                icon={Bookmark}
                iconColor="#f59e0b"
                iconBg="rgba(245,158,11,0.1)"
                value={wishlist.length}
                label="On Wishlist"
              />
              <StatCard
                icon={TrendingUp}
                iconColor="#4ade80"
                iconBg="rgba(34,197,94,0.1)"
                value={pages > 0 ? pages.toLocaleString() : '—'}
                label="Pages Read"
                sub={pages > 0 ? 'from finished books' : undefined}
              />
            </div>

            {/* Second row of stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Star}
                iconColor="#fbbf24"
                iconBg="rgba(245,158,11,0.1)"
                value={avgR || '—'}
                label="Avg Rating"
                sub={reviews.length > 0 ? `from ${reviews.length} review${reviews.length !== 1 ? 's' : ''}` : 'No Reviews Yet'}
              />
              <StatCard
                icon={BookMarked}
                iconColor="#818cf8"
                iconBg="rgba(99,102,241,0.1)"
                value={entries.length}
                label="Total in Library"
              />
              <StatCard
                icon={Users}
                iconColor="#a78bfa"
                iconBg="rgba(168,85,247,0.1)"
                value={authorData.length > 0 ? authorData[0].author.split(' ').pop() : '—'}
                label="Top Author"
                sub={authorData.length > 0 ? `${authorData[0].count} book${authorData[0].count !== 1 ? 's' : ''}` : undefined}
              />
              <StatCard
                icon={Clock}
                iconColor="#38bdf8"
                iconBg="rgba(56,189,248,0.1)"
                value={finishedThisYear}
                label={`Finished in ${year}`}
                delta={yearDelta}
              />
            </div>

            {/* Monthly chart */}
            <MonthlyChart data={monthlyData} year={year} />

            {/* Genre + Ratings side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GenreChart data={genreData} />
              <RatingChart data={ratingData} reviews={reviews} />
            </div>

            {/* Authors + Recent Books side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TopAuthorsCard data={authorData} />
              <RecentBooksCard entries={entries} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
