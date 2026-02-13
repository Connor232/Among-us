
import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../types';

interface TaskUIProps {
  task: Task;
  onComplete: () => void;
  onClose: () => void;
}

const TaskUI: React.FC<TaskUIProps> = ({ task, onComplete, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [isDoingTask, setIsDoingTask] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Sync the ref with the latest onComplete callback
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle keyboard inputs for task performance
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    let interval: any;
    if (isDoingTask && !completedRef.current) {
      interval = setInterval(() => {
        setProgress(p => {
          const next = p + 2.5;
          if (next >= 100) {
            if (!completedRef.current) {
              completedRef.current = true;
              clearInterval(interval);
              // Small delay for UX so the user sees 100%
              setTimeout(() => {
                onCompleteRef.current();
              }, 150);
            }
            return 100;
          }
          return next;
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDoingTask]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-[#2c3e50] w-96 p-8 rounded-3xl border-8 border-[#34495e] shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white font-black hover:text-red-500 text-2xl"
        >
          ✕
        </button>
        <h2 className="text-2xl font-black text-white text-center mb-8 uppercase tracking-widest leading-tight">{task.name}</h2>
        
        <div className="flex flex-col items-center gap-6">
          <div className="w-full h-12 bg-gray-900 rounded-full border-4 border-gray-700 overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${progress >= 100 ? 'bg-green-400' : 'bg-green-500'}`}
              style={{ width: `${progress}%` }} 
            />
          </div>

          <button
            onMouseDown={() => setIsDoingTask(true)}
            onMouseUp={() => setIsDoingTask(false)}
            onMouseLeave={() => setIsDoingTask(false)}
            onTouchStart={() => setIsDoingTask(true)}
            onTouchEnd={() => setIsDoingTask(false)}
            disabled={progress >= 100}
            className={`w-32 h-32 rounded-full border-8 font-black text-white text-xl uppercase transition-all shadow-xl ${
              isDoingTask ? 'bg-blue-800 border-blue-900 scale-90 brightness-75 shadow-inner' : 'bg-blue-600 border-blue-400 hover:scale-105 active:scale-90 shadow-blue-500/50'
            } ${progress >= 100 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDoingTask ? (progress >= 100 ? 'DONE' : '...') : 'Hold'}
          </button>

          <p className="text-gray-400 font-bold text-center text-[10px] uppercase tracking-widest">
            Hold button or [E] / [Space] to complete
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskUI;
