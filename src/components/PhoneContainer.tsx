import React from 'react';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children }) => {
  return (
    <div className="w-full h-full bg-[#020503] text-white flex justify-center items-center overflow-hidden select-none">
      {/* Clean responsive container - direct native app experience */}
      <main className="w-full h-full max-w-md bg-[#030705] flex flex-col overflow-hidden relative sm:border sm:border-emerald-500/15 sm:rounded-[32px] sm:shadow-[0_0_50px_rgba(0,255,136,0.08)]">
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
};
