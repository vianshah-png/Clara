"use client";

import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { OnboardingForm } from '../components/OnboardingForm';
import { PlanDashboard } from '../components/PlanDashboard';
import { WalletModal } from '../components/WalletModal';
import { ShoppingCart } from '../components/ShoppingCart';
import { RecipeLibrary } from '../components/RecipeLibrary';
import { generateMealPlanStream } from '../services/apiClient';
import { UserProfile, WeeklyPlan, DailyPlan } from '../types';

export default function Home() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [coinBalance, setCoinBalance] = useState(35);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [unlockedDaysCount, setUnlockedDaysCount] = useState(1);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [clientId, setClientId] = useState('');
  const [mainTab, setMainTab] = useState<'planner' | 'library'>('planner');

  const handleFormSubmit = async (profile: UserProfile) => {
    if (coinBalance < 5) {
      setIsWalletOpen(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setUserProfile(profile);
    setWeeklyPlan([]);
    
    // Deduct coins for generation
    setCoinBalance(prev => prev - 5);
    
    try {
      setIsStreaming(true);
      await generateMealPlanStream(profile, (newDay: DailyPlan) => {
        setWeeklyPlan(prev => {
          const exists = prev.some(d => d.day === newDay.day);
          if (exists) return prev;
          
          const updated = [...prev, newDay];
          if (updated.length === 1) {
            setIsLoading(false);
          }
          return updated;
        });
      });
    } catch (err) {
      console.error(err);
      setError("We encountered an issue creating your perfect plan.");
      setIsLoading(false);
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleClientIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) return;
    
    // We pass a partial profile with just the user_id
    // The backend handleClientId logic will fetch the actual profile
    handleFormSubmit({ user_id: clientId } as any);
  };

  const handleReset = () => {
    setWeeklyPlan([]);
    setError(null);
    setUserProfile(null);
    setUnlockedDaysCount(1);
  };

  const handleUnlockDay = () => {
    if (coinBalance < 5) {
      setIsWalletOpen(true);
      return;
    }
    setCoinBalance(prev => prev - 5);
    setUnlockedDaysCount(prev => prev + 1);
  };

  return (
    <div className="relative">
      <Layout coinBalance={coinBalance} onOpenWallet={() => setIsWalletOpen(true)}>
        {error && (
          <div className="bg-red-50 text-red-700 p-4 text-center text-sm font-medium border-b border-red-100 sticky top-16 z-40 animate-fade-in">
            {error}
          </div>
        )}
        
        {weeklyPlan.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center min-h-[85vh] py-12 px-4">
             <div className="text-center mb-10 w-full animate-fade-in">
                {/* Planner/Recipe Library Toggle */}
                <div className="flex justify-center mb-8">
                   <div className="bg-slate-50 p-1.5 rounded-full border border-slate-100 flex items-center shadow-inner">
                      <button 
                        onClick={() => setMainTab('planner')}
                        className={`px-10 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all ${mainTab === 'planner' ? 'bg-[#00B5CD] text-white shadow-lg shadow-brand-100' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Planner
                      </button>
                      <button 
                        onClick={() => setMainTab('library')}
                        className={`px-10 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all ${mainTab === 'library' ? 'bg-[#00B5CD] text-white shadow-lg shadow-brand-100' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Recipe Library
                      </button>
                   </div>
                </div>

                {mainTab === 'planner' && (
                  <>
                    <div className="mb-10">
                      <h1 className="text-6xl md:text-7xl font-serif font-black text-[#1A202C] mb-4 tracking-tighter">
                        Clara <span className="text-[#00B5CD]">AI</span>
                      </h1>
                      <p className="text-lg text-slate-400 italic font-serif max-w-2xl mx-auto leading-relaxed">
                        "Professional meal plans grounded in Balance Nutrition's vault, tailored to your clinical needs and cultural palate."
                      </p>
                    </div>

                    {/* New User / Existing Client Toggle */}
                    <div className="flex justify-center mb-16">
                       <div className="bg-[#F7FAFC] p-1.5 rounded-[2rem] border border-slate-100 flex items-center shadow-sm">
                          <button 
                            onClick={() => setMode('existing')}
                            className={`px-12 py-4 rounded-[1.5rem] text-sm font-bold transition-all ${mode === 'existing' ? 'bg-white border border-slate-100 text-[#00B5CD] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Existing Client
                          </button>
                          <button 
                            onClick={() => setMode('new')}
                            className={`px-12 py-4 rounded-[1.5rem] text-sm font-bold transition-all ${mode === 'new' ? 'bg-white border border-slate-100 text-[#00B5CD] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            New User
                          </button>
                       </div>
                    </div>
                  </>
                )}

             </div>
             
             {mainTab === 'planner' ? (
               mode === 'new' ? (
                  <OnboardingForm onSubmit={handleFormSubmit} isLoading={isLoading} />
               ) : (
                  <div className="w-full max-w-md mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100 animate-in slide-in-from-bottom-5 duration-500">
                     <h2 className="text-2xl font-serif font-black text-slate-800 mb-2">Welcome Back</h2>
                     <p className="text-slate-400 text-sm mb-8">Enter your Balance Nutrition Client ID to sync your clinical profile.</p>
                     
                     <form onSubmit={handleClientIdSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Client ID</label>
                          <input 
                            type="text" 
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="e.g. BN-9921"
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#00B5CD] focus:ring-4 focus:ring-brand-50 outline-none transition-all font-bold text-slate-700"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={isLoading || !clientId}
                          className="w-full bg-[#00B5CD] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {isLoading ? 'Syncing...' : 'Sync & Generate'}
                        </button>
                     </form>
                  </div>
               )
             ) : (
               <RecipeLibrary />
             )}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6 animate-fade-in">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-slate-100 border-t-[#00B5CD] rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center font-serif text-[#00B5CD] font-bold text-2xl">B</div>
            </div>
            <div>
              <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2 tracking-tight">Curating your plan...</h3>
              <p className="text-slate-400 max-w-xs mx-auto text-sm">Clara is browsing Balance Nutrition's recipe vault.</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <PlanDashboard 
              plan={weeklyPlan} 
              onReset={handleReset} 
              userProfile={userProfile!}
              isGenerating={isStreaming}
              unlockedDaysCount={unlockedDaysCount}
              onUnlockDay={handleUnlockDay}
              onOpenCart={() => setIsCartOpen(true)}
            />
          </div>
        )}
      </Layout>

      {isWalletOpen && (
        <WalletModal 
          balance={coinBalance} 
          onClose={() => setIsWalletOpen(false)} 
          onAddCoins={(amount) => {
            setCoinBalance(prev => prev + amount);
          }}
        />
      )}
      {weeklyPlan.length > 0 && (
        <ShoppingCart 
          plan={weeklyPlan} 
          onClose={() => setIsCartOpen(false)} 
          visible={isCartOpen}
        />
      )}
    </div>
  );
}
