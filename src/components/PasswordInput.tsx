import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordInputProps {
  id?: string;
  name?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  showPolicyChecks?: boolean;
  isAdmin?: boolean;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  required = true,
  showPolicyChecks = false,
  isAdmin = false,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const minLength = isAdmin ? 10 : 8;
  const hasMinLength = value.length >= minLength;
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {isAdmin && (
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Admin Policy (10+ Chars)</span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-slate-900/90 border ${
            error ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700/80 focus:border-indigo-500'
          } rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner font-mono`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 rounded-md focus:outline-none"
          title={showPassword ? 'Hide password' : 'Show password'}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}

      {showPolicyChecks && value.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 pt-2 text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
          <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>At least {minLength} characters</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>1 uppercase letter</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasDigit ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>1 numeric digit</span>
          </div>
          <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            <span>1 special symbol</span>
          </div>
        </div>
      )}
    </div>
  );
};
