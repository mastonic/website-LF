import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Instagram, 
  ArrowRight, 
  Menu, 
  X, 
  ChevronDown, 
  Sparkles, 
  Loader2, 
  Camera,
  Play
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Utilitaire sécurisé pour l'API Key
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || "";
  } catch {
    return "";
  }
};

const IMAGES = [
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1200"
];

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visionPrompt, setVisionPrompt] = useState('');
  const [generatedVision, setGeneratedVision] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const generateVision = async () => {
    if (!visionPrompt) return;
    setIsGenerating(true);
    try {
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Vogue editorial photography, minimalist, cinematic lighting, conceptual: ${visionPrompt}. Professional color grading, high contrast.` }] },
      });
      
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setGeneratedVision(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (error) {
      console.error("Erreur AI:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] px-6 py-10 md:px-12 flex justify-between items-center mix-blend-difference">
        <div className="font-impact text-2xl tracking-tighter">
          LF <span className="italic font-serif text-red-600">PARFAIT</span>
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="group flex items-center gap-4">
          <span className="text-[10px] font-black tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity">MENU</span>
          <Menu size={24} />
        </button>
      </nav>

      {/* Overlay Menu */}
      <div className={`fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center transition-all duration-700 ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <button onClick={() => setIsMenuOpen(false)} className="absolute top-10 right-10 hover:rotate-90 transition-transform">
          <X size={40} strokeWidth={1} />
        </button>
        <div className="flex flex-col items-center gap-6">
          {['HOME', 'WORKS', 'LAB', 'CONTACT'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)} className="font-impact text-6xl md:text-9xl hover:text-red-600 transition-colors">
              {item}
            </a>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section id="home" className="relative h-screen flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          <img src={IMAGES[0]} className="w-full h-full object-cover grayscale brightness-50" alt="Hero" />
        </div>
        
        <div className="relative z-20 text-center">
          <h1 className="font-impact text-[20vw] leading-[0.8] mb-4">LF PARFAIT</h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 mt-8">
            <span className="text-[11px] font-black tracking-[0.6em] text-red-600">VISUAL STORYTELLING</span>
            <div className="w-12 h-[1px] bg-white/20 hidden md:block"></div>
            <span className="text-[11px] font-black tracking-[0.6em] opacity-40 italic font-serif">BASED IN PARIS</span>
          </div>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4 opacity-30">
          <div className="w-[1px] h-12 bg-white"></div>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* Works - Editorial Grid */}
      <section id="works" className="py-40 px-6 md:px-12 bg-white text-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-32 reveal">
            <div>
              <h2 className="font-impact text-7xl md:text-9xl">SELECTED</h2>
              <h2 className="font-impact text-7xl md:text-9xl -mt-4 italic font-serif text-red-600">PIECES</h2>
            </div>
            <div className="hidden md:block text-right max-w-xs pb-4">
              <p className="text-xs font-bold leading-relaxed opacity-60">
                Une exploration de l'esthétique contemporaine à travers l'objectif de LF Parfait.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-7 reveal">
              <div className="img-container aspect-[4/5]">
                <img src={IMAGES[1]} className="w-full h-full object-cover" alt="Fashion 1" />
              </div>
              <div className="mt-6 flex justify-between items-baseline">
                <span className="font-serif italic text-2xl">L'ombre Portée</span>
                <span className="text-[10px] font-black tracking-widest opacity-40">SERIE 01 — 2024</span>
              </div>
            </div>
            <div className="md:col-span-5 md:pt-32 reveal">
              <div className="img-container aspect-[3/4]">
                <img src={IMAGES[2]} className="w-full h-full object-cover" alt="Fashion 2" />
              </div>
              <div className="mt-6">
                <span className="font-serif italic text-2xl">Minimalisme Absolu</span>
                <p className="text-[10px] font-black tracking-widest opacity-40 mt-2">EDITORIAL WORK</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Lab */}
      <section id="lab" className="py-40 px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center reveal">
          <div className="inline-flex items-center gap-3 px-4 py-2 border border-white/10 rounded-full mb-12">
            <Sparkles size={14} className="text-red-600" />
            <span className="text-[9px] font-black tracking-[0.4em] uppercase">Vision Intelligence Lab</span>
          </div>
          <h2 className="font-impact text-5xl md:text-8xl mb-12">CRAFT YOUR <br/><span className="italic font-serif text-red-600">INSPIRATION</span></h2>
          
          <div className="relative group max-w-2xl mx-auto">
            <input 
              type="text" 
              value={visionPrompt}
              onChange={(e) => setVisionPrompt(e.target.value)}
              placeholder="Décrivez votre vision artistique..." 
              className="w-full bg-transparent border-b-2 border-white/10 py-6 text-2xl md:text-4xl outline-none focus:border-red-600 transition-all font-serif italic text-center"
            />
            <button 
              onClick={generateVision}
              disabled={isGenerating}
              className="mt-12 group flex items-center gap-6 mx-auto bg-white text-black px-10 py-5 rounded-full font-black text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : 'GENERATE VISION'}
              <ArrowRight size={16} />
            </button>
          </div>

          {generatedVision && (
            <div className="mt-24 reveal active">
              <div className="relative aspect-square md:aspect-video max-w-5xl mx-auto overflow-hidden rounded-2xl grayscale hover:grayscale-0 transition-all duration-1000 border border-white/5">
                <img src={generatedVision} alt="Vision AI" className="w-full h-full object-cover" />
                <div className="absolute bottom-6 right-6 text-[8px] tracking-[0.4em] font-black uppercase opacity-40">AI GENERATED CONCEPT</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="pt-60 pb-20 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-24 items-end mb-40">
          <div className="reveal">
            <h3 className="font-impact text-8xl md:text-[12rem] leading-none mb-12">CONTACT</h3>
            <div className="flex flex-col gap-4">
              <a href="mailto:hello@lfparfait.com" className="text-3xl md:text-5xl font-serif italic hover:text-red-600 transition-colors">hello@lfparfait.com</a>
              <a href="#" className="text-xl tracking-[0.3em] font-black opacity-40">INSTAGRAM</a>
            </div>
          </div>
          <div className="reveal md:text-right">
             <div className="font-impact text-2xl mb-8">LF <span className="italic font-serif text-red-600">PARFAIT</span></div>
             <p className="text-[10px] tracking-[0.4em] font-black opacity-30 leading-loose">
               DISPONIBLE POUR PROJETS <br/>ÉDITORIAUX & COMMERCIAUX <br/>DANS LE MONDE ENTIER.
             </p>
          </div>
        </div>
        <div className="text-center opacity-20 text-[9px] font-black tracking-[0.5em] uppercase border-t border-white/5 pt-20">
          © 2025 LF PARFAIT STUDIO — TOUS DROITS RÉSERVÉS
        </div>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
