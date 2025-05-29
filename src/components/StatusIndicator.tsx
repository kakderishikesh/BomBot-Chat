
import { useState, useEffect } from 'react';

const StatusIndicator = () => {
  const [currentStatus, setCurrentStatus] = useState(0);
  
  const statuses = [
    { icon: '🤔', text: 'Thinking...' },
    { icon: '🔍', text: 'Analyzing your request...' },
    { icon: '📦', text: 'Querying package database...' },
    { icon: '🛡️', text: 'Checking for vulnerabilities...' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatus((prev) => (prev + 1) % statuses.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-3 text-gray-600 py-2">
      <div className="flex items-center space-x-2">
        <div className="animate-pulse flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-2xl">{statuses[currentStatus].icon}</span>
        <span className="text-sm font-medium">{statuses[currentStatus].text}</span>
      </div>
    </div>
  );
};

export default StatusIndicator;
