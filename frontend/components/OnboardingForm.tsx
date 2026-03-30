import React, { useState } from 'react';
import { UserProfile } from '../types';
import { InputGroup } from './InputGroup';

interface OnboardingFormProps {
  onSubmit: (profile: UserProfile) => void;
  isLoading: boolean;
}

const CUISINE_OPTIONS = [
  "North Indian",
  "South Indian",
  "Maharashtrian",
  "Gujarati",
  "Bengali",
  "Italian / Pasta",
  "Mexican / Wraps",
  "Asian / Thai",
  "Continental / Salads"
];

const ALLERGY_OPTIONS = [
  "Gluten Free",
  "Lactose Free",
  "Nut Free",
  "No Added Sugar",
  "Egg Free",
  "Soy Free"
];

const ETHNICITY_OPTIONS = [
  "Indian",
  "Asian",
  "Middle Eastern",
  "Mediterranean",
  "Western / European",
  "Hispanic / Latino",
  "African",
  "Other"
];

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<UserProfile>({
    age: '30',
    gender: 'Female',
    height: '165',
    weight: '70',
    goal: 'Weight Loss',
    dietType: 'Vegetarian',
    activityLevel: 'Moderately Active',
    ethnicity: '',
    cuisine: '',
    allergies: ''
  });

  const handleChange = (field: keyof UserProfile) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBubbleToggle = (field: 'cuisine' | 'allergies', value: string) => {
    setFormData(prev => {
      const currentString = prev[field];
      const currentArray = currentString ? currentString.split(', ') : [];
      
      let newArray;
      if (currentArray.includes(value)) {
        newArray = currentArray.filter(item => item !== value);
      } else {
        newArray = [...currentArray, value];
      }
      
      return { ...prev, [field]: newArray.join(', ') };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in">
      <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
        
        {/* Section 1: Core Vitals */}
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#00B5CD] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-brand-100"></div>
            <h3 className="text-3xl font-serif font-black text-slate-800 tracking-tight">Core Vitals</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <InputGroup 
              label="Age" 
              id="age" 
              type="number" 
              value={formData.age} 
              onChange={handleChange('age')} 
              required 
            />
            <InputGroup 
              label="Gender" 
              id="gender" 
              value={formData.gender} 
              onChange={handleChange('gender')} 
              options={['Female', 'Male', 'Other']}
              required 
            />
            <InputGroup 
              label="Weight (kg)" 
              id="weight" 
              type="number" 
              value={formData.weight} 
              onChange={handleChange('weight')} 
              required 
            />
            <InputGroup 
              label="Height (cm)" 
              id="height" 
              type="number" 
              value={formData.height} 
              onChange={handleChange('height')} 
              required 
            />
          </div>
        </div>

        {/* Section 2: Dietary Architecture */}
        <div className="p-8 sm:p-10 bg-white">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#00B5CD] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-brand-100"></div>
            <h3 className="text-3xl font-serif font-black text-slate-800 tracking-tight">Dietary Architecture</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <InputGroup 
              label="Type" 
              id="dietType" 
              value={formData.dietType} 
              onChange={handleChange('dietType')} 
              options={['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']}
              required 
            />
            <InputGroup 
              label="Goal" 
              id="goal" 
              value={formData.goal} 
              onChange={handleChange('goal')} 
              options={['Weight Loss', 'Weight Gain', 'Maintenance']}
              required 
            />
            <InputGroup 
              label="Activity" 
              id="activityLevel" 
              value={formData.activityLevel} 
              onChange={handleChange('activityLevel')} 
              options={['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active']}
              required 
            />
          </div>
        </div>

        {/* Section 3: Personalized Filters */}
        <div className="p-8 sm:p-10 bg-white">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#00B5CD] text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-brand-100"></div>
            <h3 className="text-3xl font-serif font-black text-slate-800 tracking-tight">Personalized Filters</h3>
          </div>

          <div className="space-y-8">
             {/* Ethnicity Selection */}
             <div>
                <InputGroup 
                  label="Ethnicity (Influences Cuisine Defaults)" 
                  id="ethnicity" 
                  value={formData.ethnicity} 
                  onChange={handleChange('ethnicity')} 
                  options={ETHNICITY_OPTIONS}
                  required
                />
             </div>

             {/* Cuisine Bubbles */}
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">
                  Preferred Cuisines (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map(opt => {
                    const isSelected = formData.cuisine.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleBubbleToggle('cuisine', opt)}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-bold transition-all border ${
                          isSelected 
                            ? 'bg-[#00B5CD] border-[#00B5CD] text-white shadow-lg transform scale-105' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-[#00B5CD] hover:text-[#00B5CD]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
             </div>


             {/* Allergy Bubbles */}
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">
                  Allergies & Restrictions (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map(opt => {
                    const isSelected = formData.allergies.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleBubbleToggle('allergies', opt)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-red-500 border-red-500 text-white shadow-md transform scale-105' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500'
                        }`}
                      >
                        {isSelected && <span className="mr-1">✕</span>}
                        {opt}
                      </button>
                    );
                  })}
                </div>
             </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="p-8 sm:p-10 bg-slate-50 flex justify-end">
          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-brand-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-brand-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Curating Plan...
                </>
            ) : (
                <>
                    Generate My Plan
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
