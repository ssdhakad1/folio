'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Library, Trash2, BookOpen, Loader2, Star, Eye, Pencil,
  ArrowUp, ArrowDown, ArrowUpDown, Search, StickyNote, X,
  Sparkles, TrendingUp, Trophy, Download, Upload, XCircle,
} from 'lucide-react';
import { library as libraryApi } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import ReviewModal from '../../../components/ReviewModal';
import ReviewViewModal from '../../../components/ReviewViewModal';
import PageHint from '../../../components/PageHint';

const STATUS_LABELS = {
  WISHLIST: 'Wishlist',
  READING: 'Currently Reading',
  FINISHED: 'Finished Reading',
  DNF: 'Did Not Finish',
};

const FILTERS = [
  { id: 'ALL',      label: 'All'      },
  { id: 'WISHLIST', label: 'Wishlist' },
  { id: 'READING',  label: 'Reading'  },
  { id: 'FINISHED', label: 'Finished' },
  { id: 'DNF',      label: 'DNF'      },
];

const STATUS_ORDER = { WISHLIST: 0, READING: 1, FINISHED: 2, DNF: 3 };

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportLibraryCSV(entries, reviews) {
  const escape = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  const fmt    = (d) => d ? new Date(d).toLocaleDateString('en-US') : '';
  const header = [
    'Title', 'Author', 'Status',
    'Rating', 'Review', 'Notes',
    'Date Added', 'Date Started', 'Date Finished',
    'Current Page', 'Pages', 'Published Year',
    'ISBN', 'OL Rating', 'Genres',
  ].join(',');
  const rows = entries.map((e) => {
    const r = reviews[e.id];
    return [
      escape(e.book?.title),
      escape(e.book?.author),
      e.status,
      r?.rating                              || '',
      escape(r?.content),
      escape(e.notes),
      fmt(e.addedAt),
      fmt(e.startedAt),
      fmt(e.finishedAt),
      e.currentPage                          != null ? e.currentPage : '',
      e.book?.pageCount                      || '',
      e.book?.publishedDate                  || '',
      e.book?.isbn                           || '',
      e.book?.averageRating                  != null ? e.book.averageRating : '',
      escape((e.book?.genres || []).join(', ')),
    ].join(',');
  });
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `my-library-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Goodreads CSV parser ──────────────────────────────────────────────────────

function parseGoodreadsCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  // Parse CSV respecting quoted fields
  const parseRow = (line) => {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        fields.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    return fields;
  };
  const headers = parseRow(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name) => headers.findIndex((h) => h.includes(name));
  const iTitle     = idx('title');
  const iAuthor    = idx('author');
  const iIsbn      = headers.findIndex((h) => h === 'isbn13' || h === 'isbn');
  const iRating    = idx('my rating');
  const iPages     = idx('number of pages');
  const iShelf     = idx('exclusive shelf');
  const iReview    = idx('my review');
  const iDateRead  = idx('date read');

  const shelfMap = { read: 'FINISHED', 'currently-reading': 'READING', 'to-read': 'WISHLIST' };

  return lines.slice(1).map((line) => {
    const f = parseRow(line);
    const shelf  = f[iShelf]?.trim()  || 'to-read';
    const status = shelfMap[shelf] || 'WISHLIST';
    const rating = parseInt(f[iRating], 10) || 0;
    return {
      title:     f[iTitle]?.trim()   || '',
      author:    f[iAuthor]?.trim()  || '',
      isbn:      f[iIsbn]?.trim().replace(/[="]/g, '') || null,
      pageCount: parseInt(f[iPages], 10) || null,
      status,
      rating:    rating > 0 && rating <= 5 ? rating : null,
      review:    f[iReview]?.trim() || null,
      finishedAt: status === 'FINISHED' && f[iDateRead]?.trim() ? f[iDateRead].trim() : null,
    };
  }).filter((b) => b.title);
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StarDisplay({ rating, size = 'sm' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-[#2a2d3e]'}`} />
      ))}
    </div>
  );
}

function SortIcon({ column, sortConfig }) {
  if (sortConfig.key !== column) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40 inline" />;
  return sortConfig.dir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 inline" />
    : <ArrowDown className="w-3.5 h-3.5 ml-1 inline" />;
}

// ── Notes Modal ───────────────────────────────────────────────────────────────

function NotesModal({ isOpen, onClose, onSave, currentNotes, bookTitle }) {
  const [notes, setNotes] = useState(currentNotes || '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setNotes(currentNotes || '');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, currentNotes]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)'}}>
      <div className="rounded-2xl border w-full max-w-md" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'#2a2d3e'}}>
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4" style={{color:'#818cf8'}} />
            <h3 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Notes</h3>
          </div>
          {bookTitle && (
            <p className="text-xs truncate max-w-[180px]" style={{color:'#6b7280'}}>{bookTitle}</p>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[#2a2d3e]"
            style={{color:'#4a4d62'}}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down your thoughts, memorable quotes, or anything about this book…"
            rows={6}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-none transition-all focus:border-indigo-500 leading-relaxed"
            style={{backgroundColor:'#0f1117', borderColor:'#2a2d3e', color:'#f0f0f5'}}
          />
          <p className="text-xs mt-1.5 text-right" style={{color:'#4a4d62'}}>{notes.length} characters</p>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[#0f1117]"
            style={{borderColor:'#2a2d3e', color:'#8b8fa8', backgroundColor:'transparent'}}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{backgroundColor:'#6366f1'}}
          >
            {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Remove Confirm Modal ──────────────────────────────────────────────────────

function RemoveConfirmModal({ isOpen, onClose, onConfirm, loading, bookTitle }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)'}}>
      <div className="rounded-2xl border p-6 max-w-sm w-full" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:'rgba(239,68,68,0.12)'}}>
            <Trash2 className="w-5 h-5" style={{color:'#ef4444'}} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{color:'#f0f0f5'}}>Remove from Library</h3>
            {bookTitle && <p className="text-xs truncate max-w-[200px]" style={{color:'#6b7280'}}>{bookTitle}</p>}
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{color:'#8b8fa8'}}>
          This will remove the book and any associated review. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[#0f1117] disabled:opacity-50"
            style={{borderColor:'#2a2d3e', color:'#8b8fa8', backgroundColor:'transparent'}}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{backgroundColor:'#ef4444'}}
          >
            {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Removing…</> : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Progress cell ─────────────────────────────────────────────────────────────

function ProgressCell({ entry, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.currentPage != null ? String(entry.currentPage) : '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const pageCount = entry.book?.pageCount || null;
  const currentPage = entry.currentPage;
  const pct = pageCount && currentPage ? Math.min(100, Math.round((currentPage / pageCount) * 100)) : null;

  const commit = async () => {
    const n = parseInt(value, 10);
    const page = isNaN(n) || n < 0 ? null : n;
    if (page === currentPage) { setEditing(false); return; }
    setSaving(true);
    try {
      await onUpdate(entry.id, page);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(currentPage != null ? String(currentPage) : ''); setEditing(false); } }}
          min="0"
          max={pageCount || undefined}
          autoFocus
          className="w-20 rounded-lg border px-2 py-1 text-xs outline-none focus:border-indigo-500"
          style={{backgroundColor:'#0f1117', borderColor:'#2a2d3e', color:'#f0f0f5'}}
          placeholder="page"
        />
        {pageCount && <span className="text-xs" style={{color:'#4a4d62'}}>/ {pageCount}</span>}
        {saving && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(currentPage != null ? String(currentPage) : ''); setEditing(true); setTimeout(() => inputRef.current?.select(), 20); }}
      className="group text-left"
      title="Click to update page"
    >
      {currentPage != null ? (
        <div className="space-y-1">
          <p className="text-xs" style={{color:'#8b8fa8'}}>
            Page <span style={{color:'#f0f0f5'}}>{currentPage}</span>
            {pageCount && <span style={{color:'#4a4d62'}}> / {pageCount}</span>}
          </p>
          {pct !== null && (
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{backgroundColor:'#2a2d3e'}}>
              <div className="h-full rounded-full" style={{width:`${pct}%`, backgroundColor:'#6366f1'}} />
            </div>
          )}
          {pct !== null && <p className="text-xs" style={{color:'#6b7280'}}>{pct}%</p>}
        </div>
      ) : (
        <span className="text-xs group-hover:text-indigo-400 transition-colors" style={{color:'#4a4d62'}}>
          + Add page
        </span>
      )}
    </button>
  );
}

// ── First Finish modal ────────────────────────────────────────────────────────

function FirstFinishModal({ isOpen, onClose, onWriteReview }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)'}}>
      <div className="rounded-2xl border p-8 max-w-sm w-full text-center" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{backgroundColor:'rgba(74,222,128,0.1)'}}>
          <Trophy className="w-8 h-8" style={{color:'#4ade80'}} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{color:'#f0f0f5'}}>First book finished! 🎉</h2>
        <p className="text-sm leading-relaxed mb-6" style={{color:'#8b8fa8'}}>
          Amazing work! Why not jot down your thoughts while the story is fresh?
        </p>
        <div className="space-y-2">
          <button
            onClick={onWriteReview}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{backgroundColor:'#6366f1'}}
          >
            <Star className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Write a Review
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm transition-all hover:bg-[#2a2d3e]"
            style={{color:'#8b8fa8', backgroundColor:'transparent'}}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Goodreads Import Modal ────────────────────────────────────────────────────

function GoodreadsImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [books, setBooks] = useState([]);
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isOpen) { setFile(null); setBooks([]); setStep('upload'); setProgress({ done: 0, total: 0, failed: 0 }); }
  }, [isOpen]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseGoodreadsCSV(ev.target.result);
      setBooks(parsed);
      setStep('preview');
    };
    reader.readAsText(f, 'UTF-8');
  };

  const handleImport = async () => {
    setStep('importing');
    let done = 0; let failed = 0;
    setProgress({ done: 0, total: books.length, failed: 0 });
    for (const b of books) {
      try {
        const entry = await libraryApi.addToLibrary({
          title: b.title, author: b.author, isbn: b.isbn,
          pageCount: b.pageCount, status: b.status,
        }).catch(async (err) => {
          if (err.message?.includes('already')) return null;
          throw err;
        });
        // Save review if rating > 0 and entry was created
        if (entry?.entry?.id && b.rating) {
          await libraryApi.saveReview(entry.entry.id, b.review || `Imported from Goodreads (${b.rating}★)`, b.rating).catch(() => {});
        }
        done++;
      } catch { failed++; }
      setProgress({ done: done + failed, total: books.length, failed });
    }
    setProgress({ done, total: books.length, failed });
    setStep('done');
    onImport();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)'}}>
      <div className="rounded-2xl border w-full max-w-lg" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'#2a2d3e'}}>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" style={{color:'#818cf8'}} />
            <h3 className="text-sm font-semibold" style={{color:'#f0f0f5'}}>Import from Goodreads</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-[#2a2d3e]" style={{color:'#4a4d62'}}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <div>
              <p className="text-sm leading-relaxed mb-4" style={{color:'#8b8fa8'}}>
                Export your library from Goodreads: <span style={{color:'#f0f0f5'}}>My Books → Import/Export → Export Library</span>. Then upload the CSV file here.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all hover:border-indigo-500/50"
                style={{borderColor:'#2a2d3e'}}
              >
                <Upload className="w-8 h-8" style={{color:'#4a4d62'}} />
                <span className="text-sm font-medium" style={{color:'#8b8fa8'}}>Click to select your Goodreads CSV</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p className="text-sm mb-4" style={{color:'#8b8fa8'}}>
                Found <span style={{color:'#f0f0f5'}}>{books.length} books</span> in your Goodreads export.
              </p>
              <div className="rounded-xl border overflow-hidden mb-4" style={{borderColor:'#2a2d3e'}}>
                <div className="max-h-52 overflow-y-auto">
                  {books.slice(0, 10).map((b, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0" style={{borderColor:'#2a2d3e'}}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{color:'#f0f0f5'}}>{b.title}</p>
                        <p className="text-xs truncate" style={{color:'#6b7280'}}>{b.author}</p>
                      </div>
                      <span className="text-xs ml-3 flex-shrink-0 px-2 py-0.5 rounded-full" style={{
                        backgroundColor: b.status === 'FINISHED' ? 'rgba(74,222,128,0.1)' : b.status === 'READING' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)',
                        color: b.status === 'FINISHED' ? '#4ade80' : b.status === 'READING' ? '#818cf8' : '#f59e0b',
                      }}>{STATUS_LABELS[b.status]}</span>
                    </div>
                  ))}
                  {books.length > 10 && (
                    <div className="px-4 py-2.5 text-center text-xs" style={{color:'#4a4d62'}}>
                      + {books.length - 10} more books
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs mb-4" style={{color:'#4a4d62'}}>Books already in your library will be skipped. Ratings will be imported where available.</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[#0f1117]" style={{borderColor:'#2a2d3e', color:'#8b8fa8', backgroundColor:'transparent'}}>
                  Cancel
                </button>
                <button onClick={handleImport} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90" style={{backgroundColor:'#6366f1'}}>
                  Import {books.length} Books
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium mb-1" style={{color:'#f0f0f5'}}>Importing your library…</p>
              <p className="text-xs" style={{color:'#8b8fa8'}}>{progress.done} of {progress.total} books processed</p>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{backgroundColor:'#2a2d3e'}}>
                <div className="h-full rounded-full transition-all duration-300" style={{width:`${progress.total ? (progress.done / progress.total) * 100 : 0}%`, backgroundColor:'#6366f1'}} />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{backgroundColor:'rgba(74,222,128,0.1)'}}>
                <Library className="w-7 h-7" style={{color:'#4ade80'}} />
              </div>
              <p className="text-base font-bold mb-1" style={{color:'#f0f0f5'}}>Import complete!</p>
              <p className="text-sm mb-1" style={{color:'#8b8fa8'}}>
                <span style={{color:'#4ade80'}}>{progress.done}</span> books added to your library.
              </p>
              {progress.failed > 0 && (
                <p className="text-xs mb-4" style={{color:'#f59e0b'}}>{progress.failed} books couldn&apos;t be imported.</p>
              )}
              <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90" style={{backgroundColor:'#6366f1'}}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state onboarding ────────────────────────────────────────────────────

function LibraryOnboarding({ onImport }) {
  return (
    <div className="py-16 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{backgroundColor:'rgba(99,102,241,0.1)'}}>
        <Library className="w-8 h-8" style={{color:'rgba(99,102,241,0.6)'}} />
      </div>
      <h2 className="text-lg font-bold mb-2" style={{color:'#f0f0f5'}}>Your Library is Empty</h2>
      <p className="text-sm leading-relaxed mb-8" style={{color:'#8b8fa8'}}>
        Start building your reading list. Track what you&apos;ve read, what you&apos;re reading, and what&apos;s up next — all in one place.
      </p>
      <button
        onClick={onImport}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-[#1a1d27] mb-8"
        style={{borderColor:'#2a2d3e', color:'#818cf8', backgroundColor:'transparent'}}
      >
        <Upload className="w-4 h-4" />
        Already on Goodreads? Import your library
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Search,
            color: '#818cf8',
            bg: 'rgba(99,102,241,0.1)',
            title: 'Search Books',
            desc: 'Find any book by title, author, or ISBN.',
            href: '/search',
          },
          {
            icon: TrendingUp,
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.1)',
            title: 'Browse Trending',
            desc: 'Discover today\'s most popular reads.',
            href: '/trending',
          },
          {
            icon: Sparkles,
            color: '#818cf8',
            bg: 'rgba(99,102,241,0.1)',
            title: 'Get Recommendations',
            desc: 'Find books matched to your taste.',
            href: '/recommendations',
          },
        ].map(({ icon: Icon, color, bg, title, desc, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border p-5 text-left transition-all hover:border-indigo-500/40 hover:bg-[#1a1d27]"
            style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{backgroundColor: bg}}>
              <Icon className="w-4.5 h-4.5" style={{color}} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{color:'#f0f0f5'}}>{title}</p>
            <p className="text-xs leading-relaxed" style={{color:'#8b8fa8'}}>{desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs" style={{color:'#4a4d62'}}>
        Once you add a book, it appears here for you to track and review.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { showToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingEntryId, setUpdatingEntryId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });

  // Modals
  const [editModal, setEditModal]           = useState({ open: false, entryId: null });
  const [viewModal, setViewModal]           = useState({ open: false, entryId: null });
  const [notesModal, setNotesModal]         = useState({ open: false, entryId: null });
  const [removeModal, setRemoveModal]       = useState({ open: false, entryId: null, loading: false });
  const [firstFinishModal, setFirstFinishModal] = useState({ open: false, entryId: null });
  const [importModal, setImportModal]       = useState(false);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await libraryApi.getLibrary();
      const fetchedEntries = data.entries || [];
      setEntries(fetchedEntries);

      const finishedEntries = fetchedEntries.filter((e) => e.status === 'FINISHED');
      const reviewResults = await Promise.allSettled(
        finishedEntries.map((e) => libraryApi.getReview(e.id).then((r) => ({ id: e.id, review: r.review })))
      );
      const reviewMap = {};
      reviewResults.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.review) {
          reviewMap[r.value.id] = r.value.review;
        }
      });
      setReviews(reviewMap);
    } catch (err) {
      setError(err.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const handleStatusChange = async (entryId, newStatus) => {
    setUpdatingEntryId(entryId);
    try {
      const wasFirstFinish =
        newStatus === 'FINISHED' &&
        entries.filter(e => e.status === 'FINISHED').length === 0;

      const data = await libraryApi.updateLibraryEntry(entryId, newStatus);
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...data.entry } : e)));

      if (newStatus === 'FINISHED') {
        try {
          const r = await libraryApi.getReview(entryId);
          if (r.review) setReviews((prev) => ({ ...prev, [entryId]: r.review }));
        } catch {}

        // Milestone: first book ever finished
        let alreadySeen = false;
        try { alreadySeen = localStorage.getItem('folio_first_finish_seen') === '1'; } catch {}
        if (wasFirstFinish && !alreadySeen) {
          try { localStorage.setItem('folio_first_finish_seen', '1'); } catch {}
          setFirstFinishModal({ open: true, entryId });
        }
      }

      if (newStatus !== 'FINISHED') {
        setReviews((prev) => { const next = { ...prev }; delete next[entryId]; return next; });
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status.', 'error');
    } finally {
      setUpdatingEntryId(null);
    }
  };

  const handleProgress = async (entryId, currentPage) => {
    try {
      const data = await libraryApi.updateProgress(entryId, currentPage);
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...data.entry } : e)));
    } catch (err) {
      showToast(err.message || 'Failed to update progress.', 'error');
    }
  };

  const handleSaveNotes = async (notes) => {
    try {
      const data = await libraryApi.updateNotes(notesModal.entryId, notes);
      setEntries((prev) => prev.map((e) => (e.id === notesModal.entryId ? { ...e, ...data.entry } : e)));
      setNotesModal({ open: false, entryId: null });
      showToast('Notes saved.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save notes.', 'error');
      throw err;
    }
  };

  const handleRemoveClick = (entryId) => {
    setRemoveModal({ open: true, entryId, loading: false });
  };

  const handleRemoveConfirm = async () => {
    setRemoveModal((prev) => ({ ...prev, loading: true }));
    try {
      await libraryApi.removeFromLibrary(removeModal.entryId);
      setEntries((prev) => prev.filter((e) => e.id !== removeModal.entryId));
      setReviews((prev) => { const next = { ...prev }; delete next[removeModal.entryId]; return next; });
      setRemoveModal({ open: false, entryId: null, loading: false });
      showToast('Book removed from library.', 'success');
    } catch (err) {
      setRemoveModal((prev) => ({ ...prev, loading: false }));
      showToast(err.message || 'Failed to remove book.', 'error');
    }
  };

  const handleSaveReview = async (content, rating) => {
    await libraryApi.saveReview(editModal.entryId, content, rating);
    const newReview = { content, rating };
    setReviews((prev) => ({ ...prev, [editModal.entryId]: newReview }));
    setEditModal({ open: false, entryId: null });
    showToast('Review saved!', 'success');
    try { localStorage.setItem('folio_first_review_done', '1'); } catch {}
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  };

  // Filter + search + sort
  const baseFiltered = filter === 'ALL' ? entries : entries.filter((e) => e.status === filter);

  const searchFiltered = searchQuery.trim()
    ? baseFiltered.filter((e) => {
        const q = searchQuery.toLowerCase();
        return (
          e.book?.title?.toLowerCase().includes(q) ||
          e.book?.author?.toLowerCase().includes(q) ||
          (e.book?.genres || []).some((g) => g.toLowerCase().includes(q))
        );
      })
    : baseFiltered;

  const filteredEntries = [...searchFiltered].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal, bVal;
    if (sortConfig.key === 'title')   { aVal = (a.book.title  || '').toLowerCase(); bVal = (b.book.title  || '').toLowerCase(); }
    else if (sortConfig.key === 'author')  { aVal = (a.book.author || '').toLowerCase(); bVal = (b.book.author || '').toLowerCase(); }
    else if (sortConfig.key === 'status')  { aVal = STATUS_ORDER[a.status] ?? 0; bVal = STATUS_ORDER[b.status] ?? 0; }
    else if (sortConfig.key === 'addedAt') { aVal = new Date(a.addedAt).getTime(); bVal = new Date(b.addedAt).getTime(); }
    else return 0;
    if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const counts = {
    ALL:      entries.length,
    WISHLIST: entries.filter((e) => e.status === 'WISHLIST').length,
    READING:  entries.filter((e) => e.status === 'READING').length,
    FINISHED: entries.filter((e) => e.status === 'FINISHED').length,
    DNF:      entries.filter((e) => e.status === 'DNF').length,
  };

  const viewingEntry  = entries.find((e) => e.id === viewModal.entryId);
  const viewingReview = reviews[viewModal.entryId];
  const editingReview = reviews[editModal.entryId];
  const notesEntry    = entries.find((e) => e.id === notesModal.entryId);
  const removeEntry   = entries.find((e) => e.id === removeModal.entryId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#0f1117'}}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
          <p style={{color:'#8b8fa8'}}>Loading your library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{backgroundColor:'#0f1117'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Library className="w-6 h-6" style={{color:'#4ade80'}} />
              <h1 className="text-2xl font-bold tracking-tight" style={{color:'#f0f0f5'}}>My Library</h1>
            </div>
            <p className="text-sm ml-9" style={{color:'#8b8fa8'}}>{entries.length} book{entries.length !== 1 ? 's' : ''} in your collection</p>
          </div>
          {entries.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setImportModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-[#1a1d27]"
                style={{borderColor:'#2a2d3e', color:'#8b8fa8', backgroundColor:'transparent'}}
                title="Import from Goodreads"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => exportLibraryCSV(entries, reviews)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-[#1a1d27]"
                style={{borderColor:'#2a2d3e', color:'#8b8fa8', backgroundColor:'transparent'}}
                title="Export library as CSV"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          )}
        </div>

        <PageHint
          pageKey="library"
          message="Mark books as Finished to unlock reviews and personalised recommendations. Use the Import button to bring in your Goodreads library, or Export to download a full CSV of your collection."
          linkText="Discover books →"
          linkHref="/recommendations"
        />

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border p-4" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
            <p className="text-xs font-medium mb-1" style={{color:'#4a4d62'}}>WISHLIST</p>
            <p className="text-2xl font-bold" style={{color:'#f0f0f5'}}>{counts.WISHLIST}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
            <p className="text-xs font-medium mb-1" style={{color:'#4a4d62'}}>READING</p>
            <p className="text-2xl font-bold text-indigo-400">{counts.READING}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
            <p className="text-xs font-medium mb-1" style={{color:'#4a4d62'}}>FINISHED</p>
            <p className="text-2xl font-bold text-green-400">{counts.FINISHED}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
            <p className="text-xs font-medium mb-1" style={{color:'#4a4d62'}}>DNF</p>
            <p className="text-2xl font-bold" style={{color:'#6b7280'}}>{counts.DNF}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border px-6 py-10 text-center" style={{backgroundColor:'rgba(239,68,68,0.05)', borderColor:'rgba(239,68,68,0.2)'}}>
            <Library className="w-8 h-8 mx-auto mb-3 opacity-40" style={{color:'#ef4444'}} />
            <p className="text-sm font-medium mb-1" style={{color:'#f0f0f5'}}>Couldn&apos;t load your library</p>
            <p className="text-xs mb-5" style={{color:'#8b8fa8'}}>This usually resolves itself — give it another try.</p>
            <button
              onClick={fetchLibrary}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{backgroundColor:'#6366f1'}}
            >
              Try Again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <LibraryOnboarding onImport={() => setImportModal(true)} />
        ) : (
          <>
            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:'#4a4d62'}} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, author, genre…"
                  className="w-full border rounded-xl pl-11 pr-10 py-3 text-sm outline-none transition-all focus:border-indigo-500"
                  style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e', color:'#f0f0f5'}}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[#8b8fa8]"
                    style={{color:'#4a4d62'}}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 p-1.5 rounded-2xl border flex-wrap w-fit" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-medium text-sm transition-all ${
                      filter === f.id ? 'bg-indigo-500 text-white shadow-sm' : 'hover:bg-[#2a2d3e]'
                    }`}
                    style={filter === f.id ? {} : {color:'#8b8fa8'}}
                  >
                    {f.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.id ? 'bg-indigo-400/30' : ''}`}
                      style={filter === f.id ? {} : {backgroundColor:'#2a2d3e', color:'#8b8fa8'}}>
                      {counts[f.id]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results count when searching */}
            {searchQuery.trim() && (
              <p className="text-xs mb-4" style={{color:'#6b7280'}}>
                {filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
              </p>
            )}

            {/* Table or empty state */}
            {filteredEntries.length === 0 ? (
              <div className="text-center py-20" style={{color:'#4a4d62'}}>
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg" style={{color:'#8b8fa8'}}>
                  {searchQuery.trim()
                    ? `No Books Matching "${searchQuery}"`
                    : `No Books in ${STATUS_LABELS[filter] || filter}`}
                </p>
                {!searchQuery.trim() && (
                  <p className="text-sm mt-2" style={{color:'#4a4d62'}}>
                    <Link href="/search" className="text-indigo-400 hover:text-indigo-300">Search for books</Link> or browse{' '}
                    <Link href="/trending" className="text-indigo-400 hover:text-indigo-300">trending titles</Link> to add some.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{borderColor:'#2a2d3e', backgroundColor:'rgba(42,45,62,0.4)'}}>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 w-16" style={{color:'#4a4d62'}}>Cover</th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 cursor-pointer transition-colors select-none hover:text-[#f0f0f5]" style={{color:'#4a4d62'}} onClick={() => handleSort('title')}>
                          Book <SortIcon column="title" sortConfig={sortConfig} />
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 w-36 cursor-pointer transition-colors select-none hover:text-[#f0f0f5]" style={{color:'#4a4d62'}} onClick={() => handleSort('author')}>
                          Author <SortIcon column="author" sortConfig={sortConfig} />
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 w-52 cursor-pointer transition-colors select-none hover:text-[#f0f0f5]" style={{color:'#4a4d62'}} onClick={() => handleSort('status')}>
                          Status <SortIcon column="status" sortConfig={sortConfig} />
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 w-32 hidden lg:table-cell" style={{color:'#4a4d62'}}>Progress</th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 w-32 cursor-pointer transition-colors select-none hover:text-[#f0f0f5] hidden md:table-cell" style={{color:'#4a4d62'}} onClick={() => handleSort('addedAt')}>
                          Added <SortIcon column="addedAt" sortConfig={sortConfig} />
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 w-48" style={{color:'#4a4d62'}}>Review</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3 w-20" style={{color:'#4a4d62'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => {
                        const review    = reviews[entry.id];
                        const hasReview = !!review;
                        const hasNotes  = !!entry.notes?.trim();

                        return (
                          <tr key={entry.id} className="border-b transition-colors hover:bg-[#2a2d3e]/20" style={{borderColor:'rgba(42,45,62,0.5)'}}>

                            {/* Cover */}
                            <td className="px-4 py-3">
                              <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0" style={{backgroundColor:'#2a2d3e'}}>
                                {entry.book.coverUrl ? (
                                  <Image src={entry.book.coverUrl} alt={entry.book.title} width={40} height={56} className="w-full h-full object-cover" unoptimized />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="w-5 h-5" style={{color:'#4a4d62'}} />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Title */}
                            <td className="px-4 py-3">
                              {entry.book.googleBooksId ? (
                                <Link href={`/book/${entry.book.googleBooksId}`} className="font-medium hover:text-indigo-400 transition-colors line-clamp-2" style={{color:'#f0f0f5'}}>
                                  {entry.book.title}
                                </Link>
                              ) : (
                                <span className="font-medium line-clamp-2" style={{color:'#f0f0f5'}}>{entry.book.title}</span>
                              )}
                              {hasNotes && (
                                <span className="inline-flex items-center gap-0.5 text-xs mt-0.5" style={{color:'#4a4d62'}}>
                                  <StickyNote className="w-2.5 h-2.5" /> notes
                                </span>
                              )}
                            </td>

                            {/* Author */}
                            <td className="px-4 py-3">
                              <p className="text-sm" style={{color:'#8b8fa8'}}>{entry.book.author}</p>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <select
                                  value={entry.status}
                                  disabled={updatingEntryId === entry.id}
                                  onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                                  className="border text-sm rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-44"
                                  style={{backgroundColor:'#0f1117', borderColor:'#2a2d3e', color:'#f0f0f5', textAlignLast:'center'}}
                                >
                                  <option value="WISHLIST">Wishlist</option>
                                  <option value="READING">Currently Reading</option>
                                  <option value="FINISHED">Finished Reading</option>
                                  <option value="DNF">Did Not Finish</option>
                                </select>
                                {updatingEntryId === entry.id && (
                                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                )}
                              </div>
                            </td>

                            {/* Progress (READING only) */}
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {entry.status === 'READING' ? (
                                <ProgressCell entry={entry} onUpdate={handleProgress} />
                              ) : (
                                <span className="text-xs" style={{color:'#2a2d3e'}}>—</span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3 text-sm hidden md:table-cell" style={{color:'#8b8fa8'}}>
                              {new Date(entry.addedAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                            </td>

                            {/* Review */}
                            <td className="px-4 py-3">
                              {entry.status === 'FINISHED' ? (
                                hasReview ? (
                                  <div className="space-y-1.5">
                                    <StarDisplay rating={review.rating} />
                                    <p className="text-xs line-clamp-1 max-w-[160px]" style={{color:'#8b8fa8'}}>{review.content}</p>
                                    <div className="flex gap-2 mt-1">
                                      <button onClick={() => setViewModal({ open: true, entryId: entry.id })} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                        <Eye className="w-3.5 h-3.5" /> View
                                      </button>
                                      <button onClick={() => setEditModal({ open: true, entryId: entry.id })} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => setEditModal({ open: true, entryId: entry.id })} className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                                    <Star className="w-4 h-4" /> Write Review
                                  </button>
                                )
                              ) : entry.status === 'DNF' ? (
                                <div className="flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{color:'#6b7280'}} />
                                  <span className="text-xs" style={{color:'#6b7280'}}>Did not finish</span>
                                </div>
                              ) : (
                                <span className="text-xs" style={{color:'#4a4d62'}}>Finish this book to write a review</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setNotesModal({ open: true, entryId: entry.id })}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-[#2a2d3e]"
                                  style={{color: hasNotes ? '#818cf8' : '#4a4d62'}}
                                  title={hasNotes ? 'View / Edit Notes' : 'Add Notes'}
                                >
                                  <StickyNote className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveClick(entry.id)}
                                  className="p-1.5 rounded-lg transition-colors hover:text-red-400 hover:bg-red-500/10"
                                  style={{color:'#4a4d62'}}
                                  title="Remove from Library"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Write / Edit Review Modal */}
      <ReviewModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, entryId: null })}
        onSave={handleSaveReview}
        existingReview={editingReview || null}
      />

      {/* View Review Modal */}
      <ReviewViewModal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, entryId: null })}
        onEdit={() => {
          setViewModal({ open: false, entryId: null });
          setEditModal({ open: true, entryId: viewModal.entryId });
        }}
        review={viewingReview || null}
        book={viewingEntry?.book || null}
      />

      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModal.open}
        onClose={() => setNotesModal({ open: false, entryId: null })}
        onSave={handleSaveNotes}
        currentNotes={notesEntry?.notes || ''}
        bookTitle={notesEntry?.book?.title || ''}
      />

      {/* Remove Confirm Modal */}
      <RemoveConfirmModal
        isOpen={removeModal.open}
        onClose={() => setRemoveModal({ open: false, entryId: null, loading: false })}
        onConfirm={handleRemoveConfirm}
        loading={removeModal.loading}
        bookTitle={removeEntry?.book?.title || ''}
      />

      {/* First Finish Celebration Modal */}
      <FirstFinishModal
        isOpen={firstFinishModal.open}
        onClose={() => setFirstFinishModal({ open: false, entryId: null })}
        onWriteReview={() => {
          setFirstFinishModal({ open: false, entryId: null });
          setEditModal({ open: true, entryId: firstFinishModal.entryId });
        }}
      />

      {/* Goodreads Import Modal */}
      <GoodreadsImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImport={() => { setImportModal(false); fetchLibrary(); }}
      />
    </div>
  );
}
