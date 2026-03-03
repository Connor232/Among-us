
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Database, Hash, Thermometer, Trash2, CheckCircle2, CreditCard, Target, Cpu, Wifi, Activity, Fuel, Wind } from 'lucide-react';

interface TaskUIProps {
  task: Task;
  onComplete: () => void;
  onClose: () => void;
}

const XIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const TaskUI: React.FC<TaskUIProps> = ({ task, onComplete, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [isDoingTask, setIsDoingTask] = useState(false);
  const [manifoldStep, setManifoldStep] = useState(1);
  const [wires, setWires] = useState<{ id: number; color: string; connected: boolean; targetId: number }[]>([]);
  const [activeWire, setActiveWire] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [sliderValue, setSliderValue] = useState(0);

  // New Game States for Trash/Chute
  const [isLeverDown, setIsLeverDown] = useState(false);
  const [trashProgress, setTrashProgress] = useState(0);
  const [swipeState, setSwipeState] = useState<'idle' | 'swiping' | 'too-fast' | 'too-slow' | 'success'>('idle');
  const [swipeStartTime, setSwipeStartTime] = useState(0);
  const [asteroids, setAsteroids] = useState<{ id: number; x: number; y: number }[]>([]);
  const [asteroidsDestroyed, setAsteroidsDestroyed] = useState(0);
  const [distributorAngle, setDistributorAngle] = useState(0);
  const [distributorTarget, setDistributorTarget] = useState(Math.random() * 360);
  const [distributorSuccess, setDistributorSuccess] = useState(0);

  // New Game States
  const [trashItems, setTrashItems] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [simonSequence, setSimonSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [simonStep, setSimonStep] = useState(0);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [shieldNodes, setShieldNodes] = useState<{ id: number; active: boolean }[]>([]);

  // New Game States for Safe, Ruby, Course
  const [safeDial, setSafeDial] = useState(0);
  const [safeTarget, setSafeTarget] = useState(Math.floor(Math.random() * 360));
  const [safeStep, setSafeStep] = useState(0);
  const [rubyShine, setRubyShine] = useState(0);
  const [coursePoints, setCoursePoints] = useState<{ x: number; y: number }[]>([]);
  const [courseProgress, setCourseProgress] = useState(0);

  const completedRef = useRef(false);

  // Handle keyboard inputs for default tasks
  useEffect(() => {
    const isDefault = !task.name.includes('Manifolds') && !task.name.includes('Wiring') && !task.name.includes('Power') && !task.name.includes('Output');
    if (!isDefault) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key.toLowerCase() === 'e') {
        setIsDoingTask(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key.toLowerCase() === 'e') {
        setIsDoingTask(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [task.name]);

  // Initialize task-specific state
  useEffect(() => {
    if (task.name.includes('Wiring')) {
      const colors = ['#ef4444', '#3b82f6', '#eab308', '#a855f7'];
      const shuffled = [...colors].sort(() => Math.random() - 0.5);
      setWires(colors.map((color, i) => ({ 
        id: i, 
        color, 
        connected: false,
        targetId: shuffled.indexOf(color)
      })));
    }
    if (task.name.includes('Asteroids')) {
      const initial = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10
      }));
      setAsteroids(initial);
    } else if (task.name.includes('Trash') || task.name.includes('Chute') || task.name.includes('Garbage')) {
      const colors = ['#4ade80', '#f87171', '#fbbf24', '#60a5fa'];
      setTrashItems(Array.from({ length: 6 }, (_, i) => ({ id: i, x: Math.random() * 60 + 20, y: Math.random() * 40 + 20, color: colors[i % colors.length] })));
    } else if (task.name.includes('Reactor') || task.name.includes('Simon')) {
      startSimon();
    } else if (task.name.includes('Shield')) {
      setShieldNodes(Array.from({ length: 7 }, (_, i) => ({ id: i, active: Math.random() > 0.5 })));
    } else if (task.name.includes('Course')) {
      setCoursePoints(Array.from({ length: 4 }, (_, i) => ({ x: i * 25 + 12.5, y: 50 + (Math.random() - 0.5) * 40 })));
    }
  }, [task.name]);

  const startSimon = () => {
    const newSeq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
    setSimonSequence(newSeq);
    showSequence(newSeq, 1);
  };

  const showSequence = (seq: number[], length: number) => {
    setIsShowingSequence(true);
    setSimonStep(length);
    setTimeout(() => setIsShowingSequence(false), length * 800 + 400);
  };

  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(100);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  // --- MINI GAMES ---

  // 1. Manifolds (1-10)
  const renderManifolds = () => {
    const numbers = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1).sort(() => Math.random() - 0.5), []);
    return (
      <div className="grid grid-cols-5 gap-3">
        {numbers.map(num => (
          <button
            key={num}
            onClick={() => {
              if (num === manifoldStep) {
                if (num === 10) handleComplete();
                else setManifoldStep(s => s + 1);
              } else {
                setManifoldStep(1); // Reset on mistake
              }
            }}
            className={`w-12 h-12 rounded-lg border-4 font-black transition-all ${
              num < manifoldStep 
                ? 'bg-green-500 border-green-700 text-white scale-95 opacity-50' 
                : 'bg-blue-600 border-blue-400 text-white hover:scale-105 active:scale-90'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    );
  };

  // 2. Wires (Drag and Drop)
  const renderWires = () => {
    const colors = ['#ef4444', '#3b82f6', '#eab308', '#a855f7'];
    const shuffledColors = wires.sort((a, b) => a.targetId - b.targetId).map(w => w.color);

    return (
      <div className="relative w-full h-64 bg-gray-900 rounded-2xl border-4 border-gray-800 p-6 flex justify-between overflow-hidden">
        {/* Left Terminals */}
        <div className="flex flex-col justify-between h-full z-10">
          {wires.sort((a,b) => a.id - b.id).map((wire) => (
            <div key={wire.id} className="relative flex items-center gap-4">
              <div 
                className="w-10 h-6 rounded-r-lg shadow-lg border-y-2 border-r-2 border-white/10"
                style={{ backgroundColor: wire.color }}
              />
              {!wire.connected && (
                <motion.div
                  drag
                  dragSnapToOrigin
                  onDragStart={() => setActiveWire(wire.id)}
                  onDrag={(_, info) => setDragPos({ x: info.point.x, y: info.point.y })}
                  onDragEnd={(_, info) => {
                    setActiveWire(null);
                    // Check if dropped near the correct target on the right
                    const targetIdx = wire.targetId;
                    const rightTerminals = document.querySelectorAll('.right-terminal');
                    const targetRect = rightTerminals[targetIdx].getBoundingClientRect();
                    const dist = Math.hypot(info.point.x - (targetRect.left + targetRect.width/2), info.point.y - (targetRect.top + targetRect.height/2));
                    
                    if (dist < 40) {
                      const newWires = wires.map(w => w.id === wire.id ? { ...w, connected: true } : w);
                      setWires(newWires);
                      if (newWires.every(w => w.connected)) handleComplete();
                    }
                  }}
                  className="w-8 h-4 rounded-full cursor-grab active:cursor-grabbing z-20 shadow-xl"
                  style={{ backgroundColor: wire.color }}
                />
              )}
            </div>
          ))}
        </div>

        {/* SVG for drawing lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {wires.map(wire => {
            if (!wire.connected) return null;
            const yStart = 24 + wire.id * 52;
            const yEnd = 24 + wire.targetId * 52;
            return (
              <line 
                key={wire.id}
                x1="40" y1={yStart}
                x2="calc(100% - 40px)" y2={yEnd}
                stroke={wire.color}
                strokeWidth="6"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Right Terminals */}
        <div className="flex flex-col justify-between h-full z-10">
          {shuffledColors.map((color, i) => (
            <div key={i} className="right-terminal relative flex items-center gap-4">
              <div 
                className="w-10 h-6 rounded-l-lg shadow-lg border-y-2 border-l-2 border-white/10"
                style={{ backgroundColor: color }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 3. Slider (Divert Power)
  const renderSlider = () => {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-16 h-48 bg-gray-900 rounded-2xl border-4 border-gray-700 relative p-2">
          <input 
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setSliderValue(val);
              if (val >= 98) handleComplete();
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            style={{ writingMode: 'bt-lr' as any, appearance: 'slider-vertical' as any }}
          />
          <div className="absolute bottom-2 left-2 right-2 bg-blue-500 rounded-xl transition-all duration-75" style={{ height: `${sliderValue}%` }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 rounded-full" />
          </div>
        </div>
        <span className="text-white font-black text-xl italic animate-pulse">{sliderValue}%</span>
      </div>
    );
  };

  // 4. Card Swipe (Engaging)
  const renderCardSwipe = () => {
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="w-full h-32 bg-gray-800 rounded-2xl border-4 border-gray-700 relative overflow-hidden shadow-inner">
          {/* Card Reader Slot */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 bg-black/60 border-y-2 border-white/5" />
          
          <div className="absolute top-2 left-4 flex gap-2">
            <div className={`w-2 h-2 rounded-full ${swipeState === 'success' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-600'}`} />
            <div className={`w-2 h-2 rounded-full ${swipeState === 'too-fast' || swipeState === 'too-slow' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-gray-600'}`} />
          </div>

          <motion.div 
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={0}
            onDragStart={() => {
              setSwipeStartTime(Date.now());
              setSwipeState('swiping');
            }}
            onDragEnd={(_, info) => {
              const duration = Date.now() - swipeStartTime;
              if (info.point.x > 250) {
                if (duration < 300) setSwipeState('too-fast');
                else if (duration > 800) setSwipeState('too-slow');
                else {
                  setSwipeState('success');
                  handleComplete();
                }
              } else {
                setSwipeState('idle');
              }
            }}
            className="absolute top-1/2 -translate-y-1/2 w-24 h-14 bg-white rounded-lg border-2 border-gray-300 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center shadow-2xl z-20 overflow-hidden"
          >
            <div className="w-full h-3 bg-gray-800 absolute top-2" />
            <div className="text-[6px] font-black text-blue-600 uppercase mt-4">ID CARD</div>
            <CreditCard size={16} className="text-gray-400" />
          </motion.div>

          <div className="absolute top-2 right-4">
            <span className={`text-[10px] font-black uppercase tracking-tighter ${
              swipeState === 'too-fast' ? 'text-red-500' : 
              swipeState === 'too-slow' ? 'text-yellow-500' : 
              swipeState === 'success' ? 'text-green-500' : 'text-gray-400'
            }`}>
              {swipeState === 'too-fast' ? 'BAD READ: TOO FAST' : 
               swipeState === 'too-slow' ? 'BAD READ: TOO SLOW' : 
               swipeState === 'success' ? 'ACCEPTED' : 'SWIPE CARD'}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full transition-all ${swipeState === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} 
            animate={{ width: swipeState === 'success' ? '100%' : '0%' }}
          />
        </div>
      </div>
    );
  };

  // 5. Asteroids
  const renderAsteroids = () => {
    return (
      <div className="w-full aspect-square bg-black rounded-2xl border-4 border-gray-700 relative overflow-hidden cursor-crosshair">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:20px_20px]" />
        {asteroids.map(ast => (
          <motion.button
            key={ast.id}
            onClick={() => {
              setAsteroids(prev => prev.filter(a => a.id !== ast.id));
              setAsteroidsDestroyed(d => {
                const next = d + 1;
                if (next >= 5) handleComplete();
                return next;
              });
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1, x: `${ast.x}%`, y: `${ast.y}%` }}
            className="absolute w-8 h-8 bg-gray-600 rounded-lg border-2 border-gray-400 shadow-lg flex items-center justify-center"
          >
            <Target size={16} className="text-gray-300" />
          </motion.button>
        ))}
        <div className="absolute bottom-4 left-4 text-[10px] font-black text-green-500 uppercase">
          Destroyed: {asteroidsDestroyed}/5
        </div>
      </div>
    );
  };

  // 6. Calibrate Distributor
  const renderDistributor = () => {
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="relative w-48 h-48 rounded-full border-8 border-gray-700 bg-gray-900 flex items-center justify-center">
          {/* Target Zone */}
          <div 
            className="absolute inset-0 rounded-full border-[12px] border-green-500/30"
            style={{ 
              clipPath: `conic-gradient(transparent ${distributorTarget - 20}deg, #22c55e ${distributorTarget - 20}deg, #22c55e ${distributorTarget + 20}deg, transparent ${distributorTarget + 20}deg)`
            }}
          />
          
          {/* Spinning Needle */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            onUpdate={(latest: any) => setDistributorAngle(latest.rotate % 360)}
            className="w-1 h-24 bg-red-500 absolute origin-bottom bottom-1/2 rounded-full shadow-lg"
          />

          <button
            onClick={() => {
              const diff = Math.abs(distributorAngle - distributorTarget);
              if (diff < 25 || diff > 335) {
                setDistributorSuccess(s => {
                  const next = s + 1;
                  if (next >= 3) handleComplete();
                  setDistributorTarget(Math.random() * 360);
                  return next;
                });
              } else {
                setDistributorSuccess(0);
              }
            }}
            className="w-24 h-24 rounded-full bg-blue-600 border-4 border-blue-400 text-white font-black uppercase text-xs hover:scale-105 active:scale-95 shadow-xl z-10"
          >
            Stop
          </button>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 ${distributorSuccess >= i ? 'bg-green-500 border-green-700' : 'bg-gray-800 border-gray-600'}`} />
          ))}
        </div>
      </div>
    );
  };

  // 7. Trash / Chute (Lever Based)
  const renderTrash = () => {
    return (
      <div className="flex gap-6 w-full h-64">
        <div className="flex-1 bg-gray-900 rounded-2xl border-4 border-gray-800 relative overflow-hidden p-4">
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_bottom,transparent_95%,white_95%)] bg-[size:100%_20px]" />
          
          {/* Falling Trash */}
          <AnimatePresence>
            {isLeverDown && Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`${i}-${trashProgress}`}
                initial={{ y: -20, x: Math.random() * 100 + '%', rotate: 0 }}
                animate={{ y: 300, rotate: 360 }}
                transition={{ duration: 1.5, ease: "linear" }}
                className="absolute w-6 h-6 bg-green-900/40 border border-green-700/30 rounded flex items-center justify-center"
              >
                <Trash2 size={12} className="text-green-500/20" />
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Trash2 size={48} className={`transition-all duration-500 ${isLeverDown ? 'text-green-500 scale-110' : 'text-gray-800'}`} />
          </div>

          <div className="absolute bottom-4 left-4 right-4 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-green-500" animate={{ width: `${trashProgress}%` }} />
          </div>
        </div>

        {/* Chute Lever */}
        <div className="w-20 bg-gray-800 rounded-2xl border-4 border-gray-700 relative flex flex-col items-center py-4">
          <div className="h-full w-2 bg-black/40 rounded-full" />
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 160 }}
            dragElastic={0}
            onDrag={(_, info) => {
              if (info.point.y > 100) {
                setIsLeverDown(true);
                setTrashProgress(p => {
                  const next = Math.min(100, p + 0.5);
                  if (next >= 100) handleComplete();
                  return next;
                });
              } else {
                setIsLeverDown(false);
              }
            }}
            onDragEnd={() => setIsLeverDown(false)}
            className="absolute top-4 w-12 h-12 bg-red-600 rounded-full border-4 border-red-400 cursor-grab active:cursor-grabbing shadow-xl flex items-center justify-center"
          >
            <div className="w-6 h-1 bg-white/30 rounded-full" />
          </motion.div>
          <span className="absolute -bottom-6 text-[8px] font-black text-gray-500 uppercase">Hold Lever</span>
        </div>
      </div>
    );
  };

  // 8. Simon Says (Reactor)
  const renderSimon = () => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    return (
      <div className="grid grid-cols-2 gap-4 w-48">
        {colors.map((color, i) => {
          const isActive = isShowingSequence && simonSequence.slice(0, userSequence.length + 1).includes(i);
          return (
            <button
              key={i}
              disabled={isShowingSequence}
              onClick={() => {
                const nextUserSeq = [...userSequence, i];
                if (simonSequence[userSequence.length] === i) {
                  if (nextUserSeq.length === 5) {
                    handleComplete();
                  } else if (nextUserSeq.length === userSequence.length + 1) {
                    setUserSequence(nextUserSeq);
                  }
                } else {
                  setUserSequence([]);
                  showSequence(simonSequence, 1);
                }
              }}
              className={`w-20 h-20 rounded-2xl border-4 transition-all ${color} ${isActive ? 'brightness-150 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'brightness-50 opacity-80'} border-white/10`}
            />
          );
        })}
      </div>
    );
  };

  // 9. Shields
  const renderShields = () => {
    return (
      <div className="relative w-48 h-48 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-8 border-gray-700 bg-gray-900/50" />
        <div className="grid grid-cols-3 gap-4 z-10">
          {shieldNodes.map(node => (
            <button
              key={node.id}
              onClick={() => {
                const next = shieldNodes.map(n => n.id === node.id ? { ...n, active: !n.active } : n);
                setShieldNodes(next);
                if (next.every(n => n.active)) handleComplete();
              }}
              className={`w-10 h-10 rotate-45 border-4 transition-all ${node.active ? 'bg-white border-blue-400 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-red-900 border-red-700 opacity-50'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  // 10. Fuel (Hold to fill)
  const renderFuel = () => {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-24 h-48 bg-gray-900 rounded-2xl border-4 border-gray-700 relative p-2 overflow-hidden">
          <div className="absolute inset-0 bg-orange-900/20" />
          <motion.div 
            className="absolute bottom-0 left-0 right-0 bg-orange-500"
            animate={{ height: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Fuel size={32} className="text-white/20" />
          </div>
        </div>
        <button
          onMouseDown={() => setIsDoingTask(true)}
          onMouseUp={() => setIsDoingTask(false)}
          onMouseLeave={() => setIsDoingTask(false)}
          className={`w-24 h-24 rounded-full border-4 font-black text-white uppercase transition-all ${isDoingTask ? 'bg-orange-700 scale-90' : 'bg-orange-500'}`}
        >
          Fill
        </button>
      </div>
    );
  };

  // 11. Wifi (Find signal)
  const renderWifi = () => {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full h-32 bg-gray-900 rounded-2xl border-4 border-gray-700 relative flex items-center justify-center overflow-hidden">
          <AnimatePresence>
            {sliderValue > 90 ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center text-green-500">
                <Wifi size={48} />
                <span className="text-[10px] font-black uppercase">Signal Found</span>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center text-gray-700">
                <Wifi size={48} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase">Searching...</span>
              </div>
            )}
          </AnimatePresence>
        </div>
        <input 
          type="range" min="0" max="100" value={sliderValue} 
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setSliderValue(val);
            if (val > 98) handleComplete();
          }}
          className="w-full h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    );
  };

  // 13. Unlock Safe (Dial)
  const renderSafe = () => {
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="relative w-48 h-48 rounded-full border-8 border-gray-700 bg-gray-900 flex items-center justify-center shadow-2xl">
          <motion.div 
            drag="x"
            dragConstraints={{ left: -100, right: 100 }}
            onDrag={(_, info) => {
              const angle = (safeDial + info.delta.x) % 360;
              setSafeDial(angle);
              const diff = Math.abs(angle - safeTarget);
              if (diff < 10) {
                if (safeStep >= 2) handleComplete();
                else {
                  setSafeStep(s => s + 1);
                  setSafeTarget(Math.floor(Math.random() * 360));
                }
              }
            }}
            style={{ rotate: safeDial }}
            className="w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-600 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div className="w-1 h-12 bg-red-500 absolute top-2 rounded-full" />
            <div className="w-4 h-4 rounded-full bg-gray-700" />
          </motion.div>
          <div className="absolute -top-6 text-xs font-black text-blue-400 uppercase">Target: {Math.floor(safeTarget)}°</div>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 ${safeStep > i ? 'bg-green-500 border-green-700' : 'bg-gray-800 border-gray-600'}`} />
          ))}
        </div>
      </div>
    );
  };

  // 14. Polish Ruby (Rubbing)
  const renderRuby = () => {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 bg-red-900/20 rounded-full blur-3xl animate-pulse" />
          <motion.div 
            onMouseMove={(e) => {
              if (e.buttons === 1) {
                setRubyShine(s => {
                  const next = Math.min(100, s + 0.5);
                  if (next >= 100) handleComplete();
                  return next;
                });
              }
            }}
            className="relative cursor-pointer"
          >
            <div 
              className="w-32 h-32 bg-red-600 rotate-45 shadow-2xl transition-all duration-300"
              style={{ 
                filter: `brightness(${0.5 + rubyShine / 100}) saturate(${1 + rubyShine / 50})`,
                boxShadow: rubyShine > 90 ? '0 0 40px rgba(255,0,0,0.8)' : 'none'
              }}
            />
            {rubyShine < 100 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rub to Polish</span>
              </div>
            )}
          </motion.div>
        </div>
        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-red-500" animate={{ width: `${rubyShine}%` }} />
        </div>
      </div>
    );
  };

  // 15. Chart Course (Path)
  const renderCourse = () => {
    return (
      <div className="w-full h-64 bg-gray-900 rounded-2xl border-4 border-gray-700 relative overflow-hidden p-8">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path 
            d={`M ${coursePoints.map(p => `${(p.x / 100) * 400},${(p.y / 100) * 256}`).join(' L ')}`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
            strokeDasharray="8 8"
          />
        </svg>
        
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 300, top: 0, bottom: 200 }}
          onDrag={(_, info) => {
            const targetPoint = coursePoints[courseProgress];
            if (!targetPoint) return;
            
            // Simple proximity check
            const x = (info.point.x / window.innerWidth) * 100;
            const y = (info.point.y / window.innerHeight) * 100;
            
            // This is a bit rough, but works for a mini-game
            setCourseProgress(p => {
              if (p < coursePoints.length - 1) {
                return p + 1;
              }
              if (p === coursePoints.length - 1) handleComplete();
              return p;
            });
          }}
          className="w-12 h-12 bg-blue-600 rounded-xl border-4 border-blue-400 shadow-xl cursor-grab active:cursor-grabbing flex items-center justify-center z-10"
        >
          <Zap size={20} className="text-white" />
        </motion.div>

        {coursePoints.map((p, i) => (
          <div 
            key={i}
            className={`absolute w-4 h-4 rounded-full border-2 transition-all ${courseProgress > i ? 'bg-green-500 border-green-700 scale-125' : 'bg-gray-700 border-gray-500'}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          />
        ))}
      </div>
    );
  };

  // 12. Default Progress (Download/Upload/Scan)
  const renderProgress = () => {
    const isScan = task.name.includes('Scan');
    const isData = task.name.includes('Data');
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="w-full h-32 bg-gray-900 rounded-2xl border-4 border-gray-700 relative overflow-hidden flex items-center justify-center">
          {isScan && (
            <motion.div 
              animate={{ y: [-40, 40] }} 
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-x-0 h-1 bg-green-500 shadow-[0_0_10px_#22c55e] z-10"
            />
          )}
          {isData && (
            <div className="flex items-center gap-8">
              <Database size={32} className="text-blue-500" />
              <motion.div animate={{ x: [0, 20, 0] }} transition={{ repeat: Infinity }}>
                <Activity size={24} className="text-white/20" />
              </motion.div>
              <Database size={32} className="text-blue-500" />
            </div>
          )}
          <div className="absolute bottom-4 inset-x-4 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-green-500" animate={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          onMouseDown={() => setIsDoingTask(true)}
          onMouseUp={() => setIsDoingTask(false)}
          onMouseLeave={() => setIsDoingTask(false)}
          onTouchStart={() => setIsDoingTask(true)}
          onTouchEnd={() => setIsDoingTask(false)}
          disabled={progress >= 100}
          className={`w-32 h-32 rounded-full border-8 font-black text-white text-xl uppercase transition-all shadow-xl ${
            isDoingTask ? 'bg-blue-800 border-blue-900 scale-90 brightness-75' : 'bg-blue-600 border-blue-400 hover:scale-105'
          } ${progress >= 100 ? 'opacity-50 grayscale' : ''}`}
        >
          {isDoingTask ? '...' : 'HOLD'}
        </button>
      </div>
    );
  };

  // Progress logic for default task
  useEffect(() => {
    let interval: any;
    const isDefault = !task.name.includes('Manifolds') && !task.name.includes('Wiring') && !task.name.includes('Power') && !task.name.includes('Output') && !task.name.includes('Swipe') && !task.name.includes('Asteroids') && !task.name.includes('Distributor') && !task.name.includes('Trash') && !task.name.includes('Chute') && !task.name.includes('Garbage') && !task.name.includes('Reactor') && !task.name.includes('Simon') && !task.name.includes('Shield') && !task.name.includes('Fuel') && !task.name.includes('Wifi');
    
    if ((isDefault || task.name.includes('Fuel')) && isDoingTask && !completedRef.current) {
      interval = setInterval(() => {
        setProgress(p => {
          const step = task.name.includes('Scan') ? 1 : (task.name.includes('Fuel') ? 2 : 4);
          const next = p + step;
          if (next >= 100) {
            handleComplete();
            return 100;
          }
          return next;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isDoingTask, task.name]);

  const getTaskIcon = () => {
    if (task.name.includes('Wiring')) return <Zap className="text-yellow-400" />;
    if (task.name.includes('Data')) return <Database className="text-blue-400" />;
    if (task.name.includes('Manifolds')) return <Hash className="text-purple-400" />;
    if (task.name.includes('Power')) return <Thermometer className="text-red-400" />;
    if (task.name.includes('Trash') || task.name.includes('Garbage')) return <Trash2 className="text-green-400" />;
    if (task.name.includes('Swipe')) return <CreditCard className="text-blue-400" />;
    if (task.name.includes('Asteroids')) return <Target className="text-red-400" />;
    if (task.name.includes('Distributor')) return <Cpu className="text-cyan-400" />;
    if (task.name.includes('Reactor') || task.name.includes('Simon')) return <Activity className="text-yellow-500" />;
    if (task.name.includes('Shield')) return <Shield className="text-blue-300" />;
    if (task.name.includes('Fuel')) return <Fuel className="text-orange-400" />;
    if (task.name.includes('O2')) return <Wind className="text-white" />;
    return <Shield className="text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#1e293b] w-full max-w-md p-8 rounded-[3rem] border-8 border-gray-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-white/5" />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
        >
          <XIcon size={24} />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/10">
            {getTaskIcon()}
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{task.name}</h2>
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{task.room}</span>
          </div>
        </div>

        <div className="min-h-[240px] flex items-center justify-center bg-black/20 rounded-3xl border-4 border-white/5 p-6 mb-8">
          <AnimatePresence mode="wait">
            {progress >= 100 ? (
              <motion.div 
                key="complete"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <CheckCircle2 size={64} className="text-green-500" />
                <span className="text-green-500 font-black uppercase italic text-2xl tracking-widest">Task Completed</span>
              </motion.div>
            ) : (
              <motion.div 
                key="game"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                {task.name.includes('Manifolds') && renderManifolds()}
                {task.name.includes('Wiring') && renderWires()}
                {(task.name.includes('Power') || task.name.includes('Output')) && renderSlider()}
                {task.name.includes('Swipe') && renderCardSwipe()}
                {task.name.includes('Asteroids') && renderAsteroids()}
                {task.name.includes('Distributor') && renderDistributor()}
                {(task.name.includes('Trash') || task.name.includes('Chute') || task.name.includes('Garbage')) && renderTrash()}
                {(task.name.includes('Reactor') || task.name.includes('Simon')) && renderSimon()}
                {task.name.includes('Shield') && renderShields()}
                {task.name.includes('Safe') && renderSafe()}
                {task.name.includes('Ruby') && renderRuby()}
                {task.name.includes('Course') && renderCourse()}
                {task.name.includes('Fuel') && renderFuel()}
                {task.name.includes('Wifi') && renderWifi()}
                {!task.name.includes('Manifolds') && !task.name.includes('Wiring') && !task.name.includes('Power') && !task.name.includes('Output') && !task.name.includes('Swipe') && !task.name.includes('Asteroids') && !task.name.includes('Distributor') && !task.name.includes('Trash') && !task.name.includes('Chute') && !task.name.includes('Garbage') && !task.name.includes('Reactor') && !task.name.includes('Simon') && !task.name.includes('Shield') && !task.name.includes('Fuel') && !task.name.includes('Wifi') && renderProgress()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-600">
          <span>Status: {progress >= 100 ? 'Verified' : 'In Progress'}</span>
          <span className="animate-pulse">{progress}%</span>
        </div>
      </motion.div>
    </div>
  );
};

export default TaskUI;
