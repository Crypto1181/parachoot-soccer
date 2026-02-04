import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  days: { day: number; name: string; date?: Date }[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ days, selectedDay, onSelectDay, onNavigate }) => {
  return (
    <div className="flex items-center gap-2 px-4">
      <button 
        onClick={() => onNavigate?.('prev')}
        className="p-1 text-foreground/60 hover:text-foreground transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="flex gap-2 flex-1 justify-center overflow-x-auto scrollbar-hide">
        {days.map((item) => (
          <button
            key={item.day}
            onClick={() => onSelectDay(item.day)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-300 whitespace-nowrap ${
              selectedDay === item.day
                ? 'bg-foreground text-background'
                : 'text-foreground/70 hover:bg-secondary'
            }`}
          >
            <span className="text-sm font-bold">{item.day}</span>
            <span className="text-[10px] uppercase">{item.name}</span>
          </button>
        ))}
      </div>

      <button 
        onClick={() => onNavigate?.('next')}
        className="p-1 text-foreground/60 hover:text-foreground transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default DateSelector;
