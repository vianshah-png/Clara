import React, { useState, useEffect, useRef } from 'react';
import { WeeklyPlan, DailyPlan, Recipe, UserProfile } from '../types';
import { MealCard } from './MealCard';
import { ShoppingListModal } from './ShoppingListModal';
import { CookingModeOverlay } from './CookingModeOverlay';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getMealSwapOptions, generateSpeechFromBackend as generateSpeech, decodeAudioData } from '../services/apiClient';

interface PlanDashboardProps {
  plan: WeeklyPlan;
  onReset: () => void;
  userProfile: UserProfile;
  isGenerating?: boolean;
  unlockedDaysCount: number;
  onUnlockDay: () => void;
  onOpenCart: () => void;
}

// Helper type to track which meal is currently active for swapping
interface ActiveSwapState {
  dayIndex: number;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  isLoading: boolean;
  options: Recipe[] | null;
}

export const PlanDashboard: React.FC<PlanDashboardProps> = ({
  plan,
  onReset,
  userProfile,
  isGenerating,
  unlockedDaysCount,
  onUnlockDay,
  onOpenCart
}) => {
  // Ensure we don't select an index that doesn't exist yet
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // State to manage the active swap session
  const [activeSwap, setActiveSwap] = useState<ActiveSwapState | null>(null);

  // State for shopping list modal
  const [showShoppingList, setShowShoppingList] = useState(false);

  // State for cooking mode
  const [activeCookingRecipe, setActiveCookingRecipe] = useState<Recipe | null>(null);

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const handlePlaySummary = async (text: string) => {
    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);

    try {
      const base64Audio = await generateSpeech(text);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      // Resume context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Decode base64 to byte array
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Use the service helper to decode PCM data
      const audioBuffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsPlaying(false);
      };

      sourceNodeRef.current = source;
      source.start(0);
      setIsPlaying(true);

    } catch (error) {
      console.error('Audio playback failed', error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  // Stop audio if day changes
  useEffect(() => {
    if (sourceNodeRef.current && isPlaying) {
      sourceNodeRef.current.stop();
      setIsPlaying(false);
    }
  }, [selectedDayIndex]);

  // If the selected day index becomes out of bounds (shouldn't happen often), reset it
  useEffect(() => {
    if (selectedDayIndex >= plan.length && plan.length > 0) {
      setSelectedDayIndex(plan.length - 1);
    }
  }, [plan.length, selectedDayIndex]);

  const currentDay: DailyPlan | undefined = plan[selectedDayIndex];

  // Check if current view is locked
  const isDayLocked = selectedDayIndex >= unlockedDaysCount;

  // Helper to sum macros for combos
  const sumMeal = (meal: Recipe | Recipe[]) => {
    const list = Array.isArray(meal) ? meal : [meal];
    return {
      cals: list.reduce((s, r) => s + (r.calories || 0), 0),
      pro: list.reduce((s, r) => s + (r.protein || 0), 0),
      crb: list.reduce((s, r) => s + (r.carbs || 0), 0),
      fat: list.reduce((s, r) => s + (r.fats || 0), 0),
    };
  };

  const b = currentDay ? sumMeal(currentDay.breakfast) : { cals: 0, pro: 0, crb: 0, fat: 0 };
  const l = currentDay ? sumMeal(currentDay.lunch) : { cals: 0, pro: 0, crb: 0, fat: 0 };
  const s = currentDay ? sumMeal(currentDay.snack) : { cals: 0, pro: 0, crb: 0, fat: 0 };
  const d = currentDay ? sumMeal(currentDay.dinner) : { cals: 0, pro: 0, crb: 0, fat: 0 };

  const totalCalories = b.cals + l.cals + s.cals + d.cals;
  const totalProtein = b.pro + l.pro + s.pro + d.pro;
  const totalCarbs = b.crb + l.crb + s.crb + d.crb;
  const totalFats = b.fat + l.fat + s.fat + d.fat;

  // 1. User Clicks Swap Icon -> Fetch 5 Options
  const handleInitiateSwap = async (mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    if (activeSwap || !currentDay || isDayLocked) return;

    // Set loading state
    setActiveSwap({
      dayIndex: selectedDayIndex,
      mealType,
      isLoading: true,
      options: null
    });

    try {
      const meal = currentDay[mealType];
      // For swaps, if it's a combo, we swap the first item or the whole thing? 
      // Usually, swap logic works best on a single representative recipe.
      const representative = Array.isArray(meal) ? meal[0] : meal;
      const options = await getMealSwapOptions(representative, userProfile);

      // Update state with options
      setActiveSwap(prev => prev ? { ...prev, isLoading: false, options } : null);

    } catch (error) {
      console.error("Failed to fetch swap options", error);
      alert("Could not load alternative recipes. Please check connection.");
      setActiveSwap(null);
    }
  };

  // 2. User Selects an Option from the Card Overlay -> Update Plan
  const handleConfirmSwap = (newRecipe: Recipe) => {
    if (!activeSwap) return;

    const { dayIndex, mealType } = activeSwap;
    if (plan[dayIndex]) {
      // Swapping a combo replaces it with a single new choice for now
      plan[dayIndex][mealType] = [newRecipe];
    }
    setActiveSwap(null);
  };

  // 3. User Cancels Swap
  const handleCancelSwap = () => {
    setActiveSwap(null);
  };

  // 4. Start Cooking Mode
  const handleStartCooking = (recipe: Recipe) => {
    setActiveCookingRecipe(recipe);
  };

  // Helper to check if a specific card is in a specific state
  const getCardState = (type: 'breakfast' | 'lunch' | 'snack' | 'dinner') => {
    const isActive = activeSwap?.dayIndex === selectedDayIndex && activeSwap?.mealType === type;
    return {
      isSwapping: isActive && activeSwap?.isLoading,
      swapOptions: isActive && !activeSwap?.isLoading ? activeSwap?.options : null,
      onSwapStart: () => handleInitiateSwap(type),
      onSwapConfirm: handleConfirmSwap,
      onSwapCancel: handleCancelSwap,
      onStartCooking: handleStartCooking
    };
  };

  const macroData = [
    { name: 'Protein', value: totalProtein, color: '#3b82f6' },
    { name: 'Carbs', value: totalCarbs, color: '#f59e0b' },
    { name: 'Fats', value: totalFats, color: '#ef4444' },
  ];

  if (!currentDay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500">Generating the next day...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">


      {activeCookingRecipe && (
        <CookingModeOverlay recipe={activeCookingRecipe} onClose={() => setActiveCookingRecipe(null)} />
      )}

      <div className="flex justify-between items-center py-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Your {plan.length}-Day Plan</h2>
          {isGenerating && (
            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full animate-pulse">
              Curating more days...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Shopping Cart
          </button>
          <button onClick={onReset} className="text-sm text-slate-500 hover:text-slate-800 underline">Start Over</button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-6">
        {plan.map((day, idx) => {
          const isLocked = idx >= unlockedDaysCount;
          return (
            <button
              key={day.day || idx}
              onClick={() => { setSelectedDayIndex(idx); setActiveSwap(null); }}
              className={`flex-shrink-0 px-6 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${selectedDayIndex === idx
                  ? 'bg-brand-600 text-white shadow-md transform scale-105'
                  : isLocked
                    ? 'bg-slate-100 text-slate-400 border border-slate-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              {isLocked && <span className="text-xs">🔒</span>}
              {day.day}
            </button>
          );
        })}
        {isGenerating && (
          <div className="flex-shrink-0 px-4 py-3 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce mx-0.5"></div>
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce mx-0.5 delay-75"></div>
            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce mx-0.5 delay-150"></div>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Blur Overlay for Locked Days */}
        {isDayLocked && (
          <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-md rounded-xl flex flex-col items-center justify-center text-center p-6 border border-slate-200">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-brand-100">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🔒
              </div>
              <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">Unlock {currentDay.day}</h3>
              <p className="text-slate-500 mb-6">Reveal the full meal plan, recipes, and health tips for this day.</p>
              <button
                onClick={onUnlockDay}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-200 transition-all transform hover:-translate-y-1"
              >
                Unlock for 5 Coins
              </button>
            </div>
          </div>
        )}

        <div className={`grid lg:grid-cols-3 gap-8 ${isDayLocked ? 'opacity-20 pointer-events-none select-none overflow-hidden' : ''}`}>
          {/* Main Content: Meals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl animate-in fade-in duration-500 relative">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-brand-800 font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Tip of the Day
                </h3>

                <button
                  onClick={() => handlePlaySummary(currentDay.summary)}
                  disabled={isAudioLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isPlaying
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'bg-white text-brand-600 hover:bg-brand-100'
                    } shadow-sm border border-brand-100`}
                >
                  {isAudioLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : isPlaying ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Listen
                    </>
                  )}
                </button>
              </div>
              <p className="text-brand-700 text-sm italic">{currentDay.summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <MealCard
                title="Breakfast"
                recipe={currentDay.breakfast}
                colorClass="bg-amber-50 text-amber-900 border-amber-200"
                {...getCardState('breakfast')}
                onStartCooking={handleStartCooking}
              />
              <MealCard
                title="Lunch"
                recipe={currentDay.lunch}
                colorClass="bg-emerald-50 text-emerald-900 border-emerald-200"
                {...getCardState('lunch')}
                onStartCooking={handleStartCooking}
              />
              <MealCard
                title="Evening Snack"
                recipe={currentDay.snack}
                colorClass="bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200"
                {...getCardState('snack')}
                onStartCooking={handleStartCooking}
              />
              <MealCard
                title="Dinner"
                recipe={currentDay.dinner}
                colorClass="bg-sky-50 text-sky-900 border-sky-200"
                {...getCardState('dinner')}
                onStartCooking={handleStartCooking}
              />
            </div>
          </div>

          {/* Sidebar: Stats */}
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 delay-100">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Daily Nutrition</h3>
              <p className="text-xs text-slate-400 mb-6 uppercase tracking-wide">Based on Standard Servings</p>

              <div className="relative h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `${(Number(value) || 0).toFixed(1)}g`}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-800">{totalCalories.toFixed(0)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kcal</span>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {macroData.map((m) => (
                  <div key={m.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: m.color }}></div>
                      <span className="text-sm font-medium text-slate-600">{m.name}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">{m.value.toFixed(1)}g</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-slate-300 p-6 rounded-xl text-sm">
              <h4 className="text-white font-bold mb-2">Pro Tip</h4>
              <p>Remember to stay hydrated! Drink at least 8 glasses of water today to aid digestion and maintain energy levels.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};