import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  onClick,
  ...props 
}) => {
  const baseStyles = "py-3.5 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-lumina-400 text-lumina-900 hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]",
    secondary: "bg-lumina-800 text-lumina-100 border border-lumina-700 hover:bg-lumina-700",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    ghost: "bg-transparent text-lumina-400 hover:bg-lumina-800/50",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};