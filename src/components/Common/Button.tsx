import React from 'react';
import { sounds } from '../../game/sound';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  soundOnClick?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  soundOnClick = true,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundOnClick) {
      sounds.playClick();
    }
    if (onClick) {
      onClick(e);
    }
  };

  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 shadow-md',
    xl: 'text-lg px-8 py-4 gap-3 shadow-lg font-bold',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-indigo-500/25 border-t border-indigo-300/30 focus:ring-indigo-500',
    accent:
      'bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold shadow-amber-500/25 border-t border-amber-200/50 focus:ring-amber-400',
    secondary:
      'bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 backdrop-blur-sm focus:ring-white/30',
    danger:
      'bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/25 border-t border-rose-300/30 focus:ring-rose-500',
    ghost:
      'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white focus:ring-white/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
