
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500"></div>
      <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500 delay-100"></div>
      <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500 delay-200"></div>
    </div>
  );
};

export default Spinner;
    