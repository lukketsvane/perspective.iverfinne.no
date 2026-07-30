import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Scene } from './components/Scene';
import { PracticePanel } from './components/PracticePanel';
import { WalkOverlay } from './components/WalkOverlay';
import { CameraFeed } from './components/CameraFeed';
import { ConeOfVision } from './components/ConeOfVision';
import { SelectionBar } from './components/SelectionBar';
import { TouchControls } from './components/TouchControls';
import { MeshSheet } from './components/MeshSheet';
import { useStore, saveSettings } from './store';
import { useLayout } from './lib/useLayout';
import { captureView, captureFileName } from './lib/capture';
import { enableDeviceOrientation, disableDeviceOrientation } from './lib/walkInput';
import { loadModelFile, loadModelFromUrl, findFreeSpot, modelRadius } from './lib/loadModel';
import { MESH_LIBRARY } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { sceneFromUrl, shareScene } from './lib/share';
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { BoxData } from './types';

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
  const isViewMode = useStore(s => s.isViewMode);
  const toggleViewMode = useStore(s => s.toggleViewMode);
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
  const showCone = useStore(s => s.showCone);
  const canUndo = useStore(s => s.undoStack.length > 0);
  const addBox = useStore(s => s.addBox);

  // Three shapes, not two. A tablet gets finger-sized targets like a phone, but
  // gathered into a rail and docked panels, because it has the room a phone
  // does not and none of the precision a mouse has.
  const layout = useLayout();
  const touchLayout = layout !== 'desktop';
  const tablet = layout === 'tablet';

  /**
   * Where a floating panel sits, in each of the three shapes.
   *
   * On a tablet it docks beside the rail as a card of readable width, leaving
   * the scene visible while you change it - a full-bleed sheet over 1200 px of
   * iPad hides the very thing the controls are acting on.
   */
  const panelFrame = tablet
    ? 'fixed top-4 bottom-4 right-24 w-[22rem] z-50'
    : touchLayout
    ? 'fixed inset-x-2 top-16 bottom-24 z-50'
    : 'fixed top-4 bottom-4 right-20 w-60 z-50';

  // Saved scenes are a short list far more often than a long one, so on a
  // tablet the card shrinks to what is in it rather than standing as an empty
  // column the height of the screen.
  const historyFrame = tablet
    ? 'fixed top-4 bottom-4 right-24 w-[22rem] z-50 flex items-start pointer-events-none'
    : touchLayout
    ? 'fixed inset-x-2 top-16 bottom-24 z-50'
    : 'fixed left-4 top-4 bottom-4 w-64 z-50';

  const historyCard = tablet ? 'w-full max-h-full pointer-events-auto' : 'h-full';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showMeshes, setShowMeshes] = useState(false);
  const [busyMesh, setBusyMesh] = useState<string | null>(null);
  
  // Text Prompt State
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [textPrompt, setTextPrompt] = useState("");

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistoryFromStorage();
  }, [loadHistoryFromStorage]);

  // A study can arrive in the link, which is how a scene composed on a laptop
  // gets into AR on a phone.
  useEffect(() => {
    const shared = sceneFromUrl();
    if (!shared) return;
    setBoxes(shared.boxes.map((box) => ({ ...box, id: uuidv4() })));

    // Figures travel by library id, and are fetched here rather than sent.
    shared.models.forEach(async (packed) => {
      const entry = MESH_LIBRARY.find((m) => m.id === packed.meshId);
      if (!entry) return;
      try {
        const { model } = await loadModelFromUrl(entry.url, entry.name, [packed.position[0], packed.position[2]]);
        if (!model.previewSupported) return;
        addModel({ ...model, position: packed.position, rotationY: packed.rotationY, scale: packed.scale });
      } catch (error) {
        console.error(error);
      }
    });
  }, [setBoxes, addModel]);

  // Remember how the tool is set up (never what is in the scene).
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /**
   * Keyboard, orbit mode only - walk mode owns WASD.
   * R turns the selection, shift+R turns it back, delete removes it.
   */
  useEffect(() => {
    if (viewMode !== 'orbit') return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      // Read through the store so this listener never goes stale.
      const state = useStore.getState();

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        state.undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        state.duplicateSelection();
        return;
      }

      if (e.key === 'Escape') {
        state.selectBox(null);
        state.selectModel(null);
        return;
      }
      if (!state.selectedId && !state.selectedModelId) return;

      if (e.key === 'r' || e.key === 'R') {
        state.rotateSelection((e.shiftKey ? -1 : 1) * (Math.PI / 12));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (state.selectedModelId) state.removeModel(state.selectedModelId);
        else if (state.selectedId) { state.removeBox(state.selectedId); state.selectBox(null); }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode]);

  const handleCapture = () => {
    const saved = captureView(captureFileName(cameraHeight, fov));
    showNotice(saved ? 'View saved as PNG.' : 'Could not read the canvas.');
  };

  /** Drop a primitive where the viewer is looking, rather than where they tap. */
  const handleAddAtFocus = () => {
    addBox([focusPoint.x, 0, focusPoint.z]);
  };

  const handleShare = async () => {
    const result = await shareScene(boxes, models);
    showNotice(
      result === 'copied'
        ? 'Link copied — it carries this study.'
        : result === 'shared'
        ? 'Study shared.'
        : 'Could not copy the link.'
    );
  };

  // The docked panels share one slot on a tablet, so opening any of them puts
  // the others away rather than stacking cards on top of each other.
  const openMeshes = () => {
    setShowPanel(false);
    setShowHistory(false);
    setShowMeshes((open) => !open);
  };

  const togglePanel = () => {
    setShowHistory(false);
    setShowMeshes(false);
    setShowPanel((open) => !open);
  };

  const toggleHistory = () => {
    setShowPanel(false);
    setShowMeshes(false);
    setShowHistory((open) => !open);
  };

  /** A drop point clear of everything already standing there. */
  const freeSpot = (footprint: number): [number, number] =>
    findFreeSpot(
      useStore.getState().models.map((m) => ({ position: m.position, radius: modelRadius(m) })),
      [focusPoint.x, focusPoint.z],
      footprint
    );

  const placeLibraryMesh = async (id: string) => {
    const entry = MESH_LIBRARY.find((m) => m.id === id);
    if (!entry) return;
    setBusyMesh(id);
    try {
      const { model } = await loadModelFromUrl(entry.url, entry.name, [focusPoint.x, focusPoint.z], entry.height);
      if (!model.previewSupported) return;
      const [x, z] = freeSpot(modelRadius(model));
      addModel({ ...model, position: [x, 0, z] });
      // The tablet's library is docked beside the scene rather than over it,
      // so it stays open: placing a crowd is one tap per figure.
      if (!tablet) setShowMeshes(false);
    } catch (error) {
      console.error(error);
    } finally {
      setBusyMesh(null);
    }
  };

  /** Import one file or twenty; none of them land on top of each other. */
  const importModels = async (files: FileList) => {
    setBusyMesh('import');
    let placed = 0;
    try {
      for (const file of Array.from(files)) {
        const { model, warning } = await loadModelFile(file, [focusPoint.x, focusPoint.z]);

        // A file that could not be read is not a model. Adding it anyway left
        // an invisible row in the scene that could never be selected or seen.
        if (!model.previewSupported) {
          console.warn(`${file.name}: ${warning ?? 'could not be read'}`);
          continue;
        }

        const [x, z] = freeSpot(modelRadius(model));
        addModel({ ...model, position: [x, 0, z] });
        placed += 1;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBusyMesh(null);
      // Closing the sheet is how a placement confirms itself, so a run that
      // placed nothing leaves it open rather than saying so in a banner. The
      // tablet's docked library never has to get out of the way.
      if (placed > 0 && !tablet) setShowMeshes(false);
    }
  };

  const handleSparkleClick = () => {
    fileInputRef.current?.click();
  };

  const handleTextToggle = () => {
      setShowPromptInput(!showPromptInput);
  };

  /**
   * Anything worth saying is said by the scene itself. Failures go to the
   * console for debugging; nothing interrupts the view.
   */
  const showNotice = useCallback((message: string) => {
    console.info(message);
  }, []);

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
      You are laying out a perspective study for an artist to draw from.

      **THE TOOL YOU ARE BUILDING FOR:**
      Everything is measured in METRES. The viewer stands at a human eye level
      (1.6-1.9 m) and walks the scene at 1:1.
      Sizes therefore have to be believable: a door is 2 m, a table 0.75 m, a
      storey 3 m, a bus 3 m tall. A box that is the wrong size teaches the wrong
      thing.

      **RULES:**
      1. **REAL SIZES.** Every box is something: a crate, a step, a wall, a
         parapet, a vehicle, a storey. Give it that thing's real dimensions.
      2. **MOSTLY ALIGNED.** Keep most boxes square to the grid so they share one
         pair of vanishing points - that is what makes a scene readable to draw.
         Turn a handful off-axis for contrast, using the rotation Y value.
      3. **STAND SOMETHING AT EYE LEVEL.** Include masses that cross 1.6-1.9 m,
         so the horizon cuts through the scene rather than floating above it.
      4. **DEPTH.** Spread the boxes from 2 m to 40 m away, so foreshortening has
         something to act on.
      5. **GROUNDED.** y = 0 is the floor. A box's y is its CENTRE, so a 3 m tall
         box sitting on the ground has y = 1.5.
      6. **WALKABLE.** Keep it inside roughly 30 x 30 m so it can be walked.

      **OUTPUT:** Stream NDJSON, one box per line, no other text.
      {"name": "label", "position": [x, y, z], "scale": [w, h, d], "rotation": [0, ry, 0]}
      Between 25 and 45 boxes.
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

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-gray-200' : 'text-gray-900';
  const labelColor = isDark ? 'text-gray-500' : 'text-gray-400';
  // The feed lives behind the canvas, so the shell must not paint over it.
  const bgColor = cameraFeed ? 'bg-transparent' : isDark ? 'bg-[#0c0c0e]' : 'bg-[#f3f3f1]';


  // Walk mode takes the whole screen: no rail, no panels, just the scene and
  // the thumb controls.
  if (viewMode === 'walk') {
    return (
      <div className={`fixed inset-0 w-screen h-screen ${bgColor} font-sans selection:bg-none`} style={{ minHeight: '100dvh' }}>
        {cameraFeed && <CameraFeed onError={(message) => { setCameraFeed(false); showNotice(message); }} />}
        <Scene />
        <WalkOverlay onNotice={showNotice} />
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-screen h-screen ${bgColor} font-sans selection:bg-none transition-colors duration-500`} style={{ minHeight: '100dvh' }}>
      {cameraFeed && <CameraFeed onError={(message) => { setCameraFeed(false); showNotice(message); }} />}
      <Scene />

      {/* Where a rectilinear projection still matches an eye */}
      {showCone && perspectiveMode === 'linear' && (
        <ConeOfVision fov={fov} color={isDark || cameraFeed ? '#8ab4ff' : '#1f6feb'} />
      )}

      {!isViewMode && <SelectionBar />}

      {/* Fingers get big targets either way: a phone puts them in a bar under
          the thumbs, a tablet gathers the same targets into a rail on the right
          rather than flinging five icons across 1200 px. Decided by the pointer
          and the short edge, so a phone turned sideways keeps its bar. */}
      {touchLayout && (
      <TouchControls
        variant={tablet ? 'rail' : 'bar'}
        onMeshes={openMeshes}
        onWalk={enterWalkMode}
        onAdd={handleAddAtFocus}
        onSetup={togglePanel}
        onUndo={() => useStore.getState().undo()}
        canUndo={canUndo}
        onCapture={handleCapture}
        onShare={handleShare}
        onPrompt={handleTextToggle}
        onHistory={toggleHistory}
        setupOpen={showPanel}
      />
      )}

      {showMeshes && (
        <MeshSheet
          layout={layout}
          onClose={() => setShowMeshes(false)}
          onPlace={placeLibraryMesh}
          onImport={importModels}
          busyId={busyMesh}
        />
      )}

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

      {/* HUD: two numbers, no words. Eye height and focal length are the
          shot; everything else about it is visible in the scene itself. */}
      <div className={`absolute inset-safe-top inset-safe-right pointer-events-none z-30 ${showPanel ? 'hidden' : ''}`}>
        <div className="flex flex-col items-end gap-0.5 tabular-nums">
          <span className={`text-sm font-black ${textColor} tracking-tight`}>{cameraHeight.toFixed(2)} m</span>
          <span className={`text-sm font-black ${labelColor} tracking-tight`}>{Math.round(fov)}°</span>
        </div>
      </div>

      {/* Saved scenes. Deleted by accident during the text strip, and worth
          having back: it is the only way to keep a composition you might want
          again without leaving the app. Names and counts only. */}
      {showHistory && (
        <div className={historyFrame}>
          <div className={`${historyCard} rounded-2xl shadow-2xl border backdrop-blur-md overflow-hidden flex flex-col ${isDark ? 'bg-[#141416]/95 border-gray-800 text-gray-100' : 'bg-white/95 border-gray-200 text-gray-900'}`}>
            <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
              <button
                onClick={() =>
                  saveCurrentScene(
                    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  )
                }
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
              >
                Save
              </button>
              <button onClick={() => setShowHistory(false)} className="p-1.5 opacity-50" aria-label="Close">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sceneHistory.map((scene) => (
                <div
                  key={scene.id}
                  onClick={() => { loadScene(scene.id); setShowHistory(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold truncate">{scene.name}</div>
                    <div className={`text-[9px] tabular-nums ${labelColor}`}>{scene.boxes.length}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                    className={`shrink-0 p-1 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    aria-label="Delete scene"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Practice Panel — everything that departs from the defaults lives here */}
      {showPanel && (
        <div className={panelFrame}>
          <PracticePanel layout={layout} onClose={() => setShowPanel(false)} />
        </div>
      )}

      {/* Action Buttons - Icons Resized */}
      <div className={`${touchLayout ? 'hidden' : 'flex'} absolute bottom-8 right-8 z-40 flex-col items-center gap-4`}>
          
          {/* Save the view to draw from */}
          <button
            onClick={handleCapture}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${isDark ? 'text-white hover:text-sky-300' : 'text-gray-900 hover:text-sky-600'}`}
            title="Save this view as a PNG"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

           {/* Walk mode — stand in the scene at 1:1 */}
           <button
            onClick={enterWalkMode}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${isDark ? 'text-white hover:text-emerald-300' : 'text-gray-900 hover:text-emerald-600'}`}
            aria-label="Walk"
          >
            {/* A figure standing on the ground plane */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="4.5" r="1.8" />
              <path d="M12 7v6M12 13l-2.5 5M12 13l2.5 5M8.5 9.5h7" />
              <path d="M2 21h20" strokeOpacity="0.45" />
            </svg>
          </button>

           {/* Mesh library */}
           <button
            onClick={openMeshes}
            className={`group flex items-center justify-center w-8 h-8 transition-transform active:scale-95 duration-200 cursor-pointer ${models.length > 0 ? (isDark ? 'text-amber-300' : 'text-amber-600') : (isDark ? 'text-white hover:text-amber-300' : 'text-gray-900 hover:text-amber-600')}`}
            aria-label="Meshes"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="4.5" r="2" />
              <path d="M12 7v6M12 13l-3 6M12 13l3 6M8 9.5h8" />
            </svg>
          </button>

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