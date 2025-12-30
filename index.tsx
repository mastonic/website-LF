
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Camera, 
  Wind, 
  Instagram, 
  Mail, 
  ArrowRight, 
  Maximize2, 
  X,
  Menu,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Star,
  Quote
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Configuration & Données ---
const PROFILE_PIC = "data:image/jpeg;base64,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";
const INSTAGRAM_URL = "https://www.instagram.com/lfperfait_photographe_videaste/";

const SERVICES = [
  { id: 'portrait', title: 'PORTRAITURE', description: 'Capturer l\'essence et le caractère.', icon: <Camera /> },
  { id: 'event', title: 'EVENT COVERAGE', description: 'Immortaliser vos événements majeurs.', icon: <Wind /> },
  { id: 'commercial', title: 'COMMERCIAL PHOTO', description: 'Sublimer vos produits et votre marque.', icon: <Camera />, highlight: true },
  { id: 'wedding', title: 'WEDDING PHOTO', description: 'Le récit visuel de votre union.', icon: <Wind /> },
  { id: 'fineart', title: 'FINE ART PHOTO', description: 'L\'image comme une œuvre d\'art.', icon: <Camera /> }
];

const EXHIBITIONS = [
  { year: '2024', title: 'Unveiling Perspectives', location: 'Madrid', description: 'Une immersion dans le dialogue entre ombre et lumière.' },
  { year: '2023', title: 'Real Me', location: 'Paris', description: 'L\'authenticité brute capturée sans artifice.' },
  { year: '2022', title: 'Eye and Eye', location: 'Berlin', description: 'La symétrie du regard humain face à la nature.' }
];

const REVIEWS = [
  { id: 1, name: "Marc Lefebvre", role: "Directeur Artistique", content: "Une vision unique. LF Parfait a su capturer l'âme de notre campagne avec une précision chirurgicale.", rating: 5 },
  { id: 2, name: "Sophie Durant", role: "Modèle", content: "Plus qu'un photographe, un véritable metteur en scène. Chaque cliché raconte une histoire profonde.", rating: 5 },
  { id: 3, name: "Antoine G.", role: "CEO Lumina Fashion", content: "L'excellence à l'état pur. Le rendu final a dépassé toutes nos attentes commerciales.", rating: 5 }
];

const PARTNERS = [
  "LUMINA FASHION", "AETHER MAGAZINE", "HORIZON DRONES", "VOGUE VISION", "APEX STUDIO", "LUX MEDIA"
];

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visionPrompt, setVisionPrompt] = useState('');
  const [generatedVision, setGeneratedVision] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.1}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const generateVision = async () => {
    if (!visionPrompt) return;
    setIsGenerating(true);
    try {
      // Use process.env.API_KEY directly as required by guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        // Pass contents as a single object per guidelines
        contents: { parts: [{ text: `High-end editorial artistic photography moodboard for: ${visionPrompt}. Cinematic lighting, minimalist luxury style, 4k.` }] },
      });
      
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setGeneratedVision(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (error) {
      console.error("Erreur generation vision:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] overflow-x-hidden text-white">
      {/* HEADER / NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-8 md:px-12 flex justify-between items-center mix-blend-difference">
        <div className="font-impact text-2xl md:text-3xl text-white tracking-tighter">LF <span className="italic font-serif text-red-600">PARFAIT</span></div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex gap-12 text-[10px] font-bold tracking-[0.4em] text-white/60">
          <a href="#about" className="hover:text-white transition-colors">ABOUT ME</a>
          <a href="#works" className="hover:text-white transition-colors">WORKS</a>
          <a href="#services" className="hover:text-white transition-colors">SERVICES</a>
          <a href="#testimonials" className="hover:text-white transition-colors">REVIEWS</a>
          <a href="#contact" className="hover:text-white transition-colors">CONTACT</a>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-6">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className="text-white hover:text-red-600 transition-colors hidden sm:block">
            <Instagram size={20} />
          </a>
          <button onClick={() => setIsMenuOpen(true)} className="text-white p-2" aria-label="Open menu">
            <Menu size={32} />
          </button>
        </div>
      </nav>

      {/* FULLSCREEN OVERLAY MENU */}
      <div className={`fixed inset-0 z-[200] bg-[#0d0d0d] flex flex-col items-center justify-center space-y-12 transition-all duration-500 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
        <button onClick={() => setIsMenuOpen(false)} className="absolute top-10 right-10 text-white hover:rotate-90 transition-transform">
          <X size={48} strokeWidth={1} />
        </button>
        <div className="flex flex-col items-center gap-8">
          <a href="#about" className="font-impact text-5xl md:text-8xl hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>ABOUT ME</a>
          <a href="#works" className="font-impact text-5xl md:text-8xl hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>WORKS</a>
          <a href="#services" className="font-impact text-5xl md:text-8xl hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>SERVICES</a>
          <a href="#contact" className="font-impact text-5xl md:text-8xl hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>CONTACT</a>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-[0.03]">
          <h1 className="font-impact text-[25vw] leading-none whitespace-nowrap">LF PARFAIT</h1>
        </div>
        
        <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 items-center gap-12">
          <div className="md:col-span-4 reveal active">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-[1px] bg-red-600"></div>
                <div className="text-[10px] tracking-[0.5em] text-red-600 font-black">ESTABLISHED 2002</div>
             </div>
             <div className="font-serif italic text-4xl md:text-5xl leading-tight mb-8">Capturer l'âme de l'instant présent.</div>
             <p className="text-white/40 text-sm max-w-xs leading-relaxed">Spécialiste de la narration visuelle, fusionnant technique chirurgicale et intuition artistique.</p>
          </div>

          <div className="md:col-span-4 flex justify-center py-12 reveal active" style={{ transitionDelay: '0.2s' }}>
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-red-600 rounded-full blur-[80px] opacity-10"></div>
              <div className="absolute inset-0 border border-white/10 rounded-full overflow-hidden p-4">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/5">
                  <img src={PROFILE_PIC} className="w-full h-full object-cover grayscale brightness-110 contrast-125" alt="Profile" />
                </div>
              </div>
              <svg className="absolute -inset-12 w-[calc(100%+96px)] h-[calc(100%+96px)] circle-text pointer-events-none" viewBox="0 0 100 100">
                <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="transparent" />
                <text className="text-[4px] uppercase font-black tracking-[0.6em] fill-white/10">
                  <textPath xlinkHref="#circlePath">
                    LF PARFAIT • VISUAL STORYTELLER • AWARD WINNER • CREATIVE VISIONARY •
                  </textPath>
                </text>
              </svg>
            </div>
          </div>

          <div className="md:col-span-4 md:text-right reveal active" style={{ transitionDelay: '0.4s' }}>
             <div className="font-impact text-[12rem] md:text-[18rem] text-white leading-[0.7] -tracking-widest">LF</div>
             <div className="font-impact text-6xl md:text-9xl text-white/5 leading-none -mt-4">PARFAIT</div>
             <div className="mt-12 flex flex-col md:items-end gap-2">
                <span className="text-[10px] tracking-[0.4em] text-white/40">AN AWARD-WINNING</span>
                <span className="text-[10px] tracking-[0.4em] text-white/40 italic font-serif underline decoration-red-600 underline-offset-8">PHOTOGRAPHER OF THE YEAR</span>
             </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/10 flex flex-col items-center gap-4">
          <ChevronDown size={24} className="animate-bounce" />
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-40 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-end">
          <div className="reveal">
            <h2 className="font-impact text-8xl md:text-[14rem] leading-none mb-12">ABOUT</h2>
            <div className="flex gap-6 items-center mb-10">
               <div className="w-4 h-4 rounded-full bg-red-600"></div>
               <span className="text-xs tracking-[0.4em] uppercase font-black text-red-600">ARTISTIC JOURNEY</span>
            </div>
            <p className="text-2xl md:text-4xl text-white/80 leading-tight font-serif italic mb-12">
              "LF Parfait se dresse comme un luminaire dans le royaume du storytelling visuel."
            </p>
            <p className="text-white/40 text-lg leading-relaxed max-w-xl">
              Mon travail explore la tension entre l'ordre géométrique et le chaos émotionnel. Chaque cliché est une pièce de puzzle d'une narration plus vaste.
            </p>
          </div>
          <div className="reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="relative aspect-[4/5] bg-white/5 group overflow-hidden">
               <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover grayscale contrast-125 transition-transform duration-1000" alt="Work" />
               <div className="absolute inset-0 border-[30px] border-white/5 m-8 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* WORKS MASONRY */}
      <section id="works" className="py-40 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-32 reveal">
              <h2 className="font-impact text-8xl md:text-9xl mb-4">WORKS</h2>
              <div className="inline-block px-4 py-1 bg-red-600 text-[10px] font-black tracking-widest text-white">SELECTED PIECES</div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
             {EXHIBITIONS.map((ex, idx) => (
               <div key={idx} className="reveal" style={{ transitionDelay: `${idx * 0.2}s` }}>
                  <div className="group relative aspect-[16/9] mb-12 overflow-hidden bg-white/5 shadow-2xl">
                    <img src={`https://images.unsplash.com/photo-${1516035069371 + idx * 1000}?auto=format&fit=crop&q=80&w=1200`} className="w-full h-full object-cover grayscale opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-1000" alt={ex.title} />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-red-600 font-impact text-2xl block mb-2">{ex.year}</span>
                      <h3 className="font-impact text-4xl mb-4">{ex.title}</h3>
                      <p className="text-white/40 text-sm max-w-sm">{ex.description}</p>
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* REVIEWS SECTION */}
      <section id="testimonials" className="py-40 bg-[#111] px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 reveal text-center md:text-left">
             <h2 className="font-impact text-8xl md:text-9xl leading-none">REVIEWS</h2>
             <p className="text-red-600 text-xs tracking-[0.5em] font-black mt-4">WHAT CLIENTS SAY</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-white/5">
            {REVIEWS.map((review, idx) => (
              <div key={review.id} className="bg-[#111] p-12 reveal hover:bg-white/[0.02] transition-colors" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <Quote className="text-red-600 mb-8" size={32} />
                <p className="font-serif italic text-xl text-white/80 mb-10 leading-relaxed">"{review.content}"</p>
                <div className="flex gap-1 mb-6">
                  {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} fill="#ff0000" stroke="#ff0000" />)}
                </div>
                <div>
                   <h4 className="font-impact text-lg text-white">{review.name}</h4>
                   <p className="text-[10px] tracking-widest text-white/30 uppercase mt-1">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS LOGO CLOUD */}
      <section className="py-24 border-y border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6">
           <div className="flex flex-wrap justify-center md:justify-between items-center gap-12 md:gap-8">
             {PARTNERS.map((partner, idx) => (
               <div key={idx} className="font-impact text-xl md:text-2xl text-white/20 hover:text-red-600 transition-all cursor-default select-none tracking-tighter reveal" style={{ transitionDelay: `${idx * 0.1}s` }}>
                 {partner}
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-40 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 reveal">
             <h2 className="font-impact text-8xl md:text-9xl">SERVICES</h2>
             <button className="mt-8 md:mt-0 flex items-center gap-6 px-10 py-5 bg-white text-black font-black text-xs tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all rounded-full group">
                WORK WITH ME <ArrowUpRight size={18} />
             </button>
          </div>
          <div className="divide-y divide-white/10">
            {SERVICES.map((s, idx) => (
              <div key={s.id} className={`group flex flex-col md:flex-row md:items-center justify-between p-12 transition-all cursor-pointer ${s.highlight ? 'bg-red-600 text-white' : 'hover:bg-white/5'}`}>
                <div className="flex items-center gap-12">
                   <div className={`text-xs font-black opacity-30 group-hover:opacity-100 transition-opacity ${s.highlight ? 'text-white' : 'text-red-600'}`}>0{idx+1}</div>
                   <div>
                      <h3 className="font-impact text-4xl md:text-5xl">{s.title}</h3>
                      <p className={`text-sm mt-3 ${s.highlight ? 'text-white/70' : 'text-white/40'}`}>{s.description}</p>
                   </div>
                </div>
                <div className={`mt-8 md:mt-0 p-5 rounded-full border transition-all md:-translate-x-10 group-hover:translate-x-0 group-hover:opacity-100 ${s.highlight ? 'border-white text-white' : 'border-white/10 text-white opacity-0'}`}>
                   <ArrowRight size={32} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BANANA NANO VISION LAB */}
      <section className="py-40 bg-[#0a0a0a] px-6">
        <div className="max-w-4xl mx-auto border-2 border-white/5 p-12 md:p-24 rounded-[3rem] text-center relative overflow-hidden">
           <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-600/10 rounded-full blur-[100px]"></div>
           <Sparkles size={48} className="mx-auto text-red-600 mb-10" />
           <h2 className="font-impact text-6xl md:text-7xl mb-6 uppercase tracking-tighter">VISION LAB</h2>
           <p className="text-white/30 mb-16 uppercase text-[10px] tracking-[0.6em] font-black">Generate Art Inspiration via Gemini AI</p>
           <div className="flex flex-col md:flex-row gap-6 mb-16 relative z-10">
              <input 
                type="text" 
                value={visionPrompt}
                onChange={(e) => setVisionPrompt(e.target.value)}
                placeholder="Ex: Futurism, cinematic neon, rain..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-8 py-5 text-lg outline-none focus:border-red-600 transition-all text-white"
              />
              <button 
                onClick={generateVision}
                disabled={isGenerating}
                className="bg-red-600 text-white px-12 py-5 rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center min-w-[180px]"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : 'GENERATE'}
              </button>
           </div>
           {generatedVision && (
             <div className="mt-12 animate-in slide-in-from-bottom duration-700">
                <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-white/10 shadow-inner">
                  <img src={generatedVision} alt="Vision" className="w-full h-full object-cover grayscale contrast-125" />
                </div>
                <p className="mt-6 text-[10px] text-white/20 italic tracking-widest font-black uppercase">Result via Banana Nano</p>
             </div>
           )}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="relative py-60 px-6 overflow-hidden flex flex-col items-center bg-black">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-10 pointer-events-none select-none">
           <h2 className="font-impact text-[22vw] leading-none whitespace-nowrap">CONTACT</h2>
        </div>
        <div className="relative z-10 text-center w-full max-w-5xl reveal">
           <h2 className="font-impact text-7xl md:text-[10rem] mb-20 leading-none">TALK TO <span className="text-red-600 italic font-serif">US.</span></h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left bg-white/5 p-12 md:p-20 backdrop-blur-3xl rounded-[4rem]">
              <div className="group cursor-pointer">
                 <div className="text-[10px] tracking-[0.5em] text-white/20 mb-4 font-black">EMAIL</div>
                 <div className="text-3xl md:text-5xl font-impact group-hover:text-red-600 transition-colors">contact@lfparfait.com</div>
              </div>
              <div className="group cursor-pointer">
                 <div className="text-[10px] tracking-[0.5em] text-white/20 mb-4 font-black">SOCIAL</div>
                 <div className="text-3xl md:text-5xl font-impact group-hover:text-red-600 transition-colors">@lfperfait_photo</div>
              </div>
           </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 border-t border-white/5 flex flex-col items-center gap-12 bg-black">
         <div className="font-impact text-8xl md:text-[12rem] text-white/5 select-none">LF PARFAIT</div>
         <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black tracking-[0.5em] text-white/30">
           <a href="#about" className="hover:text-white transition-colors">ABOUT</a>
           <a href="#works" className="hover:text-white transition-colors">WORKS</a>
           <a href="#services" className="hover:text-white transition-colors">SERVICES</a>
           <a href="#contact" className="hover:text-white transition-colors">CONTACT</a>
         </div>
         <p className="text-[10px] text-white/20 tracking-[0.5em]">&copy; 2025 ALL RIGHTS RESERVED</p>
      </footer>
    </div>
  );
};

// Application Mounting
try {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
} catch (error) {
  console.error("Critical: Failed to render app:", error);
}
