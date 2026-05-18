'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen, Star, Calendar, Hash, ShoppingBag, Plus, Check,
  ChevronLeft, FileText, Pencil, Sparkles, Loader2,
} from 'lucide-react';
import { books as booksApi, library as libraryApi } from '../../../../lib/api';
import { addRecentlyViewed } from '../../../../lib/recentlyViewed';
import BookSourcesModal from '../../../../components/BookSourcesModal';
import ReviewModal from '../../../../components/ReviewModal';

async function fetchOpenLibraryBook(rawId) {
  const workId = rawId.replace(/^OL_/, '');
  const workUrl = `https://openlibrary.org/works/${workId}.json`;

  const workRes = await fetch(workUrl);
  if (!workRes.ok) throw new Error('Open Library book not found.');
  const work = await workRes.json();

  let author = 'Unknown Author';
  if (work.authors && work.authors.length > 0) {
    const authorKey = work.authors[0].author?.key || work.authors[0].key;
    if (authorKey) {
      try {
        const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`);
        if (authorRes.ok) {
          const authorData = await authorRes.json();
          author = authorData.name || authorData.personal_name || 'Unknown Author';
        }
      } catch { /* use default */ }
    }
  }

  let coverUrl = null;
  if (work.covers && work.covers.length > 0) {
    coverUrl = `https://covers.openlibrary.org/b/id/${work.covers[0]}-M.jpg`;
  }

  let description = null;
  if (work.description) {
    description = typeof work.description === 'string' ? work.description : work.description.value || null;
  }

  const genres = work.subjects
    ? work.subjects
        .filter(s => !s.includes(':') && !s.includes('=') && s.length <= 40)
        .slice(0, 5)
    : [];
  const title  = work.title || 'Unknown Title';
  const buyLink = `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + author + ' buy')}`;

  return {
    googleBooksId: rawId, title, author, coverUrl, description,
    genres, publishedDate: work.first_publish_date || null,
    averageRating: null, pageCount: null, isbn: null, buyLink,
  };
}

export default function BookDetailPage() {
  const params        = useParams();
  const router        = useRouter();
  const googleBooksId = params.googleBooksId;

  const [book,           setBook]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [libraryEntry,   setLibraryEntry]   = useState(null); // the user's library entry
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [showSources,    setShowSources]    = useState(false);

  // User's own review
  const [userReview,    setUserReview]    = useState(null);
  const [reviewModal,   setReviewModal]   = useState(false);

  // Similar books
  const [similar,       setSimilar]       = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const fetchBook = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let bookData;
      if (googleBooksId && googleBooksId.startsWith('OL_')) {
        bookData = await fetchOpenLibraryBook(googleBooksId);
      } else {
        const data = await booksApi.getBook(googleBooksId);
        bookData = data.book;
      }
      setBook(bookData);
      addRecentlyViewed(bookData);

      // Check library + fetch review
      try {
        const libData = await libraryApi.getLibrary();
        const entries = libData.entries || [];
        const found   = entries.find((e) => e.book?.googleBooksId === bookData.googleBooksId);
        setLibraryEntry(found || null);
        if (found) {
          try {
            const r = await libraryApi.getReview(found.id);
            setUserReview(r.review || null);
          } catch { /* no review yet */ }
        }
      } catch { /* non-critical */ }
    } catch (err) {
      setError(err.message || 'Failed to load book details.');
    } finally {
      setLoading(false);
    }
  }, [googleBooksId]);

  useEffect(() => {
    if (googleBooksId) fetchBook();
  }, [googleBooksId, fetchBook]);

  // Fetch more books by the same author directly from Open Library
  useEffect(() => {
    if (!book?.author) return;
    setSimilarLoading(true);
    const author = book.author;
    const title  = book.title;
    fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=20&fields=key,title,author_name,cover_i&sort=editions`)
      .then(r => r.json())
      .then(data => {
        const books = (data.docs || [])
          .filter(d => d.cover_i && d.title?.toLowerCase() !== title?.toLowerCase())
          .slice(0, 5)
          .map(d => ({
            googleBooksId: `OL_${d.key.replace('/works/', '')}`,
            title:    d.title,
            author:   d.author_name?.[0] || author,
            coverUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
          }));
        setSimilar(books);
      })
      .catch(() => {})
      .finally(() => setSimilarLoading(false));
  }, [book?.author, book?.title]);

  const handleAddToLibrary = async () => {
    if (!book || libraryEntry) return;
    setAddingToLibrary(true);
    try {
      const data = await libraryApi.addToLibrary(book);
      setLibraryEntry(data.entry);
    } catch (err) {
      if (err.message?.includes('already')) {
        // Refresh library entry
        try {
          const libData = await libraryApi.getLibrary();
          const found = (libData.entries || []).find((e) => e.book?.googleBooksId === book.googleBooksId);
          setLibraryEntry(found || null);
        } catch {}
      }
    } finally {
      setAddingToLibrary(false);
    }
  };

  const handleSaveReview = async (content, rating) => {
    if (!libraryEntry) return;
    await libraryApi.saveReview(libraryEntry.id, content, rating);
    setUserReview({ content, rating });
    setReviewModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#0f1117'}}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
          <p style={{color:'#8b8fa8'}}>Loading the book…</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{backgroundColor:'#0f1117'}}>
        <div className="rounded-2xl border px-8 py-10 text-center max-w-sm w-full" style={{backgroundColor:'rgba(239,68,68,0.05)', borderColor:'rgba(239,68,68,0.2)'}}>
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" style={{color:'#ef4444'}} />
          <p className="text-sm font-medium mb-1" style={{color:'#f0f0f5'}}>
            {error ? 'Couldn\'t load book details' : 'Book not found'}
          </p>
          <p className="text-xs mb-5" style={{color:'#8b8fa8'}}>{error || 'This book could not be found.'}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {error && (
              <button onClick={fetchBook} className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90" style={{backgroundColor:'#6366f1'}}>
                Try Again
              </button>
            )}
            <Link href="/search" className="px-5 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-[#1a1d27]" style={{borderColor:'#2a2d3e', color:'#8b8fa8'}}>
              Back to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stars         = book.averageRating ? Math.round(book.averageRating) : 0;
  const isInLibrary   = !!libraryEntry;
  const isFinished    = libraryEntry?.status === 'FINISHED';
  const statusLabel   = { WISHLIST: 'On Wishlist', READING: 'Currently Reading', FINISHED: 'Finished', DNF: 'Did Not Finish' };

  return (
    <div className="min-h-screen pb-16" style={{backgroundColor:'#0f1117'}}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-indigo-400"
          style={{color:'#8b8fa8'}}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Two column layout */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* Left column: cover + metadata */}
          <div className="flex-shrink-0 md:w-64">
            <div className="w-full max-w-[200px] mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl border mb-6" style={{borderColor:'#2a2d3e', aspectRatio:'2/3', position:'relative'}}>
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{backgroundColor:'#1a1d27'}}>
                  <BookOpen className="w-16 h-16" style={{color:'#2a2d3e'}} />
                </div>
              )}
            </div>

            {/* Metadata boxes */}
            <div className="space-y-2">
              {book.publishedDate && (
                <div className="rounded-xl border p-3 flex items-center gap-2.5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{color:'#4a4d62'}} />
                  <div>
                    <p className="text-xs" style={{color:'#4a4d62'}}>Published</p>
                    <p className="text-sm font-medium" style={{color:'#f0f0f5'}}>{book.publishedDate}</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border p-3 flex items-center gap-2.5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
                <FileText className="w-4 h-4 flex-shrink-0" style={{color:'#4a4d62'}} />
                <div>
                  <p className="text-xs" style={{color:'#4a4d62'}}>Pages</p>
                  {book.pageCount
                    ? <p className="text-sm font-medium" style={{color:'#f0f0f5'}}>{book.pageCount}</p>
                    : <p className="text-sm" style={{color:'#4a4d62'}}>No Page Count Available</p>
                  }
                </div>
              </div>
              {book.isbn && (
                <div className="rounded-xl border p-3 flex items-center gap-2.5" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
                  <Hash className="w-4 h-4 flex-shrink-0" style={{color:'#4a4d62'}} />
                  <div>
                    <p className="text-xs" style={{color:'#4a4d62'}}>ISBN</p>
                    <p className="text-sm font-medium" style={{color:'#f0f0f5'}}>{book.isbn}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column: details */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold leading-tight mb-2" style={{color:'#f0f0f5'}}>{book.title}</h1>
            <p className="text-xl mb-4" style={{color:'#8b8fa8'}}>{book.author}</p>

            {/* Star rating */}
            {book.averageRating && (
              <div className="flex items-center gap-2 mb-5">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-5 h-5 ${s <= stars ? 'text-amber-400 fill-amber-400' : ''}`} style={s > stars ? {color:'#2a2d3e'} : {}} />
                  ))}
                </div>
                <span className="text-sm" style={{color:'#8b8fa8'}}>{book.averageRating.toFixed(1)}/5</span>
              </div>
            )}

            {/* Genre pills */}
            {book.genres && book.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {book.genres.map((genre) => (
                  <span key={genre} className="text-sm px-3 py-1 rounded-full border" style={{backgroundColor:'rgba(99,102,241,0.1)', color:'#818cf8', borderColor:'rgba(99,102,241,0.3)'}}>
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{color:'#4a4d62'}}>About This Book</h2>
                <p className="leading-relaxed text-sm" style={{color:'#8b8fa8'}}>{book.description}</p>
              </div>
            )}

            {/* Library status badge */}
            {isInLibrary && libraryEntry?.status && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-3 py-1 rounded-full font-medium border" style={{
                  backgroundColor: isFinished ? 'rgba(74,222,128,0.1)' : 'rgba(99,102,241,0.1)',
                  borderColor:     isFinished ? 'rgba(74,222,128,0.3)' : 'rgba(99,102,241,0.3)',
                  color:           isFinished ? '#4ade80'               : '#818cf8',
                }}>
                  {statusLabel[libraryEntry.status] || libraryEntry.status}
                </span>
                {libraryEntry.currentPage && book.pageCount && (
                  <span className="text-xs" style={{color:'#6b7280'}}>
                    Page {libraryEntry.currentPage} / {book.pageCount} ({Math.round((libraryEntry.currentPage / book.pageCount) * 100)}%)
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap mb-8">
              <button
                onClick={handleAddToLibrary}
                disabled={isInLibrary || addingToLibrary}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${isInLibrary ? 'border cursor-default' : 'bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-60'}`}
                style={isInLibrary ? {backgroundColor:'rgba(34,197,94,0.1)', borderColor:'rgba(34,197,94,0.3)', color:'#22c55e'} : {}}
              >
                {addingToLibrary ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isInLibrary ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isInLibrary ? 'In Library' : 'Add to Library'}
              </button>

              <button
                onClick={() => setShowSources(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all border hover:bg-[#1a1d27]"
                style={{backgroundColor:'transparent', borderColor:'#2a2d3e', color:'#8b8fa8'}}
              >
                <ShoppingBag className="w-4 h-4" />
                Find &amp; Buy
              </button>
            </div>

            {/* User's review section */}
            {isInLibrary && (
              <div className="rounded-2xl border p-5 mb-8" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Your Review</h2>
                  {isFinished && (
                    <button
                      onClick={() => setReviewModal(true)}
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-indigo-300"
                      style={{color:'#818cf8'}}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {userReview ? 'Edit' : 'Write Review'}
                    </button>
                  )}
                </div>
                {userReview ? (
                  <div>
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= userReview.rating ? 'text-amber-400 fill-amber-400' : 'text-[#2a2d3e]'}`} />
                      ))}
                      <span className="text-xs ml-2" style={{color:'#6b7280'}}>{userReview.rating}/5</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{color:'#8b8fa8'}}>{userReview.content}</p>
                  </div>
                ) : isFinished ? (
                  <p className="text-sm" style={{color:'#4a4d62'}}>
                    You haven&apos;t reviewed this book yet.{' '}
                    <button onClick={() => setReviewModal(true)} className="text-indigo-400 hover:text-indigo-300">Write one now →</button>
                  </p>
                ) : (
                  <p className="text-sm" style={{color:'#4a4d62'}}>Mark this book as Finished in your library to write a review.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Similar books section */}
        {(similarLoading || similar.length > 0) && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4" style={{color:'#818cf8'}} />
              <h2 className="text-base font-bold tracking-tight" style={{color:'#f0f0f5'}}>More by {book.author}</h2>
            </div>
            {similarLoading ? (
              <div className="flex items-center gap-2" style={{color:'#4a4d62'}}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Finding {book.author}&apos;s other works…</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {similar.map((rec, i) => (
                  <Link
                    key={rec.googleBooksId || i}
                    href={rec.googleBooksId ? `/book/${rec.googleBooksId}` : '#'}
                    className="group rounded-2xl border overflow-hidden transition-all hover:border-indigo-500/40"
                    style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}
                  >
                    <div className="aspect-[2/3] relative w-full" style={{backgroundColor:'#2a2d3e'}}>
                      {rec.coverUrl ? (
                        <Image src={rec.coverUrl} alt={rec.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-8 h-8" style={{color:'#4a4d62'}} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium line-clamp-2 group-hover:text-indigo-400 transition-colors" style={{color:'#f0f0f5'}}>{rec.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{color:'#6b7280'}}>{rec.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSources && book && (
        <BookSourcesModal book={book} onClose={() => setShowSources(false)} />
      )}

      {reviewModal && libraryEntry && (
        <ReviewModal
          isOpen={reviewModal}
          onClose={() => setReviewModal(false)}
          onSave={handleSaveReview}
          existingReview={userReview}
        />
      )}
    </div>
  );
}
