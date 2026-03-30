import React, { useMemo, useState } from 'react';
import { WeeklyPlan } from '../types';
import { getShopAlternatives, ShopAlternative } from '../services/apiClient';

interface ShoppingCartProps {
  plan: WeeklyPlan;
  onClose: () => void;
  visible?: boolean;
}

// ── Commercial Pack Sizes ──
const COMMERCIAL_PACKS: Record<string, string[]> = {
  'Grains & Flour': ['500g', '1kg', '2kg', '5kg', '10kg'],
  'Pulses & Lentils': ['250g', '500g', '1kg', '2kg'],
  'Dairy & Fridge': ['200g', '250g', '500g', '1kg', '1L', '2L', 'Packet (Local)'],
  'Vegetables': ['250g', '500g', '1kg', '2kg', '5kg'],
  'Fruits': ['500g', '1kg', '2kg', '1 Dozen', 'Piece'],
  'Spices & Masalas': ['50g', '100g', '200g', '250g', '500g', 'Standard Bottle'],
  'Oils & Pantry': ['500ml', '1L', '2L', '5L'],
};

const GROCERY_CATEGORIES: Record<string, string[]> = {
  'Vegetables': ['onion', 'tomato', 'potato', 'carrot', 'capsicum', 'beans', 'peas', 'cabbage', 'cauliflower', 'broccoli', 'spinach', 'palak', 'methi', 'coriander', 'mint', 'curry leaves', 'ginger', 'garlic', 'green chilli', 'beetroot', 'cucumber', 'zucchini', 'mushroom', 'corn', 'brinjal', 'baingan', 'bhindi', 'okra', 'radish', 'mooli', 'dudhi', 'lauki', 'bottle gourd', 'pumpkin', 'kaddu', 'turai', 'tinda', 'sweet potato', 'lettuce', 'celery', 'spring onion', 'leek', 'asparagus', 'artichoke', 'bell pepper', 'avocado', 'drumstick', 'banana stem', 'raw banana', 'baby corn', 'cluster beans'],
  'Fruits': ['apple', 'banana', 'mango', 'papaya', 'orange', 'lemon', 'lime', 'pomegranate', 'pineapple', 'watermelon', 'strawberry', 'blueberry', 'raspberry', 'kiwi', 'grapes', 'guava', 'pear', 'plum', 'peach', 'cherry', 'fig', 'dates', 'amla', 'jamun', 'muskmelon', 'coconut'],
  'Dairy & Fridge': ['milk', 'curd', 'yogurt', 'dahi', 'paneer', 'cottage cheese', 'cheese', 'butter', 'ghee', 'cream', 'buttermilk', 'chaas', 'egg', 'whey', 'tofu', 'soya milk', 'almond milk'],
  'Proteins': ['chicken', 'egg', 'fish', 'mutton', 'prawn', 'soya chunk', 'soya bean', 'whey', 'mushroom', 'tofu', 'paneer', 'dal', 'chana', 'sprouts'],
  'Grains & Flour': ['rice', 'wheat', 'atta', 'flour', 'oats', 'dalia', 'semolina', 'suji', 'rava', 'poha', 'ragi', 'jowar', 'bajra', 'barley', 'quinoa', 'couscous', 'millet', 'maida', 'bread', 'roti', 'noodles', 'pasta', 'vermicelli', 'seviyan', 'muesli', 'cornflakes', 'cereal'],
  'Pulses & Lentils': ['dal', 'moong', 'masoor', 'chana', 'toor', 'urad', 'rajma', 'kidney bean', 'chickpea', 'lentil', 'sprouts', 'soya', 'matki', 'lobhia', 'black eyed', 'black gram'],
  'Pantry Essentials': ['oil', 'salt', 'pepper', 'sugar', 'haldi', 'turmeric', 'jeera', 'cumin', 'hing', 'asafoetida', 'mustard', 'rai', 'chilli powder', 'garam masala', 'coriander powder', 'honey', 'vinegar', 'soy sauce', 'ketchup', 'jaggery', 'water', 'ice', 'method', 'ingredients', 'cardamom', 'clove', 'cinnamon', 'bay leaf'],
  'Nuts & Seeds': ['almond', 'cashew', 'walnut', 'pistachio', 'peanut', 'flaxseed', 'chia', 'sesame', 'til', 'pumpkin seed', 'sunflower seed', 'makhana', 'foxnut', 'raisin', 'kishmish', 'dried fig'],
};

const CATEGORY_ICONS: Record<string, string> = {
  'Vegetables': '🥬',
  'Fruits': '🍎',
  'Dairy & Fridge': '🥛',
  'Proteins': '🍗',
  'Grains & Flour': '🌾',
  'Pulses & Lentils': '🫘',
  'Pantry Essentials': '🧂',
  'Nuts & Seeds': '🥜',
  'Other Groceries': '🛒',
};

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  usedIn: string[];
  totalNumeric: number;
  unit: 'g' | 'ml' | 'nos';
  displayQty: string;
  selectedSize?: string;
  isPantry?: boolean;
}

// ── Strict Synonym Map for Radical Reduction ──
const SYNONYMS: Record<string, string> = {
  // Vegetables
  'green chili': 'Green Chilli', 'green chillies': 'Green Chilli', 'green chilly': 'Green Chilli', 'hari mirch': 'Green Chilli',
  'red chili': 'Red Chilli', 'red chillies': 'Red Chilli', 'lal mirch': 'Red Chilli',
  'coriander': 'Coriander', 'cilantro': 'Coriander', 'dhania': 'Coriander', 'kotmir': 'Coriander',
  'ginger': 'Ginger', 'adrak': 'Ginger', 'garlic': 'Garlic', 'lehsun': 'Garlic',
  'onion': 'Onion', 'pyaaz': 'Onion', 'tomato': 'Tomato', 'tamatar': 'Tomato',
  'potato': 'Potato', 'aloo': 'Potato', 'lemon': 'Lemon', 'nimbu': 'Lemon',
  'carrot': 'Carrot', 'carrots': 'Carrot', 'gajar': 'Carrot',
  'spinach': 'Spinach', 'palak': 'Spinach', 'spinach bunch': 'Spinach',
  'mint': 'Mint', 'pudina': 'Mint',
  'cabbage': 'Cabbage', 'patta gobhi': 'Cabbage', 'cauliflower': 'Cauliflower', 'phool gobhi': 'Cauliflower',
  'peas': 'Green Peas', 'green pea': 'Green Peas', 'green peas': 'Green Peas', 'matar': 'Green Peas',
  'bottle gourd': 'Bottle Gourd', 'lauki': 'Bottle Gourd', 'dudhi': 'Bottle Gourd',
  'ivy gourd': 'Ivy Gourd', 'tindora': 'Ivy Gourd', 'kundru': 'Ivy Gourd',
  'mushroom': 'Mushroom', 'mushrooms': 'Mushroom', 'button mushroom': 'Mushroom', 'button mushrooms': 'Mushroom',
  'corn': 'Corn', 'sweet corn': 'Corn', 'baby corn': 'Baby Corn', 'baby corns': 'Baby Corn',
  'french beans': 'French Beans', 'green beans': 'French Beans',
  'cucumber': 'Cucumber', 'kheera': 'Cucumber',
  
  // Dairy & Staples
  'curd': 'Curd/Dahi', 'yogurt': 'Curd/Dahi', 'dahi': 'Curd/Dahi', 'milk': 'Milk', 'doodh': 'Milk',
  'paneer': 'Paneer', 'cottage cheese': 'Paneer', 'ghee': 'Ghee', 'clarified butter': 'Ghee',
  'wheat flour': 'Atta', 'whole wheat flour': 'Atta', 'atta': 'Atta',
  'rice': 'Rice', 'chawal': 'Rice', 'barley': 'Barley', 'jau': 'Barley',
  'oats': 'Oats', 'rolled oats': 'Oats', 'poha': 'Poha', 'flattened rice': 'Poha',
  'dalia': 'Dalia', 'daliya': 'Dalia', 'broken wheat': 'Dalia',
  
  // Pulses & Lentils
  'chana dal': 'Chana Dal', 'split bengal gram': 'Chana Dal', 'chana dal skinless': 'Chana Dal', 'split bengal gram skinless': 'Chana Dal',
  'toor dal': 'Toor Dal', 'arhar dal': 'Toor Dal',
  'moong dal': 'Moong Dal', 'sprouted moong': 'Sprouted Moong', 'sprouted green gram': 'Sprouted Moong',
  'masoor dal': 'Masoor Dal', 'whole red lentils': 'Masoor Dal', 'red lentils': 'Masoor Dal',
  'urad dal': 'Urad Dal', 'split black gram': 'Urad Dal', 'split black lentils': 'Urad Dal',
  'rajma': 'Rajma', 'kidney bean': 'Rajma', 'kidney beans': 'Rajma',
  'chickpeas': 'Chickpeas', 'chickpea': 'Chickpeas', 'chole': 'Chickpeas', 'kabuli chana': 'Chickpeas',
  'bengal gram': 'Besan', 'besan': 'Besan', 'gram flour': 'Besan', 'chickpea flour': 'Besan',
  'sprouts': 'Sprouts', 'mixed sprouts': 'Sprouts',

  // Spices & Pantry
  'haldi': 'Turmeric', 'turmeric': 'Turmeric',
  'jeera': 'Cumin Seeds', 'cumin': 'Cumin Seeds', 'cumin seed': 'Cumin Seeds',
  'sarson': 'Mustard Seeds', 'rai': 'Mustard Seeds', 'mustard seed': 'Mustard Seeds',
  'asafoetida': 'Asafoetida', 'hing': 'Asafoetida',
  'black pepper': 'Black Pepper', 'kali mirch': 'Black Pepper', 'pepper': 'Black Pepper',
  'sugar': 'Sugar', 'chini': 'Sugar', 'jaggery': 'Jaggery', 'gud': 'Jaggery', 'gur': 'Jaggery',
  'garam masala': 'Garam Masala', 'salt': 'Salt', 'namak': 'Salt',
  'chat masala': 'Chaat Masala', 'chaat masala': 'Chaat Masala',
  'chilli powder': 'Red Chilli Powder', 'red chilli powder': 'Red Chilli Powder', 'lal mirch powder': 'Red Chilli Powder',
  'coriander powder': 'Coriander Powder', 'dhaniya powder': 'Coriander Powder',
  'cardamom': 'Cardamom', 'elaichi': 'Cardamom', 'clove': 'Cloves', 'laung': 'Cloves', 'cinnamon': 'Cinnamon', 'dalchini': 'Cinnamon',
  'bay leaf': 'Bay Leaf', 'tej patta': 'Bay Leaf',
  'oil': 'Cooking Oil', 'refined oil': 'Cooking Oil', 'vegetable oil': 'Cooking Oil',
  'honey': 'Honey', 'vinegar': 'Vinegar', 'soy sauce': 'Soy Sauce',
  'tulsi': 'Tulsi', 'holy basil': 'Tulsi',
  'stevia': 'Stevia', 'monk fruit sweetener': 'Stevia',
  'rose essence': 'Rose Water', 'rose water': 'Rose Water', 'gulab jal': 'Rose Water',
  'ajwain': 'Ajwain', 'carom seeds': 'Ajwain',
  
  // Nuts & Snacks
  'peanut': 'Peanuts', 'mungfali': 'Peanuts', 'almond': 'Almonds', 'badam': 'Almonds',
  'cashew': 'Cashews', 'kaju': 'Cashews', 'walnut': 'Walnuts', 'akhrot': 'Walnuts',
  'makhana': 'Makhana', 'foxnut': 'Makhana',
  'flax': 'Flax Seeds', 'flaxseed': 'Flax Seeds', 'flaxseeds': 'Flax Seeds', 'flax seed': 'Flax Seeds', 'alsi': 'Flax Seeds',
  'chia': 'Chia Seeds', 'chia seed': 'Chia Seeds', 'chia seeds': 'Chia Seeds',
  'sesame': 'Sesame Seeds', 'til': 'Sesame Seeds', 'sesame seeds': 'Sesame Seeds'
};

function toMetric(raw: string): { name: string; value: number; unit: 'g' | 'ml' | 'nos' } | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('(') || trimmed.startsWith('For ') || trimmed.length < 2) return null;

  let name = trimmed;
  let value = 0;
  let unit: 'g' | 'ml' | 'nos' = 'g';

  const sepMatch = trimmed.match(/^(.+?)\s*[-–]\s*(.+)$/);
  let qtyPart = sepMatch ? sepMatch[2].toLowerCase() : '';
  name = sepMatch ? sepMatch[1].trim() : trimmed;

  if (!qtyPart) {
     const qtyAtStart = trimmed.match(/^([\d\/\.\s-]+(?:gm|g|kg|ml|l|cup|tbsp|tsp|nos|piece)?)\s+(.+)$/i);
     if (qtyAtStart) {
       qtyPart = qtyAtStart[1].toLowerCase();
       name = qtyAtStart[2].trim();
     }
  }

  const numMatch = qtyPart.match(/(\d+[\d\s.\/]*)/);
  if (numMatch) {
    let rawVal = numMatch[1].trim();
    if (rawVal.includes('/')) {
      const [a, b] = rawVal.split('/').map(n => parseFloat(n));
      value = (a / b) || 0;
    } else {
      value = parseFloat(rawVal);
    }
    if (qtyPart.includes('kg')) { value *= 1000; unit = 'g'; }
    else if (qtyPart.includes('ml')) { unit = 'ml'; }
    else if (qtyPart.includes('l')) { value *= 1000; unit = 'ml'; }
    else if (qtyPart.includes('cup')) { value *= 200; unit = 'g'; }
    else if (qtyPart.includes('tbsp')) { value *= 15; unit = 'g'; }
    else if (qtyPart.includes('tsp')) { value *= 5; unit = 'g'; }
    else if (qtyPart.includes('nos') || qtyPart.includes('piece')) { unit = 'nos'; }
    else { unit = 'g'; }
  } else {
    value = 5; unit = 'g';
  }

  let cleanName = name
    .replace(/\(.*?\)/g, '')
    .replace(/finely chopped|chopped|grated|sliced|diced|minced|crushed|powdered|powder|ground|boiled|steamed|roasted|soaked|peeled|washed|raw|fresh|dried|organic|pinch of|small piece of|to taste|taste|for garnish|leaves|seeds|paste|bunch|half/gi, '')
    .trim()
    .toLowerCase();

  // Strip anything after a comma (like "Green Chilli, Slit" -> "Green Chilli")
  if (cleanName.includes(',')) {
    cleanName = cleanName.split(',')[0].trim();
  }
  
  // Clean up any surviving trailing punctuation or extra spaces
  cleanName = cleanName.replace(/[^a-z0-9\s]/gi, '').trim();

  // HEURISTIC: If cleanName is just a number or a unit, it's noise - reject it
  const UNITS_NOISE = ['g', 'gm', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'nos', 'piece', 'pc', 'pcs'];
  if (/^\d+$/.test(cleanName) || UNITS_NOISE.includes(cleanName) || cleanName.length < 2) return null;

  const EXCLUSIONS = ['water', 'salt', 'ice', 'method', 'ingredients', 'oil as needed', 'water as needed', 'as required', 'optional'];
  if (EXCLUSIONS.some(ex => cleanName === ex || cleanName.includes(` ${ex} `) || cleanName.startsWith(`${ex} `) || cleanName.endsWith(` ${ex}`)) || cleanName.length < 2) return null;

  if (cleanName === 'vegetables' || cleanName === 'mixed vegetables' || cleanName === 'mix veg' || cleanName === 'chopped vegetables') {
    cleanName = 'Assorted Stir-fry Vegetables (Mix Pack)';
  } else {
    for (const [key, standard] of Object.entries(SYNONYMS)) {
      if (cleanName.includes(key)) { cleanName = standard; break; }
    }
  }

  name = cleanName.includes('(') ? cleanName : cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return { name, value, unit };
}

function getSuggestedPack(val: number, unit: string, category: string): string {
  if (category === 'Pantry Essentials') return 'Stocked';
  const packs = COMMERCIAL_PACKS[category] || ['Standard'];
  if (unit === 'nos') return `${Math.ceil(val)} Piece(s)`;
  let minThreshold = 200;
  if (category === 'Grains & Flour') minThreshold = 1000;
  if (category === 'Vegetables') minThreshold = 500;
  if (category === 'Dairy & Fridge') minThreshold = 250;
  if (category === 'Pulses & Lentils') minThreshold = 500;
  const target = Math.max(val, minThreshold);
  for (const p of packs) {
    const pVal = parseInt(p);
    if (isNaN(pVal)) continue;
    const pMetric = p.toLowerCase().includes('kg') || p.toLowerCase().includes('l') ? pVal * 1000 : pVal;
    if (pMetric >= target) return p;
  }
  return packs[packs.length - 1];
}

const MARKETPLACES = [
  { id: 'Zepto', name: 'Zepto', bg: 'bg-[#6B21A8]', hover: 'hover:bg-[#581C87]', textColor: 'text-white', logo: 'https://cdn.zeptonow.com/web-static-assets-prod/artifacts/6.5/images/favicon.png', url: (q: string) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}` },
  { id: 'Blinkit', name: 'Blinkit', bg: 'bg-[#F8CB46]', hover: 'hover:bg-[#E5B93A]', textColor: 'text-[#0C1A0E]', logo: 'https://blinkit.com/favicon.ico', url: (q: string) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}` },
  { id: 'Instamart', name: 'Instamart', bg: 'bg-[#FC8019]', hover: 'hover:bg-[#E5730F]', textColor: 'text-white', logo: 'https://www.swiggy.com/favicon.ico', url: (q: string) => `https://www.swiggy.com/instamart/search?productName=${encodeURIComponent(q)}` },
];

export const ShoppingCart: React.FC<ShoppingCartProps> = ({ plan, onClose, visible = true }) => {
  if (!visible && (!plan || plan.length === 0)) return null;
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [cartItems, setCartItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'list' | 'cart'>('list');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [shopAlternatives, setShopAlternatives] = useState<Record<string, ShopAlternative>>({});
  const [isSyncingShop, setIsSyncingShop] = useState(false);

  const groceryList = useMemo(() => {
    const itemsMap: Record<string, GroceryItem> = {};
    plan.forEach(day => {
      (['breakfast', 'lunch', 'snack', 'dinner'] as const).forEach(slot => {
        const recipes = Array.isArray((day as any)[slot]) ? (day as any)[slot] : [(day as any)[slot]];
        recipes.forEach((recipe: any) => {
          if (!recipe?.ingredients) return;
          recipe.ingredients.forEach((ing: string) => {
            const metric = toMetric(ing);
            if (!metric) return;
            const key = metric.name.toLowerCase();
            const cat = Object.entries(GROCERY_CATEGORIES).find(([_, keywords]) => keywords.some(kw => key.includes(kw)))?.[0] || 'Other Groceries';
            if (itemsMap[key]) {
              itemsMap[key].totalNumeric += metric.value;
              if (!itemsMap[key].usedIn.includes(recipe.name)) itemsMap[key].usedIn.push(recipe.name);
            } else {
              itemsMap[key] = {
                id: key, name: metric.name, category: cat, usedIn: [recipe.name],
                totalNumeric: metric.value, unit: metric.unit, displayQty: '', isPantry: cat === 'Pantry Essentials'
              };
            }
          });
        });
      });
    });

    return Object.values(itemsMap)
      .map(item => ({
        ...item,
        displayQty: item.unit === 'g' && item.totalNumeric >= 1000 ? `${(item.totalNumeric/1000).toFixed(1)}kg` : `${Math.ceil(item.totalNumeric)}${item.unit}`,
        selectedSize: selectedSizes[item.id] || getSuggestedPack(item.totalNumeric, item.unit, item.category)
      }))
      .sort((a, b) => (a.isPantry === b.isPantry ? (a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) : (a.isPantry ? 1 : -1)));
  }, [plan, selectedSizes]);

  const buyList = useMemo(() => {
    const list = groceryList.filter(i => !i.isPantry);
    if (activeFilter === 'All') return list;
    return list.filter(item => item.category.includes(activeFilter) || (activeFilter === 'Proteins' && item.category === 'Proteins'));
  }, [groceryList, activeFilter]);

  const pantryList = groceryList.filter(i => i.isPantry);
  const itemsInCart = groceryList.filter(i => cartItems.has(i.id));

  // ── Sync Shop Alternatives ──
  React.useEffect(() => {
    const syncShop = async () => {
      if (groceryList.length === 0 || isSyncingShop) return;
      setIsSyncingShop(true);
      try {
        const itemNames = groceryList.filter(i => !i.isPantry).map(i => i.name);
        const alts = await getShopAlternatives(itemNames);
        const altMap: Record<string, ShopAlternative> = {};
        alts.forEach(a => { altMap[a.original.toLowerCase()] = a; });
        setShopAlternatives(altMap);
      } catch (err) {
        console.warn('Failed to sync shop alternatives', err);
      } finally {
        setIsSyncingShop(false);
      }
    };
    syncShop();
  }, [groceryList.length]); // Only sync when items change

  return (
    <div className={`fixed inset-0 bg-slate-900/30 backdrop-blur-md z-[100] flex justify-end items-stretch transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white w-full max-w-lg shadow-xl flex flex-col transition-transform duration-500 rounded-l-[2.5rem] overflow-hidden ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header Section */}
        <div className="px-8 pt-10 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-800 tracking-tight">Market Essentials</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{buyList.length} Items to Purchase • {pantryList.length} Stocked</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-50 text-slate-300 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>



          <div className="flex bg-slate-50/50 p-1 rounded-2xl border border-slate-100/50">
            <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'list' ? 'bg-white text-[#00B5CD] shadow-sm' : 'text-slate-400'}`}>Checklist</button>
            <button onClick={() => setActiveTab('cart')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'cart' ? 'bg-white text-[#00B5CD] shadow-sm' : 'text-slate-400'}`}>Basket ({cartItems.size})</button>
          </div>

          {activeTab === 'list' && (
            <div className="mt-5 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['All', 'Dairy', 'Proteins', 'Vegetables', 'Grains'].map(f => (
                <button 
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border ${activeFilter === f ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="flex-grow overflow-y-auto px-8 pb-10 no-scrollbar">
          {activeTab === 'list' ? (
            <div className="space-y-10 mt-4">
              <div className="space-y-8">
                {Array.from(new Set(buyList.map(i => i.category))).map(cat => (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                      <span className="opacity-70">{CATEGORY_ICONS[cat] || '📦'}</span> {cat}
                    </h3>
                    <div className="space-y-1.5">
                      {buyList.filter(i => i.category === cat).map(item => {
                        const isInCart = cartItems.has(item.id);
                        const packs = COMMERCIAL_PACKS[item.category] || ['Standard'];
                        return (
                          <div key={item.id} className={`group p-3.5 rounded-2xl border transition-all flex items-center gap-4 ${isInCart ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
                            <div 
                              onClick={() => setCartItems(p => { const n = new Set(p); isInCart ? n.delete(item.id) : n.add(item.id); return n; })} 
                              className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${isInCart ? 'bg-[#00B5CD] border-[#00B5CD]' : 'border-slate-200 group-hover:border-slate-300'}`}
                            >
                              {isInCart && <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                            </div>
                            <div className="flex-grow">
                              <p className={`text-sm font-medium ${isInCart ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Need: {item.displayQty}</p>
                              </div>
                              {!isInCart && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {(() => {
                                    const shopAlt = shopAlternatives[item.name.toLowerCase()];
                                    if (shopAlt) {
                                      return (
                                        <a 
                                          href={shopAlt.shopUrl} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg transition-all shadow-sm ring-2 ring-emerald-400 ring-offset-1"
                                        >
                                          <span className="text-[10px]">🏠</span>
                                          <span className="text-[8px] font-bold">BN Shop</span>
                                          {shopAlt.price && <span className="text-[8px] font-black text-emerald-400">₹{shopAlt.price}</span>}
                                        </a>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {MARKETPLACES.map(m => (
                                    <a
                                      key={m.id}
                                      href={m.url(item.name)}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={`Search ${item.name} on ${m.name}`}
                                      className={`flex items-center gap-1.5 ${m.bg} ${m.hover} ${m.textColor} px-2.5 py-1.5 rounded-lg transition-all shadow-sm`}
                                    >
                                      <img src={m.logo} alt={m.name} className="w-3 h-3 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                      <span className="text-[8px] font-bold">{m.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <select 
                              disabled={isInCart}
                              value={item.selectedSize}
                              onChange={(e) => setSelectedSizes(p => ({...p, [item.id]: e.target.value}))}
                              className="bg-slate-50/50 text-[9px] font-bold uppercase tracking-wider text-slate-500 px-2.5 py-1 rounded-lg border-none focus:ring-1 focus:ring-slate-200 outline-none cursor-pointer"
                            >
                              {packs.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-50">
                <details className="group">
                  <summary className="list-none cursor-pointer flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] hover:text-slate-500 transition-colors">
                    Pantry Check 
                    <svg className="w-3 h-3 group-open:rotate-180 transition-transform opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                    {pantryList.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-slate-50/50">
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">{item.name}</span>
                        <span className="text-[9px] font-bold text-slate-200 tracking-tighter">{item.totalNumeric}{item.unit}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          ) : (
             <div className="mt-8 space-y-4">
               {itemsInCart.length === 0 ? (
                 <div className="text-center py-24 grayscale opacity-20">
                   <div className="text-4xl mb-4">🛒</div>
                   <h4 className="text-sm font-medium text-slate-400 tracking-tight">Your basket is empty</h4>
                 </div>
               ) : (
                 <div className="space-y-2">
                   {itemsInCart.map(item => (
                     <div key={item.id} className="p-4 bg-slate-50/50 rounded-2xl flex justify-between items-center border border-slate-100/50">
                       <div>
                         <p className="text-sm font-medium text-slate-700">{item.name}</p>
                         <p className="text-[9px] font-bold text-[#00B5CD] uppercase tracking-widest">{item.selectedSize} Pack</p>
                       </div>
                       <button onClick={() => setCartItems(p => { const n = new Set(p); n.delete(item.id); return n; })} className="text-slate-300 hover:text-red-400 transition-colors">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="p-8 pt-4 bg-white border-t border-slate-50">
          <button 
            onClick={() => activeTab === 'list' ? navigator.clipboard.writeText(buyList.map(i => `• ${i.name} (${i.selectedSize})`).join('\n')) : alert('Order Sent')} 
            className="w-full h-14 bg-[#00B5CD] text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-cyan-100 hover:bg-[#00A5BD] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            {activeTab === 'list' ? (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" /></svg> Copy Buy List</>
            ) : 'Checkout Marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
};
