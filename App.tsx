import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Scene } from './components/Scene';
import { PracticePanel } from './components/PracticePanel';
import { WalkOverlay } from './components/WalkOverlay';
import { CameraFeed } from './components/CameraFeed';
import { useStore } from './store';
import { enableDeviceOrientation, disableDeviceOrientation } from './lib/walkInput';
import { loadModelFile, MODEL_ACCEPT } from './lib/loadModel';
import { openModelInAR, supportsQuickLook } from './lib/ar';
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { BoxData } from './types';

/** Where a freshly uploaded model lands: clear of the default cubes. */
const MODEL_DROP: [number, number] = [0, 3];

// Simple scene name generator
const generateSceneName = (prompt?: string): string => {
  if (prompt) {
    // Extract first few meaningful words from prompt
    const words = prompt.trim().split(/\s+/).slice(0, 3).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  const adjectives = ['Ethereal', 'Dynamic', 'Serene', 'Chaotic', 'Geometric', 'Urban', 'Abstract', 'Flowing'];
  const nouns = ['Construct', 'Vision', 'Space', 'Form', 'Structure', 'Realm', 'Scene', 'Composition'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

export default function App() {
  const fov = useStore(s => s.fov);
  const distortion = useStore(s => s.distortion);
  const cameraHeight = useStore(s => s.cameraHeight);
  const lockEyeLevel = useStore(s => s.lockEyeLevel);
  const perspectiveMode = useStore(s => s.perspectiveMode);
  const setBoxes = useStore(s => s.setBoxes);
  const appendBox = useStore(s => s.appendBox);
  const theme = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const selectedId = useStore(s => s.selectedId);
  const removeBox = useStore(s => s.removeBox);
  const selectBox = useStore(s => s.selectBox);
  const isViewMode = useStore(s => s.isViewMode);
  const toggleViewMode = useStore(s => s.toggleViewMode);
  const currentSceneName = useStore(s => s.currentSceneName);
  const sceneHistory = useStore(s => s.sceneHistory);
  const saveCurrentScene = useStore(s => s.saveCurrentScene);
  const loadScene = useStore(s => s.loadScene);
  const deleteScene = useStore(s => s.deleteScene);
  const loadHistoryFromStorage = useStore(s => s.loadHistoryFromStorage);
  const boxes = useStore(s => s.boxes);
  const viewMode = useStore(s => s.viewMode);
  const setViewMode = useStore(s => s.setViewMode);
  const cameraFeed = useStore(s => s.cameraFeed);
  const setCameraFeed = useStore(s => s.setCameraFeed);
  const models = useStore(s => s.models);
  const addModel = useStore(s => s.addModel);
  const removeModel = useStore(s => s.removeModel);
  const selectedModelId = useStore(s => s.selectedModelId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [notice, setNotice] = useState<{ message: string; action?: { label: string; run: () => void } } | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  
  // Text Prompt State
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [textPrompt, setTextPrompt] = useState("");

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistoryFromStorage();
  }, [loadHistoryFromStorage]);

  const handleSparkleClick = () => {
    fileInputRef.current?.click();
  };

  const handleTextToggle = () => {
      setShowPromptInput(!showPromptInput);
  };

  const handleDelete = () => {
    if (selectedModelId) {
      removeModel(selectedModelId);
      return;
    }
    if (selectedId) {
      removeBox(selectedId);
      selectBox(null);
    }
  };

  const showNotice = useCallback((message: string, action?: { label: string; run: () => void }) => {
    setNotice({ message, action });
  }, []);

  // Notices clear themselves; one with an action gets longer to be read.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.action ? 12000 : 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * Enter walk mode.
   *
   * The orientation permission has to be requested from inside the gesture that
   * opened the mode - iOS will not grant it later - and a refusal is fine:
   * walk mode falls back to drag-to-look.
   */
  const enterWalkMode = async () => {
    await enableDeviceOrientation();
    setShowPanel(false);
    setShowHistory(false);
    setShowPromptInput(false);
    setViewMode('walk');
  };

  // Covers every way out of walk mode: the Exit button, Escape, or a reload.
  useEffect(() => {
    if (viewMode === 'orbit') disableDeviceOrientation();
  }, [viewMode]);

  const processModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingModel(true);
    try {
      const { model, warning } = await loadModelFile(file, MODEL_DROP);
      addModel(model);

      if (warning) {
        // The file is still usable in AR even when it cannot be drawn here.
        const canQuickLook = supportsQuickLook() && model.format === 'usdz';
        showNotice(
          warning,
          canQuickLook
            ? {
                label: 'Open in AR',
                run: () => {
                  const stored = useStore.getState().models.find((m) => m.fileUrl === model.fileUrl);
                  if (stored) openModelInAR(stored);
                },
              }
            : undefined
        );
      } else {
        showNotice(`${model.name} placed — ${model.size.map((v) => v.toFixed(2)).join(' × ')} m`);
      }
    } catch (error) {
      console.error(error);
      showNotice('Could not read that file.');
    } finally {
      setLoadingModel(false);
      if (modelInputRef.current) modelInputRef.current.value = '';
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
                            setLoadingText(item.name.toUpperCase());
                        } else {
                            setLoadingText("...");
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
      const currentPrompt = textPrompt.trim();
      setShowPromptInput(false);
      setLoading(true);
      setLoadingText("VISUALIZING PROMPT...");
      // Removed setBoxes([]) to append instead of reset

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [{ text: `User Request: "${currentPrompt}"\n\n${systemPrompt}` }]
            },
            config: { thinkingConfig: { thinkingBudget: 5000 } }
          });
          await generateBoxesFromStream(response);
          
          // After successful generation, save the scene with a name
          const sceneName = generateSceneName(currentPrompt);
          saveCurrentScene(sceneName, currentPrompt);
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
      
      // After successful generation, save the scene with a name based on image
      const sceneName = generateSceneName(`Image ${file.name.replace(/\.[^.]+$/, '')}`);
      saveCurrentScene(sceneName);

    } catch (error) {
      console.error(error);
      alert("Failed to interpret perspective.");
    } finally {
      setLoading(false);
      setLoadingText("");
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedBox = boxes.find((b) => b.id === selectedId) ?? null;

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-500' : 'text-gray-400';
  // The feed lives behind the canvas, so the shell must not paint over it.
  const bgColor = cameraFeed ? 'bg-transparent' : isDark ? 'bg-[#0c0c0e]' : 'bg-[#f3f3f1]';

  const noticeBanner = notice && (
    <div className="absolute top-16 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        className={`flex items-center gap-3 max-w-md px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto ${
          isDark || cameraFeed ? 'bg-black/80 border-gray-700 text-gray-100' : 'bg-white/90 border-gray-200 text-gray-900'
        }`}
      >
        <span className="text-[11px] leading-snug flex-1">{notice.message}</span>
        {notice.action && (
          <button
            onClick={() => { notice.action?.run(); setNotice(null); }}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
              isDark || cameraFeed ? 'bg-white text-black' : 'bg-gray-900 text-white'
            }`}
          >
            {notice.action.label}
          </button>
        )}
        <button
          onClick={() => setNotice(null)}
          className="shrink-0 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Walk mode takes the whole screen: no rail, no panels, just the scene and
  // the thumb controls.
  if (viewMode === 'walk') {
    return (
      <div className={`fixed inset-0 w-screen h-screen ${bgColor} font-sans selection:bg-none`} style={{ minHeight: '100dvh' }}>
        {cameraFeed && <CameraFeed onError={(message) => { setCameraFeed(false); showNotice(message); }} />}
        <Scene />
        <WalkOverlay onNotice={showNotice} />
        {noticeBanner}
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-screen h-screen ${bgColor} font-sans selection:bg-none transition-colors duration-500`} style={{ minHeight: '100dvh' }}>
      {cameraFeed && <CameraFeed onError={(message) => { setCameraFeed(false); showNotice(message); }} />}
      <Scene />
      {noticeBanner}

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

      {/* HUD Info — the numbers that define the shot you are drawing */}
      <div className={`absolute top-6 right-6 pointer-events-none z-30 ${showPanel ? 'hidden' : ''}`}>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${labelColor}`}>Eye</span>
            <span className={`text-sm font-black ${textColor} tracking-tight tabular-nums`}>
              {cameraHeight.toFixed(2)} m
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${labelColor}`}>ƒ</span>
            <span className={`text-sm font-black ${textColor} tracking-tight tabular-nums`}>
              {Math.round(fov)}°
            </span>
          </div>
          <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${labelColor}`}>
            {perspectiveMode === 'curvilinear'
              ? '5 point curvilinear'
              : lockEyeLevel
              ? '2 point · level'
              : '3 point · free'}
          </div>
          {selectedBox && (
            <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${labelColor} tabular-nums`}>
              {selectedBox.scale.map((v) => v.toFixed(2)).join(' × ')} m
            </div>
          )}
        </div>
      </div>

      {/* Current Scene Name Display */}
      {currentSceneName && (
        <div className="absolute top-6 left-6 pointer-events-none z-30">
          <div className={`px-3 py-1.5 rounded-full backdrop-blur-md border ${isDark ? 'bg-black/40 border-gray-700' : 'bg-white/40 border-gray-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentSceneName}
            </span>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="absolute top-4 left-4 bottom-4 w-72 z-50">
          <div className={`h-full rounded-xl shadow-2xl border backdrop-blur-md overflow-hidden flex flex-col ${isDark ? 'bg-[#1a1a1a]/95 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Scene History
              </span>
              <button 
                onClick={() => setShowHistory(false)}
                className={`p-1 rounded-md transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Scene List */}
            <div className="flex-1 overflow-y-auto">
              {sceneHistory.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full p-6 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <svg viewBox="0 0 24 24" className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <span className="text-xs font-medium">No saved scenes yet</span>
                  <span className="text-[10px] mt-1">Generate a scene to start your history</span>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {sceneHistory.map((scene) => (
                    <div 
                      key={scene.id}
                      className={`group p-3 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                      onClick={() => {
                        loadScene(scene.id);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {scene.name}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {formatDate(scene.createdAt)} • {scene.boxes.length} boxes
                          </div>
                          {scene.prompt && (
                            <div className={`text-[10px] mt-1 truncate italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                              "{scene.prompt}"
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this scene?')) {
                              deleteScene(scene.id);
                            }
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer with box count */}
            <div className={`px-4 py-2 border-t text-[10px] ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              Current: {boxes.length} boxes
            </div>
          </div>
        </div>
      )}

      {/* Practice Panel — everything that departs from the defaults lives here */}
      {showPanel && (
        <div className="absolute top-4 bottom-4 right-20 w-60 max-w-[calc(100%-6rem)] z-50">
          <PracticePanel onClose={() => setShowPanel(false)} />
        </div>
      )}

      {/* Action Buttons - Icons Resized */}
      <div className="absolute bottom-8 right-8 z-40 flex flex-col items-center gap-4">
          
          {(selectedId || selectedModelId) && !isViewMode && (
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

           {/* AR / walk mode — stand in the scene at 1:1 */}
           <button
            onClick={enterWalkMode}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${isDark ? 'text-white hover:text-emerald-300' : 'text-gray-900 hover:text-emerald-600'}`}
            title="Walk the scene at real scale (AR)"
          >
            {/* A figure standing on the ground plane */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="4.5" r="1.8" />
              <path d="M12 7v6M12 13l-2.5 5M12 13l2.5 5M8.5 9.5h7" />
              <path d="M2 21h20" strokeOpacity="0.45" />
            </svg>
          </button>

           {/* Upload a model (USDZ / glTF) */}
           <div className="relative">
             <input
               type="file"
               ref={modelInputRef}
               onChange={processModel}
               accept={MODEL_ACCEPT}
               className="hidden"
             />
             <button
              onClick={() => modelInputRef.current?.click()}
              disabled={loadingModel}
              className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer disabled:opacity-50 ${models.length > 0 ? (isDark ? 'text-amber-300' : 'text-amber-600') : (isDark ? 'text-white hover:text-amber-300' : 'text-gray-900 hover:text-amber-600')}`}
              title="Place a USDZ or glTF model"
            >
              {/* A box with an arrow going in */}
              <svg viewBox="0 0 24 24" className={`w-5 h-5 ${loadingModel ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeOpacity="0.45" />
                <path d="M12 15V7" />
                <polyline points="9 10 12 7 15 10" />
              </svg>
            </button>
           </div>

           {/* Practice Settings — eye level, projection, primitives, guides */}
           <button
            onClick={() => setShowPanel(!showPanel)}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${showPanel ? (isDark ? 'text-sky-300' : 'text-sky-600') : (isDark ? 'text-white hover:text-sky-300' : 'text-gray-900 hover:text-sky-600')}`}
            title="Practice settings"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4" y1="17" x2="20" y2="20" />
              <line x1="4" y1="7" x2="20" y2="4" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
          </button>

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

          {/* History Button */}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${showHistory ? (isDark ? 'text-purple-300' : 'text-purple-500') : (isDark ? 'text-white hover:text-purple-300' : 'text-gray-900 hover:text-purple-500')}`}
            title="Scene History"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

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