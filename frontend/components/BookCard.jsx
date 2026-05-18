'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookOpen, Star, Plus, Check, ShoppingBag, Sparkles, FileText } from 'lucide-react';
import { library as libraryApi } from '../lib/api';
import { useState } from 'react';
import BookSourcesModal from './BookSourcesModal';

export default function BookCard({ book, isInLibrary = false, onAddToLibrary, tasteMatch = false }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [inLib, setInLib] = useState(isInLibrary);
  const [showSources, setShowSources] = useState(false);

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (inLib || adding) return;
    setAdding(true);
    try {
      if (onAddToLibrary) {
        await onAddToLibrary(book);
      } else {
        await libraryApi.addToLibrary({ ...book, status: 'WISHLIST' });
      }
      setInLib(true);
    } catch (err) {
      console.error('Failed to add to library:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleCardClick = () => {
    if (book.googleBooksId) router.push(`/book/${book.googleBooksId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer group"
      style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full bg-[#0f1117] flex-shrink-0">
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title || 'Book cover'} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-2">
            <BookOpen className="w-10 h-10" style={{color:'#2a2d3e'}} />
            <span className="text-xs text-center font-medium leading-tight" style={{color:'#4a4d62'}}>{book.title}</span>
          </div>
        )}
        {tasteMatch && (
          <div className="absolute top-2 left-0 right-0 flex justify-center">
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{backgroundColor:'rgba(99,102,241,0.92)', color:'#fff', backdropFilter:'blur(4px)'}}
            >
              <Sparkles size={10} />
              Matches your taste
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3.5">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-0.5" style={{color:'#f0f0f5'}}>{book.title}</h3>
        <p className="text-xs mb-2" style={{color:'#8b8fa8'}}>{book.author}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-1.5">
          <Star className={`w-3 h-3 ${book.averageRating ? 'text-amber-400 fill-amber-400' : ''}`} style={book.averageRating ? {} : {color:'#2a2d3e'}} />
          {book.averageRating
            ? <span className="text-xs text-amber-400">{Number(book.averageRating).toFixed(1)}</span>
            : <span className="text-xs" style={{color:'#4a4d62'}}>No rating</span>
          }
        </div>

        {/* Page count */}
        <div className="flex items-center gap-1 mb-2">
          <FileText className="w-3 h-3" style={{color: book.pageCount ? '#6b7280' : '#2a2d3e'}} />
          {book.pageCount
            ? <span className="text-xs" style={{color:'#6b7280'}}>{book.pageCount} pages</span>
            : <span className="text-xs" style={{color:'#4a4d62'}}>No page count</span>
          }
        </div>

        {/* Reason */}
        {book.reason && (
          <p className="text-xs italic line-clamp-2 mb-2" style={{color:'#4a4d62'}}>{book.reason}</p>
        )}

        {/* Genres */}
        {book.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {book.genres.slice(0, 2).map(g => (
              <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{backgroundColor:'#2a2d3e', color:'#8b8fa8'}}>{g}</span>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={inLib || adding}
          className={`w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 mt-auto ${
            inLib
              ? 'border'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          }`}
          style={inLib ? {backgroundColor:'transparent', borderColor:'#2a2d3e', color:'#22c55e'} : {}}
        >
          {inLib ? (
            <><Check className="w-3.5 h-3.5" /> In Library</>
          ) : adding ? (
            'Adding...'
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Add to Library</>
          )}
        </button>

        {/* Find & Buy button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowSources(true); }}
          className="w-full py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 mt-1.5 hover:bg-[#2a2d3e]"
          style={{ color: '#8b8fa8', backgroundColor: 'transparent', border: '1px solid #2a2d3e' }}
        >
          <ShoppingBag className="w-3 h-3" />
          Find &amp; Buy
        </button>
      </div>

      {showSources && (
        <BookSourcesModal book={book} onClose={() => setShowSources(false)} />
      )}
    </div>
  );
}
