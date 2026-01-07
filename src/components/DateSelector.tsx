import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  days: { day: number; name: string }[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ days, selectedDay, onSelectDay }) => {
  return (
    <div className="flex items-center gap-2 px-4">
      <button className="p-1 text-foreground/60 hover:text-foreground transition-colors">
        <ChevronLeft size={20} />
      </button>
      
      <div className="flex gap-2 flex-1 justify-center">
        {days.map((item) => (
          <button
            key={item.day}
            onClick={() => onSelectDay(item.day)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-300 ${
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

      <button className="p-1 text-foreground/60 hover:text-foreground transition-colors">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default DateSelector;
