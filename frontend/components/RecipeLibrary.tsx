import React, { useEffect, useState } from 'react';
import { Recipe } from '../types';
import { getAllRecipes } from '../services/apiClient';

export const RecipeLibrary: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setIsLoading(true);
        const data = await getAllRecipes();
        setRecipes(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load recipes.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const filteredRecipes = recipes.filter(recipe => {
    const rawName = (recipe as any).title || (recipe as any).name || '';
    const nameMatch = rawName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Diet: Nested AND
    const dietMatch = !dietFilter || (recipe as any).recipe_type?.toLowerCase().includes(dietFilter.toLowerCase());
    
    // Check both nutrient_tags and health_tags for health goals or allergy exclusions
    const allTags = [...((recipe as any).health_tags || []), ...((recipe as any).nutrient_tags || [])].map(t => t.toLowerCase());
    
    // Goal: Nested AND (Goal search)
    const goalMatch = !goalFilter || allTags.some(t => t.includes(goalFilter.toLowerCase()));
    
    // Allergy: Nested AND (ALL selected allergies MUST NOT be in the tags)
    const allergyMatch = selectedAllergies.length === 0 || 
                         selectedAllergies.every(allergy => !allTags.some(t => t.includes(allergy.toLowerCase())));

    // Proxy for cooking time
    const timeInMins = parseInt((recipe as any).prepTime || "20");
    let timeMatch = true;
    if (timeFilter === 'under30') timeMatch = timeInMins < 30;
    else if (timeFilter === 'under15') timeMatch = timeInMins <= 15;
    else if (timeFilter === 'over30') timeMatch = timeInMins >= 30;

    return nameMatch && dietMatch && goalMatch && allergyMatch && timeMatch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in w-full">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-[#00B5CD] rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center font-serif text-[#00B5CD] font-bold text-xl">B</div>
        </div>
        <div>
          <h3 className="text-xl font-serif font-bold text-slate-800 tracking-tight">Loading Library...</h3>
          <p className="text-slate-400 max-w-xs mx-auto text-sm">Fetching Balance Nutrition recipes.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 mt-10 w-full max-w-4xl mx-auto text-center">
        Error loading library: {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-12 animate-fade-in">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-4xl font-serif font-black text-slate-800 tracking-tight">Recipe Library</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Explore {recipes.length} Clinical Recipes</p>
          </div>
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search by title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-[#00B5CD] focus:ring-4 focus:ring-brand-50 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select 
              value={dietFilter} 
              onChange={(e) => setDietFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-brand-100 transition-all outline-none shadow-sm"
            >
              <option value="">Diet: All Types</option>
              <option value="Veg">Vegetarian</option>
              <option value="Non-Veg">Non-Veg</option>
              <option value="Vegan">Vegan</option>
              <option value="Jain">Jain</option>
            </select>

            <select 
              value={goalFilter} 
              onChange={(e) => setGoalFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-brand-100 transition-all outline-none shadow-sm"
            >
              <option value="">Goal: Any</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Muscle Gain">Muscle Gain</option>
              <option value="Cleanse">Cleanse / Refresh</option>
              <option value="PCOD">PCOD / PCOS</option>
            </select>

            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-brand-100 transition-all outline-none shadow-sm"
            >
              <option value="">Time: Any</option>
              <option value="under15">Under 15 mins</option>
              <option value="under30">Under 30 mins</option>
              <option value="over30">Over 30 mins</option>
            </select>

            <button 
              onClick={() => {setDietFilter(''); setGoalFilter(''); setTimeFilter(''); setSelectedAllergies([]); setSearchTerm('');}}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-[#00B5CD] hover:bg-slate-100 transition-all outline-none shadow-sm"
            >
              Clear All Filters
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Exclusions:</span>
            {['Gluten', 'Lactose', 'Nut', 'Shellfish', 'Soy', 'Sugar'].map(allergy => {
              const isSelected = selectedAllergies.includes(allergy);
              return (
                <button
                  key={allergy}
                  onClick={() => {
                    setSelectedAllergies(prev => 
                      isSelected ? prev.filter(a => a !== allergy) : [...prev, allergy]
                    );
                  }}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                    isSelected 
                      ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' 
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isSelected ? '✕ ' : '+ '}{allergy}-Free
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe, idx) => {
          const title = (recipe as any).title || recipe.name || 'Untitled Recipe';
          const imgUrl = (recipe as any).image || (recipe as any).thumbnail || null;
          
          return (
            <a 
              key={`${title}-${idx}`} 
              href={recipe.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative"
            >
              {/* Image Section */}
              <div className="w-full h-48 bg-slate-100 relative overflow-hidden">
                {imgUrl ? (
                  <img src={imgUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
                    <span className="text-4xl">🍲</span>
                  </div>
                )}
                {recipe.calories && (
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-white/20">
                    <span className="text-xs font-black text-slate-800 tracking-tight">{recipe.calories}</span>
                    <span className="text-[9px] font-bold text-slate-400 ml-1 uppercase tracking-widest">Kcal</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <div className="bg-white/90 backdrop-blur-md p-3 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                     <svg className="w-5 h-5 text-[#00B5CD]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                   </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-serif font-black text-slate-800 mb-1.5 text-lg leading-tight line-clamp-2 group-hover:text-[#00B5CD] transition-colors">{title}</h3>
                
                {recipe.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{recipe.description}</p>
                )}
                
                <div className="mt-auto pt-4 border-t border-slate-50">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50/50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-emerald-100/50 group-hover:bg-emerald-50 transition-colors">
                      <span className="text-xs font-black text-emerald-600 tracking-tight">{recipe.protein || 0}g</span>
                      <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Protein</span>
                    </div>
                    <div className="bg-blue-50/50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-blue-100/50 group-hover:bg-blue-50 transition-colors">
                      <span className="text-xs font-black text-blue-600 tracking-tight">{recipe.carbs || 0}g</span>
                      <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">Carbs</span>
                    </div>
                    <div className="bg-amber-50/50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-amber-100/50 group-hover:bg-amber-50 transition-colors">
                      <span className="text-xs font-black text-amber-600 tracking-tight">{recipe.fats || (recipe as any).fat || 0}g</span>
                      <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">Fats</span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
      
      {filteredRecipes.length === 0 && (
         <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
             <p className="text-slate-500 font-medium">No recipes found matching "{searchTerm}"</p>
         </div>
      )}
    </div>
  );
};
