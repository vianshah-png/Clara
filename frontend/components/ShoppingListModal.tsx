import React from 'react';
import { WeeklyPlan } from '../types';

interface ShoppingListModalProps {
  plan: WeeklyPlan;
  onClose: () => void;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ plan, onClose }) => {
  // Simple extraction of distinct meals for a shopping list concept
  const allRecipes = plan.flatMap(day => [day.breakfast, day.lunch, day.snack, day.dinner].flat());
  const uniqueNames = Array.from(new Set(allRecipes.map(r => r.name)));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-2xl font-serif font-bold text-slate-900">Weekly Shopping List</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
           <div className="bg-brand-50 rounded-2xl p-4 text-brand-700 text-sm">
             <span className="font-bold mr-2 uppercase tracking-tight text-xs">Note:</span>
             This list includes the main dishes for your 7-day plan. You can view individual recipe details for specific ingredients.
           </div>

           <div className="grid gap-3">
             {uniqueNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-slate-50 transition-all">
                   <div className="w-5 h-5 border-2 border-slate-200 rounded flex-shrink-0"></div>
                   <span className="text-sm font-medium text-slate-700">{name}</span>
                </div>
             ))}
           </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white transition-all">Close</button>
          <button className="bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print List
          </button>
        </div>
      </div>
    </div>
  );
};
