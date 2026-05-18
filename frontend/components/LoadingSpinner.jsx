export default function LoadingSpinner({ text = 'Loading…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1117' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
        {text && <p style={{ color: '#8b8fa8' }}>{text}</p>}
      </div>
    </div>
  );
}
