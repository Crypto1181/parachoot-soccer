import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
type DateItem = {
  day: string;
  date: number;
  fullDate: string;
};
const dates: DateItem[] = [{
  day: 'MON',
  date: 21,
  fullDate: '2023-10-21'
}, {
  day: 'TUE',
  date: 22,
  fullDate: '2023-10-22'
}, {
  day: 'WED',
  date: 23,
  fullDate: '2023-10-23'
}, {
  day: 'THU',
  date: 24,
  fullDate: '2023-10-24'
}, {
  day: 'FRI',
  date: 25,
  fullDate: '2023-10-25'
}];
export function DateSelector() {
  const [selectedDate, setSelectedDate] = useState<number>(24);
  return <div className="w-full px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        {/* Left Arrow */}
        <button className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <ChevronLeft size={18} />
        </button>

        {/* Dates Container */}
        <div className="flex-1 flex justify-between items-center gap-2 overflow-x-auto no-scrollbar">
          {dates.map(item => {
          const isSelected = item.date === selectedDate;
          return <motion.button key={item.date} onClick={() => setSelectedDate(item.date)} layout className={`
                  relative flex flex-col items-center justify-center h-16 w-14 rounded-2xl flex-shrink-0 transition-colors duration-300
                  ${isSelected ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-900'}
                `} whileTap={{
            scale: 0.95
          }}>
                <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {item.date}
                </span>
                <span className={`text-[10px] font-medium uppercase tracking-wider ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                  {item.day}
                </span>

                {isSelected && <motion.div layoutId="activeIndicator" className="absolute -bottom-1 h-1 w-1 rounded-full bg-white" />}
              </motion.button>;
        })}
        </div>

        {/* Right Arrow */}
        <button className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>;
}