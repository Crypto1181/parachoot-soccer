import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
export function Header() {
  return <motion.header initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.5
  }} className="flex items-center justify-between px-6 pt-6 pb-4">
      {/* Profile Avatar */}
      <div className="relative">
        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80" alt="Profile" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <Bell size={20} />
        </button>
        <button className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <Menu size={20} />
        </button>
      </div>
    </motion.header>;
}