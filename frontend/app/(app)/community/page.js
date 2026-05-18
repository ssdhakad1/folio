'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Users, Star, BookOpen, MessageSquare, Loader2, Search, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { community as communityApi } from '../../../lib/api';

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ review }) {
  return (
    <div
      className="rounded-2xl border p-4 transition-colors hover:border-indigo-500/40"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <div className="flex gap-3">
        {/* Book cover */}
        <Link href={`/book/${review.book?.googleBooksId}`} className="flex-shrink-0">
          <div
            className="w-12 h-16 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: '#2a2d3e' }}
          >
            {review.book?.coverUrl ? (
              <Image
                src={review.book.coverUrl}
                alt={review.book.title}
                width={48}
                height={64}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <BookOpen className="w-4 h-4" style={{ color: '#4a4d62' }} />
            )}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          {/* Book info */}
          <Link
            href={`/book/${review.book?.googleBooksId}`}
            className="font-semibold text-sm leading-snug hover:text-indigo-400 transition-colors"
            style={{ color: '#f0f0f5' }}
          >
            {review.book?.title}
          </Link>
          <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>
            {review.book?.author}
          </p>

          {/* Star rating */}
          <div className="flex items-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-3 h-3"
                style={{ color: s <= review.rating ? '#fbbf24' : '#2a2d3e' }}
                fill={s <= review.rating ? '#fbbf24' : 'none'}
              />
            ))}
          </div>

          {/* Review text */}
          <p
            className="text-sm leading-relaxed"
            style={{
              color: '#8b8fa8',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {review.content}
          </p>

          {/* Reviewer + date */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: '#2a2d3e' }}>
            <Link
              href={`/readers/${review.user?.id}`}
              className="text-xs font-medium hover:text-indigo-300 transition-colors"
              style={{ color: '#818cf8' }}
            >
              {review.user?.name}
            </Link>
            <span className="text-xs" style={{ color: '#4a4d62' }}>
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reader row ────────────────────────────────────────────────────────────────

function ReaderRow({ profile, rank }) {
  return (
    <Link
      href={`/readers/${profile.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#0f1117]"
    >
      <span className="w-5 text-xs font-medium text-center flex-shrink-0" style={{ color: '#4a4d62' }}>
        {rank}
      </span>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          backgroundColor: 'rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.35)',
          color: '#818cf8',
        }}
      >
        {profile.name[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: '#f0f0f5' }}>{profile.name}</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>
          {profile.finished} finished · {profile.reviewCount} reviews
        </p>
      </div>
      {profile.avgRating != null && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="w-3 h-3" style={{ color: '#fbbf24' }} />
          <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>{profile.avgRating}</span>
        </div>
      )}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reviews, setReviews]     = useState([]);
  const [profiles, setProfiles]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Search state
  const [reviewSearch, setReviewSearch] = useState('');
  const [userSearch, setUserSearch]     = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [rData, pData] = await Promise.all([
          communityApi.getReviews(),
          communityApi.getProfiles(),
        ]);
        setReviews(rData.reviews || []);
        setProfiles(pData.profiles || []);
      } catch { /* non-critical */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Filtered lists
  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(r =>
      r.book?.title?.toLowerCase().includes(q) ||
      r.book?.author?.toLowerCase().includes(q)
    );
  }, [reviews, reviewSearch]);

  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => p.name.toLowerCase().includes(q));
  }, [profiles, userSearch]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1117' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#818cf8' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#0f1117' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-6 h-6" style={{ color: '#818cf8' }} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f0f0f5' }}>Community</h1>
            <p className="text-sm" style={{ color: '#8b8fa8' }}>See what readers are finishing and reviewing</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#818cf8' }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left: Reviews ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Review search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#4a4d62' }} />
                <input
                  type="text"
                  value={reviewSearch}
                  onChange={e => setReviewSearch(e.target.value)}
                  placeholder="Book or author…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm border outline-none transition-colors focus:border-indigo-500/60"
                  style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e', color: '#f0f0f5' }}
                />
                {reviewSearch && (
                  <button
                    onClick={() => setReviewSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-indigo-400"
                    style={{ color: '#4a4d62' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Section label */}
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4a4d62' }}>
                  {reviewSearch.trim()
                    ? `Results for "${reviewSearch.trim()}" · ${filteredReviews.length}`
                    : `Recent Reviews · ${reviews.length}`}
                </h2>
              </div>

              {filteredReviews.length === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center"
                  style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
                >
                  <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: '#4a4d62' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#f0f0f5' }}>
                    {reviewSearch.trim() ? 'No Reviews Found' : 'No Reviews Yet'}
                  </p>
                  <p className="text-xs" style={{ color: '#8b8fa8' }}>
                    {reviewSearch.trim()
                      ? `No reviews match "${reviewSearch.trim()}". Try a different title or author.`
                      : 'Finish a book and be the first to review!'}
                  </p>
                </div>
              ) : (
                filteredReviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))
              )}
            </div>

            {/* ── Right: Active Readers ── */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4a4d62' }}>
                Active Readers
              </h2>

              <div
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                {/* Reader search */}
                <div className="p-3 border-b" style={{ borderColor: '#2a2d3e' }}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#4a4d62' }} />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search readers…"
                      className="w-full pl-8 pr-7 py-2 rounded-lg text-xs border outline-none transition-colors focus:border-indigo-500/60"
                      style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f0f0f5' }}
                    />
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors hover:text-indigo-400"
                        style={{ color: '#4a4d62' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredProfiles.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-7 h-7 mx-auto mb-3" style={{ color: '#4a4d62' }} />
                    <p className="text-sm" style={{ color: '#8b8fa8' }}>
                      {userSearch.trim() ? `No Readers Match "${userSearch.trim()}"` : 'No Readers Yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#2a2d3e' }}>
                    {filteredProfiles.slice(0, 25).map((profile, i) => (
                      <ReaderRow key={profile.id} profile={profile} rank={i + 1} />
                    ))}
                  </div>
                )}
              </div>

              {/* Link to own profile */}
              <Link
                href={`/readers/${user.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[#0f1117]"
                style={{ borderColor: '#2a2d3e', color: '#818cf8', backgroundColor: 'transparent' }}
              >
                View my public profile →
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
