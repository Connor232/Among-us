
import React, { useState, useEffect, useRef } from 'react';
import { Message, Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, X } from 'lucide-react';

interface ChatOverlayProps {
  messages: Message[];
  players: Player[];
  localPlayerId: string;
  onSendMessage: (content: string) => void;
  isOpen: boolean;
  onToggle: (state: boolean) => void;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  messages, players, localPlayerId, onSendMessage, isOpen, onToggle 
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="fixed bottom-10 left-10 z-[100] pointer-events-none">
      <AnimatePresence>
        {isOpen ? (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 h-96 bg-black/80 backdrop-blur-xl border-4 border-white/10 rounded-3xl flex flex-col overflow-hidden pointer-events-auto shadow-2xl"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Crew Chat</span>
              </div>
              <button onClick={() => onToggle(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 italic text-xs text-center px-6">
                  <MessageSquare size={32} className="mb-2 opacity-20" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const sender = players.find(p => p.id === m.senderId);
                  const isMe = m.senderId === localPlayerId;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] font-black uppercase mb-1 px-1" style={{ color: sender?.color || '#fff' }}>
                        {m.senderName}
                      </span>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
              <input 
                autoFocus
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-black/40 border-2 border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-blue-500 transition-all"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all active:scale-90"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggle(true)}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-500 border-4 border-white/20 rounded-2xl flex items-center justify-center text-white shadow-xl pointer-events-auto transition-all"
          >
            <MessageSquare size={24} />
            {messages.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {messages.length > 9 ? '9+' : messages.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatOverlay;
