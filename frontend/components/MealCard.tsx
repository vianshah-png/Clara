import React, { useEffect, useState } from 'react';
import { Recipe, MealOption } from '../types';

interface MealCardProps {
  title: string;
  recipe?: Recipe | Recipe[];
  options?: MealOption[];
  colorClass: string;
  onSwapStart?: () => void;
  isSwapping?: boolean;
  swapOptions?: Recipe[] | null;
  onSwapConfirm?: (newRecipe: Recipe) => void;
  onSwapCancel?: () => void;
  onStartCooking?: (recipe: Recipe) => void;
  selectedOptionIndex?: number;
  confirmedOptionIndex?: number;
  onPreviewOptionChange?: (optionIndex: number) => void;
  onConfirmOption?: (optionIndex: number) => void;
  onToggleLike?: (recipe: Recipe) => void;
  isRecipeLiked?: (recipe: Recipe) => boolean;
}

export const MealCard: React.FC<MealCardProps> = ({
  title,
  recipe,
  options,
  colorClass,
  onSwapStart,
  isSwapping,
  swapOptions,
  onSwapConfirm,
  onSwapCancel,
  onStartCooking,
  selectedOptionIndex,
  confirmedOptionIndex,
  onPreviewOptionChange,
  onConfirmOption,
  onToggleLike,
  isRecipeLiked
}) => {
  const [internalOptionIndex, setInternalOptionIndex] = useState(selectedOptionIndex ?? confirmedOptionIndex ?? 0);
  const activeOptionIndex = selectedOptionIndex ?? internalOptionIndex;

  useEffect(() => {
    setInternalOptionIndex(selectedOptionIndex ?? confirmedOptionIndex ?? 0);
  }, [selectedOptionIndex, confirmedOptionIndex, options]);

  const hasOptions = !!(options && options.length > 0);
  const activeRecipes = hasOptions
    ? options?.[activeOptionIndex]?.items || []
    : recipe
      ? Array.isArray(recipe) ? recipe : [recipe]
      : [];
  const activeLabel = hasOptions ? options?.[activeOptionIndex]?.optionLabel || '' : '';
  const isConfirmed = hasOptions && confirmedOptionIndex === activeOptionIndex;

  const totalCalories = activeRecipes.reduce((sum, r) => sum + (r.calories || 0), 0);
  const totalProtein = activeRecipes.reduce((sum, r) => sum + (r.protein || 0), 0);
  const totalCarbs = activeRecipes.reduce((sum, r) => sum + (r.carbs || 0), 0);
  const totalFats = activeRecipes.reduce((sum, r) => sum + (r.fats || 0), 0);
  const isSelecting = !!(swapOptions && swapOptions.length > 0);

  const moveOption = (direction: -1 | 1) => {
    if (!options?.length) return;
    const nextIndex = (activeOptionIndex + direction + options.length) % options.length;
    setInternalOptionIndex(nextIndex);
    onPreviewOptionChange?.(nextIndex);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col h-[520px] group/card relative">
      {isSwapping && (
        <div className="absolute inset-0 bg-white/90 z-30 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
            <span className="text-sm font-bold text-brand-700">Curating options...</span>
          </div>
        </div>
      )}

      {isSelecting && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center justify-between px-4 py-3 ${colorClass.split(' ')[0]} border-b border-slate-100`}>
            <span className="text-xs font-bold text-slate-700">Select Replacement</span>
            <button onClick={onSwapCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">Cancel</button>
          </div>
          <div className="flex-grow overflow-y-auto p-2 space-y-2 no-scrollbar">
            {swapOptions?.map((opt, idx) => (
              <button
                key={`${opt.name}-${idx}`}
                onClick={() => onSwapConfirm && onSwapConfirm(opt)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-brand-300 hover:bg-brand-50 transition-all flex justify-between items-center"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h5 className="text-xs font-bold text-slate-800 truncate">{opt.name}</h5>
                  <p className="text-[10px] text-slate-500 truncate">{opt.calories} kcal</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`px-4 py-3 ${colorClass.split(' ')[0]} border-b border-slate-100 flex justify-between items-center`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ${colorClass.split(' ')[1]}`}>{title}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm ring-1 ring-slate-100">
            <span className="text-xs font-black text-slate-700">{Math.round(totalCalories)} <span className="text-[10px] text-slate-400">kcal</span></span>
          </div>
          {onSwapStart && (
            <button onClick={onSwapStart} disabled={isSwapping || isSelecting} className="p-1.5 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-brand-600 hover:shadow-md transition-all disabled:opacity-50" title="Swap meal">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {options && options.length > 1 && (
        <div className="flex justify-between items-center px-4 py-2 bg-slate-50 border-b border-slate-100">
          <button onClick={() => moveOption(-1)} className="p-1 rounded-full hover:bg-slate-200 transition-colors" title="Previous option">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-xs font-bold text-brand-600">{activeLabel || `Option ${activeOptionIndex + 1}`}</span>
            {isConfirmed ? (
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Confirmed</span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Preview</span>
            )}
          </div>
          <button onClick={() => moveOption(1)} className="p-1 rounded-full hover:bg-slate-200 transition-colors" title="Next option">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

      <div className="p-5 flex-grow flex flex-col overflow-hidden">
        <div className="space-y-3 overflow-y-auto no-scrollbar flex-grow mb-4">
          {activeRecipes.map((r, i) => (
            <div key={`${r.name}-${i}`} className="group/item">
              <div className="flex items-start gap-2">
                <h4 className="font-serif font-bold text-slate-800 text-lg leading-tight mb-1 flex-1">{r.name}</h4>
                {onToggleLike && (
                  <button
                    type="button"
                    onClick={() => onToggleLike(r)}
                    className={`mt-0.5 h-7 w-7 rounded-full border flex items-center justify-center transition-all ${
                      isRecipeLiked?.(r)
                        ? 'bg-rose-50 border-rose-200 text-rose-500'
                        : 'bg-white border-slate-100 text-slate-300 hover:text-rose-400 hover:border-rose-200'
                    }`}
                    title={isRecipeLiked?.(r) ? 'Liked dish' : 'Like this dish'}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-bold uppercase">
                <span>{Math.round(r.calories)} kcal</span>
                <span>|</span>
                <span className="text-emerald-600">{r.servingSize && r.servingSize !== 'Standard Serving' ? r.servingSize : '1 standard portion'}</span>
                <span>|</span>
                <button onClick={() => onStartCooking && onStartCooking(r)} className="text-brand-600 hover:underline">
                  Cook Mode
                </button>
                <span>|</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">View Full</a>
              </div>
            </div>
          ))}
          {activeRecipes.length === 1 && activeRecipes[0].description && (
            <p className="text-sm text-slate-400 italic line-clamp-3">&quot;{activeRecipes[0].description}&quot;</p>
          )}
        </div>

        {hasOptions && onConfirmOption && (
          <button
            type="button"
            onClick={() => onConfirmOption(activeOptionIndex)}
            className={`mb-3 w-full rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
              isConfirmed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
            }`}
          >
            {isConfirmed ? 'Meal Confirmed' : 'Confirm This Meal'}
          </button>
        )}

        <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-slate-50">
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <div className="text-xs font-bold text-slate-700">{Math.round(totalProtein)}g</div>
            <div className="text-[9px] uppercase font-bold text-slate-400">Protein</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <div className="text-xs font-bold text-slate-700">{Math.round(totalCarbs)}g</div>
            <div className="text-[9px] uppercase font-bold text-slate-400">Carbs</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <div className="text-xs font-bold text-slate-700">{Math.round(totalFats)}g</div>
            <div className="text-[9px] uppercase font-bold text-slate-400">Fat</div>
          </div>
        </div>
      </div>
    </div>
  );
};
