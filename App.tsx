import React, { useRef, useState } from 'react';
import { Scene } from './components/Scene';
import { useStore } from './store';
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { BoxData } from './types';

export default function App() {
  const fov = useStore(s => s.fov);
  const distortion = useStore(s => s.distortion);
  const setBoxes = useStore(s => s.setBoxes);
  const appendBox = useStore(s => s.appendBox);
  const theme = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const selectedId = useStore(s => s.selectedId);
  const removeBox = useStore(s => s.removeBox);
  const selectBox = useStore(s => s.selectBox);
  const isViewMode = useStore(s => s.isViewMode);
  const toggleViewMode = useStore(s => s.toggleViewMode);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  
  // Text Prompt State
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [textPrompt, setTextPrompt] = useState("");

  const handleSparkleClick = () => {
    fileInputRef.current?.click();
  };

  const handleTextToggle = () => {
      setShowPromptInput(!showPromptInput);
  };

  const handleDelete = () => {
    if (selectedId) {
      removeBox(selectedId);
      selectBox(null);
    }
  };

  const generateBoxesFromStream = async (aiStream: any) => {
      let buffer = '';
      for await (const chunk of aiStream) {
        const text = chunk.text;
        if (text) {
            buffer += text;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const cleanLine = trimmed.replace(/,$/, '').replace(/^\[/, '').replace(/\]$/, '');
                    const item = JSON.parse(cleanLine);
                    
                    if (item.position && item.scale && item.rotation) {
                        if (item.name) {
                            setLoadingText(`CONSTRUCTING: ${item.name.toUpperCase()}`);
                        } else {
                            setLoadingText("CONSTRUCTING FORM...");
                        }
                        appendBox({
                            position: item.position,
                            scale: item.scale,
                            rotation: item.rotation,
                            name: item.name
                        });
                    }
                } catch (e) {}
            }
        }
      }
      // Residual buffer
      if (buffer.trim()) {
         try {
            const cleanLine = buffer.trim().replace(/,$/, '').replace(/^\[/, '').replace(/\]$/, '');
            const item = JSON.parse(cleanLine);
             if (item.position && item.scale && item.rotation) {
                appendBox({
                    position: item.position,
                    scale: item.scale,
                    rotation: item.rotation,
                    name: item.name
                });
            }
         } catch (e) {}
      }
  };

  const systemPrompt = `
      You are the spirit of master artist Kim Jung Gi.
      
      **TASK:**
      Construct a **massive, complex 3D scene** based on the user's request using only boxes.
      
      **CRITICAL STYLE GUIDE - "BLOCKING OUT THE ETHER":**
      Kim Jung Gi rarely drew perfect cubes. He constructed scenes from **SLABS, BEAMS, PILLARS, and SHEETS**.
      
      **ABSOLUTE RULES FOR BOX GENERATION:**
      1.  **BAN ON UNIFORMITY:** 
          - **FORBIDDEN:** 1x1x1 cubes.
          - **REQUIRED:** Every box must have at least one dimension that is significantly different from the others.
      2.  **THINK IN PRIMITIVES:**
          - **SLABS (Floors/Tables/Roofs):** [width: 8, height: 0.1, depth: 8]
          - **PILLARS:** [width: 0.4, height: 6, depth: 0.4]
          - **BEAMS:** [width: 0.3, height: 0.3, depth: 10]
          - **SHEETS (Walls):** [width: 0.1, height: 5, depth: 8]
      3.  **DENSITY:** Create tight clusters of detail vs massive structures.
      4.  **GROUNDED:** y=0 is the floor.
      
      **OUTPUT:** Stream NDJSON (Newline Delimited JSON).
      {"name": "label", "position": [x, y, z], "scale": [w, h, d], "rotation": [x, y, z]}
      Range: X/Z -30 to 30. Y 0 to 25.
      Generate at least 80 boxes.
  `;

  const processText = async () => {
      if (!textPrompt.trim()) return;
      setShowPromptInput(false);
      setLoading(true);
      setLoadingText("VISUALIZING PROMPT...");
      // Removed setBoxes([]) to append instead of reset

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [{ text: `User Request: "${textPrompt}"\n\n${systemPrompt}` }]
            },
            config: { thinkingConfig: { thinkingBudget: 5000 } }
          });
          await generateBoxesFromStream(response);
      } catch (error) {
          console.error(error);
          alert("Failed to generate from text.");
      } finally {
          setLoading(false);
          setLoadingText("");
          setTextPrompt("");
      }
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingText("CONTACTING ETHER...");
    // Removed setBoxes([]) to append instead of reset

    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: systemPrompt }
            ]
        },
        config: { thinkingConfig: { thinkingBudget: 10000 } }
      });
      await generateBoxesFromStream(response);

    } catch (error) {
      console.error(error);
      alert("Failed to interpret perspective.");
    } finally {
      setLoading(false);
      setLoadingText("");
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-500' : 'text-gray-400';
  const bgColor = isDark ? 'bg-[#0c0c0e]' : 'bg-[#f3f3f1]';

  return (
    <div className={`relative w-full h-full ${bgColor} font-sans selection:bg-none transition-colors duration-500`}>
      <Scene />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute top-8 left-8 z-50">
           <div className={`flex items-center gap-3 ${isDark ? 'bg-black/80 border-gray-800' : 'bg-white/80 border-gray-200'} backdrop-blur-md px-4 py-2 rounded-full shadow-sm border`}>
              <div className={`w-4 h-4 border-2 ${isDark ? 'border-white' : 'border-gray-900'} border-t-transparent rounded-full animate-spin`} />
              <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold uppercase tracking-widest text-[10px]`}>
                 {loadingText}
              </span>
           </div>
        </div>
      )}

      {/* Text Prompt Input - Non-invasive Floating Panel */}
      {showPromptInput && (
          <div className="absolute bottom-4 left-4 right-16 md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 z-50">
              <div className={`p-2 rounded-xl shadow-2xl border backdrop-blur-md transition-colors duration-500 ${isDark ? 'bg-[#1a1a1a]/90 border-gray-700' : 'bg-white/90 border-gray-200'}`}>
                  <textarea 
                    autoFocus
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Describe the scene..."
                    // text-base (16px) prevents iOS zoom
                    className={`w-full h-20 p-3 text-base bg-transparent outline-none resize-none font-medium leading-tight ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            processText();
                        }
                        if (e.key === 'Escape') {
                            setShowPromptInput(false);
                        }
                    }}
                  />
                  <div className="flex justify-between items-center px-1 pt-2 border-t border-dashed border-opacity-20 border-gray-400">
                      <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                if (window.confirm("Clear the entire scene?")) {
                                    setBoxes([]);
                                }
                            }}
                            className={`p-1 rounded-md transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-500 hover:bg-black/5'}`}
                            title="Clear Canvas"
                        >
                             <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                        <span className={`text-[9px] uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                           Return to send
                        </span>
                      </div>
                      <button 
                        onClick={processText}
                        className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-transform active:scale-95 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                      >
                          Create
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HUD Info (Lens) */}
      <div className="absolute top-6 right-6 pointer-events-none mix-blend-multiply origin-top-right scale-[0.25]">
        <div className={`flex flex-col items-end gap-1 ${isDark ? 'mix-blend-normal' : 'mix-blend-multiply'}`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold ${labelColor}`}>ƒ</span>
            <div className={`text-4xl font-black ${textColor} tracking-tighter tabular-nums`}>
              {Math.round(fov)}°
            </div>
          </div>
          <div className={`text-[10px] font-bold ${labelColor} uppercase tracking-[0.2em] mb-2`}>
            Field of View
          </div>
        </div>
      </div>

      {/* Action Buttons - Icons Resized */}
      <div className="absolute bottom-8 right-8 z-40 flex flex-col items-center gap-4">
          
          {selectedId && !isViewMode && (
            <button 
                onClick={handleDelete}
                className={`group flex items-center justify-center w-8 h-8 transition-all active:scale-95 duration-200 cursor-pointer ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'}`}
                title="Delete Selected"
            >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            </button>
          )}

           {/* View Mode Toggle */}
           <button 
            onClick={toggleViewMode}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${isDark ? 'text-white hover:text-emerald-300' : 'text-gray-900 hover:text-emerald-500'}`}
            title={isViewMode ? "Switch to Edit Mode" : "Switch to View Mode"}
          >
             {isViewMode ? (
                // Eye Open (Viewing)
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
             ) : (
                // Edit / Cube Icon
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                   <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                   <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
             )}
          </button>

           {/* Theme Toggle */}
           <button 
            onClick={toggleTheme}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${isDark ? 'text-white hover:text-yellow-300' : 'text-gray-900 hover:text-orange-500'}`}
          >
             {isDark ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
             ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
             )}
          </button>

          {/* Text Prompt Button - Toggles visibility */}
          {!isViewMode && (
              <button 
                onClick={handleTextToggle}
                disabled={loading}
                className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer disabled:opacity-50 ${showPromptInput ? (isDark ? 'text-blue-300' : 'text-blue-500') : (isDark ? 'text-white hover:text-blue-300' : 'text-gray-900 hover:text-blue-500')}`}
                title="Write Prompt"
              >
                {showPromptInput ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                        <circle cx="11" cy="11" r="2" />
                    </svg>
                )}
              </button>
          )}

          {/* Sparkle / Upload Button */}
          {!isViewMode && (
              <div className="relative">
                <input type="file" ref={fileInputRef} onChange={processImage} accept="image/*" className="hidden" />
                <button 
                    onClick={handleSparkleClick}
                    disabled={loading}
                    className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer disabled:opacity-50 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    title="Upload Image"
                >
                    <svg 
                        viewBox="0 0 24 24" 
                        className={`w-6 h-6 transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`}
                        fill="none" stroke="currentColor" strokeWidth="1.5"
                    >
                        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
                    </svg>
                </button>
              </div>
          )}
      </div>
    </div>
  );
}