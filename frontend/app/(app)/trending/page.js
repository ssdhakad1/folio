'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BookOpen } from 'lucide-react';
import { trending as trendingApi, library as libraryApi } from '../../../lib/api';
import BookCard from '../../../components/BookCard';

function SkeletonCard() {
  return (
    <div className="rounded-2xl border overflow-hidden animate-pulse" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
      <div className="aspect-[2/3] w-full" style={{backgroundColor:'#2a2d3e'}} />
      <div className="p-3.5 space-y-2">
        <div className="h-3 rounded" style={{backgroundColor:'#2a2d3e', width:'80%'}} />
        <div className="h-2.5 rounded" style={{backgroundColor:'#2a2d3e', width:'60%'}} />
        <div className="h-8 rounded-xl mt-3" style={{backgroundColor:'#2a2d3e'}} />
      </div>
    </div>
  );
}

export default function TrendingPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [libraryBookIds, setLibraryBookIds] = useState(new Set());

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trendingData, libraryData] = await Promise.allSettled([
        trendingApi.getTrending(),
        libraryApi.getLibrary(),
      ]);

      if (trendingData.status === 'fulfilled') {
        setBooks(trendingData.value.books || []);
      } else {
        setError('Could not load trending books. Please try again.');
      }

      if (libraryData.status === 'fulfilled') {
        const ids = new Set(
          (libraryData.value.entries || [])
            .map((e) => e.book?.googleBooksId)
            .filter(Boolean)
        );
        setLibraryBookIds(ids);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddToLibrary = async (book) => {
    try {
      await libraryApi.addToLibrary(book);
      if (book.googleBooksId) {
        setLibraryBookIds((prev) => new Set([...prev, book.googleBooksId]));
      }
    } catch (err) {
      if (err.message?.includes('already') && book.googleBooksId) {
        setLibraryBookIds((prev) => new Set([...prev, book.googleBooksId]));
      }
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{backgroundColor:'#0f1117'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-6 h-6" style={{color:'#f59e0b'}} />
            <h1 className="text-2xl font-bold tracking-tight" style={{color:'#f0f0f5'}}>Top 50 Trending</h1>
          </div>
          <p className="text-sm ml-9" style={{color:'#8b8fa8'}}>Updated daily — discover what the reading community is engaging with.</p>
        </div>

        {error && (
          <div className="rounded-2xl border px-6 py-10 text-center" style={{backgroundColor:'rgba(239,68,68,0.05)', borderColor:'rgba(239,68,68,0.2)'}}>
            <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-40" style={{color:'#ef4444'}} />
            <p className="text-sm font-medium mb-1" style={{color:'#f0f0f5'}}>Couldn't load trending books</p>
            <p className="text-xs mb-5" style={{color:'#8b8fa8'}}>This usually resolves itself — give it another try.</p>
            <button
              onClick={fetchData}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{backgroundColor:'#6366f1'}}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Books grid */}
        {!loading && books.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map((book, index) => {
              const rank = book.rank || index + 1;
              return (
                <div key={`${book.googleBooksId || book.title}-${index}`} className="relative">
                  {/* Rank badge */}
                  <div
                    className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={
                      rank === 1 ? {backgroundColor:'#FFD700', color:'#0f1117'} :
                      rank === 2 ? {backgroundColor:'#94a3b8', color:'#0f1117'} :
                      rank === 3 ? {backgroundColor:'#b45309', color:'#fff'} :
                      {backgroundColor:'rgba(99,102,241,0.9)', color:'white'}
                    }
                  >
                    {rank}
                  </div>
                  <BookCard
                    book={book}
                    onAddToLibrary={handleAddToLibrary}
                    isInLibrary={book.googleBooksId ? libraryBookIds.has(book.googleBooksId) : false}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && books.length === 0 && !error && (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" style={{color:'#4a4d62'}} />
            <p className="text-base" style={{color:'#8b8fa8'}}>No Trending Books Available Right Now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
