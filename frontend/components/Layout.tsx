import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  coinBalance?: number;
  onOpenWallet?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, coinBalance = 0, onOpenWallet }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-50 py-3 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#00B5CD] rounded-full flex items-center justify-center text-white font-black text-xl shadow-sm">
              B
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-black tracking-tight text-[#00B5CD] uppercase leading-none">
                Balance
              </span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none">
                Weight Loss & More!
              </span>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-10">
            <a href="#" className="text-xs font-bold text-slate-500 hover:text-[#00B5CD] transition-colors">Recipe Library</a>
            
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
               <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[8px] text-white font-black">BN</span>
               </div>
               <span className="text-sm font-black text-slate-700">{coinBalance}</span>
               <button 
                 onClick={onOpenWallet}
                 className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-[#00B5CD] hover:border-[#00B5CD] transition-all"
               >
                 <span className="font-bold text-xs">+</span>
               </button>
            </div>

            <button className="bg-[#00B5CD] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-100 hover:bg-[#00A5BD] transition-all active:scale-95 uppercase tracking-wider">
              Book Consult
            </button>
          </nav>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center text-white font-bold text-xs">B</div>
              <span className="text-lg font-serif font-bold text-slate-900">Balance Nutrition</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
              Empowering your health journey with clinical precision and the richness of authentic Indian flavors. Powered by Clara AI.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-600 cursor-pointer">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-600 cursor-pointer">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.441 1.441 1.441c.795 0 1.439-.645 1.439-1.441s-.644-1.44-1.439-1.44z"/></svg>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-serif font-bold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="hover:text-brand-600 transition-colors cursor-pointer">About Us</li>
              <li className="hover:text-brand-600 transition-colors cursor-pointer">Success Stories</li>
              <li className="hover:text-brand-600 transition-colors cursor-pointer">Recipe Categories</li>
              <li className="hover:text-brand-600 transition-colors cursor-pointer">Clinical Guidelines</li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-bold text-slate-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="hover:text-brand-600 transition-colors cursor-pointer">FAQ</li>
              <li className="hover:text-brand-600 transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-brand-600 transition-colors cursor-pointer">Terms of Service</li>
              <li className="hover:text-brand-600 transition-colors cursor-pointer">Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-50 text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Balance Nutrition. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
