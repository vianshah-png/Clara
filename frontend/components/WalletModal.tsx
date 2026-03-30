import React, { useState } from 'react';

interface WalletModalProps {
  balance: number;
  onClose: () => void;
  onAddCoins: (amount: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ balance, onClose, onAddCoins }) => {
  const [customAmount, setCustomAmount] = useState('');

  const handleAddCustom = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount > 0) {
      onAddCoins(amount);
      setCustomAmount('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
        
        {/* Teal Header Section */}
        <div className="bg-[#00B5CD] p-10 text-center text-white relative">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
               <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-xl">BN</span>
               </div>
            </div>
          </div>
          <h2 className="text-4xl font-serif font-bold mb-2">Your Wallet</h2>
          <p className="text-white/80 font-medium">You currently have <span className="font-bold">{balance} Coins</span></p>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold text-center border border-red-100 italic">
            You need 5 more coins to generate this plan.
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Top Up (Demo)</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onAddCoins(35)}
                className="p-4 rounded-2xl border-2 border-slate-100 hover:border-[#00B5CD] hover:bg-brand-50 transition-all text-center group"
              >
                <div className="text-lg font-black text-slate-800 group-hover:text-[#00B5CD]">+35 Coins</div>
                <div className="text-[10px] font-bold text-slate-400">1 Week Plan</div>
              </button>
              <button 
                onClick={() => onAddCoins(100)}
                className="p-4 rounded-2xl border-2 border-slate-100 hover:border-[#00B5CD] hover:bg-brand-50 transition-all text-center group"
              >
                <div className="text-lg font-black text-slate-800 group-hover:text-[#00B5CD]">+100 Coins</div>
                <div className="text-[10px] font-bold text-slate-400">Best Value</div>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input 
              type="number"
              value={customAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomAmount(e.target.value)}
              placeholder="Custom Amount"
              className="flex-grow px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00B5CD]/20"
            />
            <button 
              onClick={handleAddCustom}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95"
            >
              Add
            </button>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
