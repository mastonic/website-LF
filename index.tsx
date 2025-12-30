import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  ArrowRight, 
  Menu, 
  X, 
  ChevronDown, 
  Sparkles, 
  Loader2, 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  // Accès sécurisé à la variable d'environnement
  try {
    return (typeof process !== 'undefined' && process.env?.API_KEY) || "";
  } catch {
    return "";
  }
};

const IMAGES = {
  hero: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=2000",
  profile: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1000",
  work1: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1200",
  work2: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200",
};

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

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));
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
        contents: { parts: [{ text: `Vogue high fashion photography, extreme minimalist, cinematic sharp lighting, dramatic shadows, black background, conceptual: ${visionPrompt}. 8k resolution, professional studio.` }] },
      });
      
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setGeneratedVision(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[150] px-6 py-8 md:px-12 flex justify-between items-center mix-blend-difference">
        <div className="font-impact text-2xl tracking-tighter">
          LF <span className="italic font-serif text-red-600">PARFAIT</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)} 
          className="group flex items-center gap-4 hover:text-red-600 transition-colors"
          aria-label="Open Menu"
        >
          <span className="text-[10px] font-black tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-all duration-300">EXPLORE</span>
          <Menu size={24} />
        </button>
      </nav>

      {/* Overlay Menu */}
      <div 
        className={`fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <button 
          onClick={() => setIsMenuOpen(false)} 
          className="absolute top-10 right-10 hover:rotate-90 transition-transform text-white"
          aria-label="Close Menu"
        >
          <X size={40} strokeWidth={1} />
        </button>
        <div className="flex flex-col items-center gap-4">
          {['HOME', 'WORKS', 'PROFILE', 'LAB', 'CONTACT'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`} 
              onClick={() => setIsMenuOpen(false)} 
              className="font-impact text-6xl md:text-9xl text-white hover:text-red-600 transition-all hover:italic tracking-tighter"
            >
              {item}
            </a>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <img 
            src={IMAGES.hero} 
            className="w-full h-full object-cover grayscale opacity-80" 
            alt="Cinematic Hero" 
          />
        </div>
        
        <div className="relative z-20 text-center">
          <h1 className="font-impact text-[18vw] leading-[0.8] mb-4 mix-blend-overlay opacity-90">LF PARFAIT</h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 mt-8">
            <span className="text-[11px] font-black tracking-[0.6em] text-red-600">EDITORIAL VISION</span>
            <div className="w-12 h-[1px] bg-white/20 hidden md:block"></div>
            <span className="text-[11px] font-black tracking-[0.6em] opacity-60 italic font-serif uppercase">Paris — London</span>
          </div>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4 opacity-30">
          <div className="w-[1px] h-12 bg-white"></div>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* Profile Section */}
      <section id="profile" className="py-40 px-6 md:px-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 md:gap-32 items-center">
          <div className="reveal">
            <h2 className="font-impact text-7xl md:text-9xl mb-12">THE<br/><span className="italic font-serif text-red-600">ARTIST</span></h2>
            <p className="text-base font-medium leading-relaxed opacity-60 max-w-md mb-10">
              Photographe visionnaire basé à Paris, LF Parfait repousse les limites de l'imagerie éditoriale. Spécialisé dans la haute couture et le portrait conceptuel, il capture l'essence brute au-delà de la surface.
            </p>
            <div className="flex gap-12">
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest text-red-600 mb-2">ESTABLISHED</span>
                <span className="font-serif italic text-3xl">2018</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest text-red-600 mb-2">STUDIO</span>
                <span className="font-serif italic text-3xl">Paris, FR</span>
              </div>
            </div>
          </div>
          <div className="reveal">
            <div className="img-container rounded-sm border border-white/5 shadow-2xl">
              <img 
                src={IMAGES.profile} 
                className="w-full h-full object-cover" 
                alt="Portrait of the artist" 
              />
            </div>
            <div className="mt-8 text-right">
              <span className="text-[10px] font-black tracking-[0.5em] opacity-40 uppercase">LF PARFAIT / CREATIVE DIRECTOR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Works Section */}
      <section id="works" className="py-40 px-6 md:px-12 bg-white text-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-32 reveal">
            <div>
              <h2 className="font-impact text-7xl md:text-9xl">LATEST</h2>
              <h2 className="font-impact text-7xl md:text-9xl -mt-4 italic font-serif text-red-600">WORKS</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-7 reveal">
              <div className="img-container">
                <img src={IMAGES.work1} alt="Work Editorial 01" />
              </div>
              <div className="mt-6 flex justify-between items-baseline">
                <span className="font-serif italic text-2xl">L'Éclat Obscur</span>
                <span className="text-[10px] font-black tracking-widest opacity-40 uppercase">Editorial — 2024</span>
              </div>
            </div>
            <div className="md:col-span-5 md:pt-40 reveal">
              <div className="img-container">
                <img src={IMAGES.work2} alt="Work Editorial 02" />
              </div>
              <div className="mt-6">
                <span className="font-serif italic text-2xl">Fragmented Light</span>
                <p className="text-[10px] font-black tracking-widest opacity-40 mt-2 uppercase">Conceptual Piece</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Lab */}
      <section id="lab" className="py-40 px-6 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center reveal">
          <div className="inline-flex items-center gap-3 px-6 py-2 border border-white/10 rounded-full mb-12">
            <Sparkles size={14} className="text-red-600" />
            <span className="text-[9px] font-black tracking-[0.5em] uppercase">Intelligence Vision Lab</span>
          </div>
          <h2 className="font-impact text-5xl md:text-8xl mb-12 uppercase">CREATE YOUR<br/><span className="italic font-serif text-red-600">EDITORIAL</span></h2>
          
          <div className="relative group max-w-2xl mx-auto">
            <input 
              type="text" 
              value={visionPrompt}
              onChange={(e) => setVisionPrompt(e.target.value)}
              placeholder="Décrivez une scène de mode..." 
              className="w-full bg-transparent border-b-2 border-white/10 py-8 text-2xl md:text-4xl outline-none focus:border-red-600 transition-all font-serif italic text-center text-white placeholder:opacity-20"
            />
            <button 
              onClick={generateVision}
              disabled={isGenerating}
              className="mt-16 group flex items-center gap-6 mx-auto bg-white text-black px-12 py-6 rounded-full font-black text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : 'GENERATE MASTERPIECE'}
              <ArrowRight size={16} />
            </button>
          </div>

          {generatedVision && (
            <div className="mt-24 reveal active">
              <div className="relative aspect-video max-w-5xl mx-auto overflow-hidden rounded-sm grayscale hover:grayscale-0 transition-all duration-1000 border border-white/5 shadow-2xl">
                <img src={generatedVision} alt="Vision AI" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="pt-60 pb-20 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-24 items-end mb-40">
          <div className="reveal">
            <h3 className="font-impact text-8xl md:text-[12rem] leading-none mb-12">TALK</h3>
            <div className="flex flex-col gap-6">
              <a href="mailto:studio@lfparfait.com" className="text-3xl md:text-5xl font-serif italic hover:text-red-600 transition-colors">studio@lfparfait.com</a>
              <a href="#" className="text-xl tracking-[0.4em] font-black opacity-40 uppercase">Instagram — Behance</a>
            </div>
          </div>
          <div className="reveal md:text-right">
             <div className="font-impact text-2xl mb-8 uppercase">LF <span className="italic font-serif text-red-600">Parfait</span></div>
             <p className="text-[10px] tracking-[0.5em] font-black opacity-30 leading-loose uppercase">
               Available for commissions <br/>& worldwide assignments.
             </p>
          </div>
        </div>
        <div className="text-center opacity-20 text-[9px] font-black tracking-[0.5em] uppercase border-t border-white/5 pt-20">
          © 2025 LF PARFAIT STUDIO — BUILT FOR ELEGANCE
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