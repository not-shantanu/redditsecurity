'use client';

import { useState, useEffect } from 'react';

export function TopNav() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setCurrentDate(date.toLocaleDateString('en-US', options));
    };
    updateDate();
    const interval = setInterval(updateDate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-ms-border bg-white">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm font-semibold text-ms-neutral">
              RedditFrost - AI-Powered Reddit Marketing Automation
            </div>
            <div className="text-xs text-ms-neutralSecondary">{currentDate}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

