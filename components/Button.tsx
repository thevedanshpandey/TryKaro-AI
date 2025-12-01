import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  isLoading = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95";
  
  const variants = {
    primary: "bg-neon text-white shadow-[0_0_15px_rgba(255,42,109,0.4)] hover:shadow-[0_0_25px_rgba(255,42,109,0.6)] border border-transparent",
    secondary: "bg-white text-black hover:bg-gray-200 border border-transparent",
    outline: "bg-transparent border border-neon text-neon hover:bg-neon/10"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cooking...
        </>
      ) : children}
    </button>
  );
};