import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Recipe, Ingredient, InstructionStep } from '../types';

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

interface ActiveTimer {
  id: string;
  stepIdx: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
}

export const CookingMode: React.FC<CookingModeProps> = ({ recipe, onClose }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  
  // Timer states
  const [stepParsedTime, setStepParsedTime] = useState<number | null>(null);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  
  const [showPrep, setShowPrep] = useState(true);
  
  const voiceEnabledRef = useRef(isVoiceEnabled);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    voiceEnabledRef.current = isVoiceEnabled;
  }, [isVoiceEnabled]);

  // Normalize instructions
  const steps: InstructionStep[] = useMemo(() => {
    if (!recipe.instructions) return [];
    const raw = Array.isArray(recipe.instructions) ? recipe.instructions : 
               (typeof recipe.instructions === 'string' ? (recipe.instructions as string).split('\n').filter(Boolean) : []);
    
    return raw.map(s => {
      if (typeof s === 'string') return { text: s };
      if (s && typeof s === 'object' && (s as any).text) return s as InstructionStep;
      return { text: String(s || '') };
    });
  }, [recipe]);

  const ingredients: (string | Ingredient)[] = useMemo(() => {
    return Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  }, [recipe]);

  const currentStep = steps[currentStepIdx];

  // Head Chef Voice Logic
  const speak = (text: string, isUrgent = false) => {
    if (!voiceEnabledRef.current || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Head Chef Persona: Firm, clear rate, slightly lower pitch unless urgent
    utterance.rate = 0.95;
    utterance.pitch = isUrgent ? 1.2 : 0.85; 
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Intro when starting
  useEffect(() => {
    if (isVoiceEnabled && !showPrep && currentStepIdx === 0 && currentStep?.text) {
      speak(`Welcome to the kitchen. I'm your Head Chef. Let's get cooking. Step 1: ${currentStep.text}`);
    }
  }, [showPrep, isVoiceEnabled]);

  // Parse current step for actionable timers
  useEffect(() => {
    if (!currentStep?.text || showPrep) return;
    
    if (currentStep.durationMinutes) {
      setStepParsedTime(currentStep.durationMinutes * 60);
    } else {
      const timeMatch = currentStep.text.match(/(\d+)\s*(minute|min|sec|second|hour)/i);
      if (timeMatch) {
         let val = parseInt(timeMatch[1]);
         const unit = timeMatch[2].toLowerCase();
         if (unit.startsWith('hour')) val *= 3600;
         else if (unit.startsWith('min')) val *= 60;
         setStepParsedTime(val);
      } else {
         setStepParsedTime(null);
      }
    }
  }, [currentStepIdx, showPrep, currentStep]);

  // Global background timers ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        let alerts: string[] = [];
        const next = prev.map(t => {
          const tick = t.remainingSeconds - 1;
          if (tick === 0) {
            alerts.push(`Chef, attention! Your timer for ${t.label} is complete. Please check the dish.`);
          }
          return { ...t, remainingSeconds: tick };
        }).filter(t => t.remainingSeconds > 0);
        
        alerts.forEach(msg => speak(msg, true));
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      
      const chefPhrases = ["Moving on.", "Next up.", "Alright, chef.", "Let's continue."];
      const phrase = chefPhrases[Math.floor(Math.random() * chefPhrases.length)];
      if (voiceEnabledRef.current) speak(`${phrase} Step ${nextIdx + 1}. ${steps[nextIdx].text}`);
    } else {
      if (voiceEnabledRef.current) speak("Excellent work, chef. Service!");
      onClose();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
      if (voiceEnabledRef.current) speak(`Going back to step ${currentStepIdx}. ${steps[currentStepIdx - 1].text}`);
    } else {
      setShowPrep(true);
    }
  };

  const startPassiveTimer = () => {
    if (!stepParsedTime) return;
    
    const newTimer: ActiveTimer = {
      id: Math.random().toString(36).substring(7),
      stepIdx: currentStepIdx,
      label: `Step ${currentStepIdx + 1}`,
      totalSeconds: stepParsedTime,
      remainingSeconds: stepParsedTime
    };
    
    setActiveTimers(prev => [...prev, newTimer]);
    
    if (voiceEnabledRef.current) {
      speak(`Starting a ${formatTime(stepParsedTime)} timer for step ${currentStepIdx + 1}. Meanwhile, let's keep moving.`);
    }
    
    // Automatically advance to keep user entirely focused on parallel cooking
    if (currentStepIdx < steps.length - 1) {
      setTimeout(() => {
        handleNextStep();
      }, 500); // Short delay for UX smoothness
    }
  };

  const cancelTimer = (id: string) => {
    setActiveTimers(prev => prev.filter(t => t.id !== id));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatTimeDigital = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-50 text-slate-800 z-[300] flex flex-col font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-slate-800">{recipe.name}</h1>
            <p className="text-sm text-brand-600 font-semibold flex items-center gap-2">
              {showPrep ? 'Preparation View' : `Step ${currentStepIdx + 1} of ${steps.length || 0}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const next = !isVoiceEnabled;
              setIsVoiceEnabled(next);
              if (next) {
                 // Immediate feedback
                 const u = new SpeechSynthesisUtterance("Head Chef voice activated.");
                 u.rate = 0.95; u.pitch = 0.85;
                 window.speechSynthesis.speak(u);
              } else {
                 window.speechSynthesis.cancel();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${isVoiceEnabled ? 'bg-brand-100 text-brand-700 border border-brand-200 shadow-sm' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
          >
            {isVoiceEnabled ? (
               <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg> Chef Voice On</>
            ) : (
               <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> Chef Voice Off</>
            )}
          </button>
        </div>
      </div>

      <div className="flex-grow flex relative w-full h-full text-left">
        {/* Main Content Area */}
        <div className="flex-grow overflow-y-auto w-full px-4 py-8 relative">
          {showPrep ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-serif font-bold text-slate-800 mb-3">Preparation View</h2>
                <p className="text-slate-500 text-lg">Gather all ingredients and equipment before you start cooking.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Ingredients */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-slate-800">
                    <span className="w-3 h-3 bg-brand-500 rounded-full"></span> 
                    Ingredients
                  </h3>
                  <ul className="space-y-3">
                    {ingredients.map((ing, i) => (
                      <li key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-slate-700 font-medium">{typeof ing === 'string' ? ing : ing.name}</span>
                        <span className="text-brand-600 font-bold bg-brand-50 px-3 py-1 rounded-full text-sm">{typeof ing === 'string' ? '' : ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Equipment & Actions */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-slate-800">
                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span> 
                    Equipment Needed
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {['Saucepan', 'Mixing Bowl', 'Spatula', 'Chef Knife'].map((eq, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-sm">🍳</div>
                        <span className="text-sm font-semibold text-slate-700">{eq}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-8 flex justify-center border-t border-slate-100">
                    <button 
                      onClick={() => setShowPrep(false)}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white text-lg font-bold py-5 rounded-2xl shadow-lg shadow-brand-200 transition-all hover:-translate-y-1"
                    >
                      Start Cooking
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col h-full justify-between animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto ${activeTimers.length > 0 ? 'lg:pr-[18rem]' : ''}`}>
              
              <div className="flex-grow flex flex-col justify-center py-10">
                
                {/* Timer UI (Actionable) */}
                {stepParsedTime !== null && (
                  <div className="flex justify-center mb-10 animate-in zoom-in-95 duration-500">
                    <div className="bg-brand-50 border border-brand-200 p-6 rounded-[2rem] shadow-sm flex flex-col items-center gap-4">
                      <div className="text-center">
                        <p className="text-brand-800 font-bold mb-1">Passive Cooking Step Detected</p>
                        <p className="text-sm text-brand-600">This step takes {formatTime(stepParsedTime)}.</p>
                      </div>
                      <button 
                        onClick={startPassiveTimer}
                        className="bg-white border border-brand-200 text-brand-700 px-6 py-3 rounded-full font-bold shadow-md shadow-brand-100 hover:bg-brand-600 hover:text-white transition-all items-center flex gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Start Timer & Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Instruction */}
                <div className="bg-white py-12 px-10 rounded-[2.5rem] border border-slate-200 shadow-xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                    <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}></div>
                  </div>
                  
                  <span className="inline-block px-4 py-1.5 bg-brand-50 text-brand-600 rounded-full font-bold text-sm uppercase tracking-widest mb-6">
                    Step {currentStepIdx + 1}
                  </span>
                  
                  <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-800 leading-tight max-w-3xl mx-auto">
                    {currentStep?.text || "Instructions unavailable"}
                  </h2>
                </div>
                
                {/* Next Steps Preview */}
                {steps.length > currentStepIdx + 1 && (
                  <div className="mt-8 text-center px-4">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Up Next</p>
                    <p className="text-slate-600 font-medium opacity-70 line-clamp-1 max-w-lg mx-auto">
                      {steps[currentStepIdx + 1]?.text}
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex justify-between items-center pt-6 pb-2">
                <button 
                  onClick={handlePrevStep}
                  className="px-8 py-4 rounded-xl font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
                >
                  {currentStepIdx === 0 ? "Back to Prep" : "Previous Step"}
                </button>
                
                <button 
                  onClick={handleNextStep}
                  className="px-10 py-4 rounded-xl font-bold bg-brand-600 text-white shadow-md shadow-brand-200 hover:bg-brand-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  {currentStepIdx === steps.length - 1 ? "Finish Cooking" : "Next Step"}
                  {currentStepIdx !== steps.length - 1 && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Global Active Timers Sidebar (Always visible if timers exist) */}
        {!showPrep && activeTimers.length > 0 && (
          <div className="hidden lg:flex w-72 bg-white/80 backdrop-blur-md border-l border-slate-200 p-6 flex-col absolute top-0 right-0 h-full shadow-lg z-20 animate-in slide-in-from-right duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 font-sans">Active Background Timers</h3>
            
            <div className="space-y-4 overflow-y-auto w-full pr-2">
              {activeTimers.map(timer => {
                const progress = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;
                const isNearingCompletion = timer.remainingSeconds <= 60 && timer.remainingSeconds > 0;
                
                return (
                  <div 
                    key={timer.id} 
                    className={`bg-white rounded-2xl p-5 border-2 relative overflow-hidden transition-all ${isNearingCompletion ? 'border-amber-400 shadow-md animate-pulse' : 'border-slate-100 shadow-sm'}`}
                  >
                    <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full">
                      <div className={`h-full ${isNearingCompletion ? 'bg-amber-400' : 'bg-brand-500'} transition-all duration-1000 ease-linear`} style={{ width: `${progress}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-start mb-2 mt-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{timer.label}</span>
                      <button onClick={() => cancelTimer(timer.id)} className="text-slate-300 hover:text-slate-500 p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <span className={`text-3xl font-mono font-black tabular-nums tracking-tighter ${isNearingCompletion ? 'text-amber-500' : 'text-slate-800'}`}>
                        {formatTimeDigital(timer.remainingSeconds)}
                      </span>
                    </div>
                    
                    {isNearingCompletion && (
                      <p className="text-[10px] text-amber-600 font-bold uppercase mt-2">Almost ready!</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
