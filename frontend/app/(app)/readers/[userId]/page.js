'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  User, Calendar, BookOpen, CheckCircle, Bookmark,
  Star, MessageSquare, Loader2, ArrowLeft, Search, X,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { community as communityApi } from '../../../../lib/api';

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, color, value, label }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: '#0f1117' }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-lg font-bold" style={{ color: '#f0f0f5' }}>{value}</span>
      </div>
      <span className="text-xs" style={{ color: '#6b7280' }}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReaderProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [bookSearch, setBookSearch] = useState('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !authUser) router.replace('/');
  }, [authUser, authLoading, router]);

  // Fetch profile
  useEffect(() => {
    if (!userId || !authUser) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await communityApi.getUserProfile(userId);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Reader not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, authUser]);

  // Filtered books & reviews
  const filteredEntries = useMemo(() => {
    if (!profile) return [];
    const q = bookSearch.trim().toLowerCase();
    if (!q) return profile.finishedEntries;
    return profile.finishedEntries.filter(e =>
      e.book?.title?.toLowerCase().includes(q) ||
      e.book?.author?.toLowerCase().includes(q)
    );
  }, [profile, bookSearch]);

  const filteredReviews = useMemo(() => {
    if (!profile) return [];
    const q = bookSearch.trim().toLowerCase();
    if (!q) return profile.reviews;
    return profile.reviews.filter(r =>
      r.book?.title?.toLowerCase().includes(q) ||
      r.book?.author?.toLowerCase().includes(q)
    );
  }, [profile, bookSearch]);

  if (authLoading || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1117' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#818cf8' }} />
      </div>
    );
  }

  const joinDate = profile?.user?.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const isOwnProfile = authUser?.id === userId;
  const hasContent   = profile && (profile.finishedEntries.length > 0 || profile.reviews.length > 0);

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#0f1117' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Back */}
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm mb-6 hover:text-indigo-400 transition-colors"
          style={{ color: '#8b8fa8' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#818cf8' }} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
          >
            <User className="w-8 h-8 mx-auto mb-3" style={{ color: '#4a4d62' }} />
            <p className="text-sm" style={{ color: '#8b8fa8' }}>{error}</p>
            <Link
              href="/community"
              className="inline-block mt-4 text-sm font-medium hover:text-indigo-300 transition-colors"
              style={{ color: '#818cf8' }}
            >
              ← Back to Community
            </Link>
          </div>
        )}

        {/* Profile content */}
        {!loading && !error && profile && (
          <>
            {/* ── Header card ── */}
            <div
              className="rounded-2xl border p-6 mb-6"
              style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
            >
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold"
                  style={{
                    backgroundColor: 'rgba(99,102,241,0.2)',
                    border: '2px solid rgba(99,102,241,0.35)',
                    color: '#818cf8',
                  }}
                >
                  {profile.user.name[0].toUpperCase()}
                </div>

                {/* Name + date */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold" style={{ color: '#f0f0f5' }}>
                      {profile.user.name}
                    </h1>
                    {isOwnProfile && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                      >
                        You
                      </span>
                    )}
                  </div>
                  {joinDate && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4a4d62' }} />
                      <span className="text-sm" style={{ color: '#6b7280' }}>Member since {joinDate}</span>
                    </div>
                  )}
                  {isOwnProfile && (
                    <Link
                      href="/profile"
                      className="inline-block mt-2 text-xs font-medium hover:text-indigo-300 transition-colors"
                      style={{ color: '#818cf8' }}
                    >
                      Edit profile settings →
                    </Link>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <StatTile icon={CheckCircle} color="#4ade80" value={profile.stats.finished}         label="Finished"   />
                <StatTile icon={BookOpen}    color="#818cf8" value={profile.stats.reading}          label="Reading"    />
                <StatTile icon={Bookmark}    color="#f59e0b" value={profile.stats.wishlist}         label="Wishlist"   />
                <StatTile icon={Star}        color="#fbbf24" value={profile.stats.avgRating ?? '—'} label="Avg Rating" />
              </div>
            </div>

            {/* ── Book search (only when there's something to search) ── */}
            {hasContent && (
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#4a4d62' }} />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={e => setBookSearch(e.target.value)}
                  placeholder={`Search ${isOwnProfile ? 'your' : `${profile.user.name}'s`} books…`}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm border outline-none transition-colors focus:border-indigo-500/60"
                  style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e', color: '#f0f0f5' }}
                />
                {bookSearch && (
                  <button
                    onClick={() => setBookSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-indigo-400"
                    style={{ color: '#4a4d62' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* ── Finished books grid ── */}
            {(filteredEntries.length > 0 || (bookSearch && profile.finishedEntries.length > 0)) && (
              <div className="mb-8">
                <h2
                  className="text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{ color: '#4a4d62' }}
                >
                  Books Read · {filteredEntries.length}
                  {bookSearch.trim() && filteredEntries.length !== profile.finishedEntries.length &&
                    ` of ${profile.finishedEntries.length}`}
                </h2>

                {filteredEntries.length === 0 ? (
                  <div
                    className="rounded-2xl border p-6 text-center"
                    style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
                  >
                    <p className="text-sm" style={{ color: '#8b8fa8' }}>
                      No books match &ldquo;{bookSearch}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {filteredEntries.map(entry => (
                      <Link key={entry.id} href={`/book/${entry.book.googleBooksId}`}>
                        <div
                          className="aspect-[2/3] rounded-lg overflow-hidden transition-transform hover:scale-105"
                          style={{ backgroundColor: '#2a2d3e' }}
                          title={entry.book.title}
                        >
                          {entry.book.coverUrl ? (
                            <Image
                              src={entry.book.coverUrl}
                              alt={entry.book.title}
                              width={80}
                              height={120}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-5 h-5" style={{ color: '#4a4d62' }} />
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Reviews ── */}
            {(filteredReviews.length > 0 || (bookSearch && profile.reviews.length > 0)) && (
              <div>
                <h2
                  className="text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{ color: '#4a4d62' }}
                >
                  Reviews · {filteredReviews.length}
                  {bookSearch.trim() && filteredReviews.length !== profile.reviews.length &&
                    ` of ${profile.reviews.length}`}
                </h2>

                {filteredReviews.length === 0 ? (
                  <div
                    className="rounded-2xl border p-6 text-center"
                    style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
                  >
                    <p className="text-sm" style={{ color: '#8b8fa8' }}>
                      No reviews match &ldquo;{bookSearch}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReviews.map(review => (
                      <div
                        key={review.id}
                        className="rounded-2xl border p-4"
                        style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
                      >
                        <div className="flex gap-3">
                          {/* Cover */}
                          {review.book?.coverUrl && (
                            <Link href={`/book/${review.book.googleBooksId}`} className="flex-shrink-0">
                              <div
                                className="w-10 h-14 rounded-lg overflow-hidden"
                                style={{ backgroundColor: '#2a2d3e' }}
                              >
                                <Image
                                  src={review.book.coverUrl}
                                  alt={review.book.title}
                                  width={40}
                                  height={56}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                />
                              </div>
                            </Link>
                          )}

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/book/${review.book?.googleBooksId}`}
                              className="font-semibold text-sm hover:text-indigo-400 transition-colors"
                              style={{ color: '#f0f0f5' }}
                            >
                              {review.book?.title}
                            </Link>
                            <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>
                              {review.book?.author}
                            </p>

                            {/* Stars */}
                            <div className="flex items-center gap-0.5 mb-2">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star
                                  key={s}
                                  className="w-3 h-3"
                                  style={{ color: s <= review.rating ? '#fbbf24' : '#2a2d3e' }}
                                  fill={s <= review.rating ? '#fbbf24' : 'none'}
                                />
                              ))}
                            </div>

                            <p
                              className="text-sm leading-relaxed"
                              style={{
                                color: '#8b8fa8',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {review.content}
                            </p>

                            <p className="text-xs mt-2" style={{ color: '#4a4d62' }}>
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Empty state (no content at all) ── */}
            {!hasContent && (
              <div
                className="rounded-2xl border p-10 text-center"
                style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
              >
                <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: '#4a4d62' }} />
                <p className="text-sm" style={{ color: '#8b8fa8' }}>
                  {isOwnProfile
                    ? "You haven't finished any books yet — keep reading!"
                    : "This reader hasn't finished any books yet."}
                </p>
                {isOwnProfile && (
                  <Link
                    href="/library"
                    className="inline-block mt-4 text-sm font-medium hover:text-indigo-300 transition-colors"
                    style={{ color: '#818cf8' }}
                  >
                    Go to your library →
                  </Link>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
