/**
 * 404 Not Found Page
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6"
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-20 h-20 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1))',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 0 30px rgba(239,68,68,0.1)',
        }}
      >
        <AlertTriangle size={36} className="text-red-400" />
      </div>

      {/* Text */}
      <div>
        <h1
          className="text-8xl font-black mb-3"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </h1>
        <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      {/* CTA */}
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
          boxShadow: '0 0 16px rgba(59,130,246,0.3)',
        }}
      >
        <Home size={16} />
        Back to Dashboard
      </Link>
    </motion.div>
  );
}
