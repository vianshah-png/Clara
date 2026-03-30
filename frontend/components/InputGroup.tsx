import React from 'react';

interface InputGroupProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, id, type = 'text', value, onChange, options, placeholder, required = false 
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-1">
        {label} {required && <span className="text-[#00B5CD] ml-0.5">*</span>}
      </label>
      {options ? (
        <div className="relative group">
          <select
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full px-4 py-3 bg-[#323232] border-none rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#00B5CD]/40 transition-all appearance-none cursor-pointer"
          >
            <option value="" disabled className="bg-[#323232]">{placeholder || `Select ${label}`}</option>
            {options.map(opt => (
              <option key={opt} value={opt} className="bg-[#323232]">{opt}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-[#323232] border-none rounded-xl text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00B5CD]/40 transition-all"
        />
      )}
    </div>
  );
};

