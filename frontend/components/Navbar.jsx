'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen, LogOut, LayoutDashboard, Library, TrendingUp,
  Search, Sparkles, BarChart2, Menu, X, User, Trash2, AlertTriangle, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { href: '/dashboard',       label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recommendations', label: 'Discover',  icon: Sparkles        },
  { href: '/library',         label: 'Library',   icon: Library         },
  { href: '/stats',           label: 'Stats',     icon: BarChart2       },
  { href: '/trending',        label: 'Trending',  icon: TrendingUp      },
  { href: '/community',       label: 'Community', icon: Users           },
  { href: '/search',          label: 'Search',    icon: Search          },
];

// ── Delete Account Modal ──────────────────────────────────────────────────────

function DeleteAccountModal({ onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{backgroundColor:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)'}}>
      <div className="rounded-2xl border p-6 max-w-sm w-full" style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e'}}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:'rgba(239,68,68,0.12)'}}>
            <AlertTriangle className="w-6 h-6" style={{color:'#ef4444'}} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{color:'#f0f0f5'}}>Delete Account</h3>
            <p className="text-xs" style={{color:'#8b8fa8'}}>This cannot be undone</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{color:'#8b8fa8'}}>
          Your account, entire library, and all reviews will be permanently deleted. This action cannot be reversed.
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
            {loading
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</>
              : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();

  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [signingOut,      setSigningOut]      = useState(false);

  const dropdownRef = useRef(null);

  // Close mobile menu on route change; also clear signing-out overlay
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); setSigningOut(false); }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  const handleSignOut = () => {
    setSigningOut(true);
    // Small delay lets React paint the overlay before navigation starts,
    // which hides the browser's own progress bar.
    setTimeout(() => logout(), 100);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
    } catch {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      {/* Full-page sign-out overlay — covers browser progress bar */}
      {signingOut && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: '#0f1117', zIndex: 9999 }}
        >
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
            <p style={{ color: '#8b8fa8' }}>Signing out…</p>
          </div>
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-40 h-16 border-b" style={{backgroundColor:'rgba(15,17,23,0.95)', backdropFilter:'blur(16px)', borderColor:'#2a2d3e'}}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:'#6366f1'}}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${active ? '' : 'hover:bg-[#1a1d27]'}`}
                  style={{color: active ? '#818cf8' : '#8b8fa8'}}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                </Link>
              );
            })}
          </div>

          {/* Desktop user area */}
          {user && (
            <div className="hidden md:flex items-center gap-2">
              {/* Profile dropdown trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:ring-2 hover:ring-indigo-500/50"
                  style={{
                    backgroundColor:'rgba(99,102,241,0.2)',
                    border: `1px solid ${profileOpen ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.35)'}`,
                  }}
                >
                  <span className="text-sm font-bold" style={{color:'#818cf8'}}>{user.name?.[0]?.toUpperCase() || 'U'}</span>
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 w-64 rounded-2xl border shadow-2xl overflow-hidden"
                    style={{backgroundColor:'#1a1d27', borderColor:'#2a2d3e', zIndex: 9999}}
                  >
                    {/* User info header */}
                    <div className="px-4 py-4 border-b" style={{borderColor:'#2a2d3e'}}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.35)'}}>
                          <span className="text-base font-bold" style={{color:'#818cf8'}}>{user.name?.[0]?.toUpperCase() || 'U'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{color:'#f0f0f5'}}>{user.name}</p>
                          {user.email && <p className="text-xs truncate mt-0.5" style={{color:'#6b7280'}}>{user.email}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[#0f1117] w-full"
                        style={{color:'#8b8fa8'}}
                      >
                        <User className="w-4 h-4 flex-shrink-0" style={{color:'#818cf8'}} />
                        View Profile
                      </Link>
                      <button
                        onClick={() => { setProfileOpen(false); handleSignOut(); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[#0f1117] w-full text-left"
                        style={{color:'#8b8fa8'}}
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        Sign Out
                      </button>
                    </div>

                    {/* Danger zone */}
                    <div className="p-2 border-t" style={{borderColor:'#2a2d3e'}}>
                      <button
                        onClick={() => { setProfileOpen(false); setShowDeleteModal(true); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left hover:bg-red-500/10"
                        style={{color:'#ef4444'}}
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile: hamburger button */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-[#1a1d27]"
            style={{color:'#8b8fa8'}}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{backgroundColor:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)'}}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="fixed top-16 left-0 right-0 z-30 md:hidden border-b transition-transform duration-200"
        style={{
          backgroundColor:'#1a1d27',
          borderColor:'#2a2d3e',
          transform: mobileOpen ? 'translateY(0)' : 'translateY(-110%)',
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
      >
        <div className="px-4 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={active ? {backgroundColor:'rgba(99,102,241,0.12)', color:'#818cf8'} : {color:'#8b8fa8'}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </Link>
            );
          })}

          {/* Mobile user section */}
          {user && (
            <div className="pt-3 mt-3 border-t" style={{borderColor:'#2a2d3e'}}>
              <div className="flex items-center gap-3 px-4 py-2 mb-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.35)'}}>
                  <span className="text-sm font-bold" style={{color:'#818cf8'}}>{user.name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{color:'#f0f0f5'}}>{user.name}</p>
                  {user.email && <p className="text-xs truncate" style={{color:'#6b7280'}}>{user.email}</p>}
                </div>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-[#0f1117]"
                style={{color:'#8b8fa8'}}
              >
                <User className="w-4 h-4 flex-shrink-0" style={{color:'#818cf8'}} />
                View Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full hover:bg-[#0f1117]"
                style={{color:'#8b8fa8'}}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Sign Out
              </button>
              <button
                onClick={() => { setMobileOpen(false); setShowDeleteModal(true); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full hover:bg-red-500/10"
                style={{color:'#ef4444'}}
              >
                <Trash2 className="w-4 h-4 flex-shrink-0" />
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          loading={deleteLoading}
        />
      )}
    </>
  );
}
