
import React, { useState, useEffect, useMemo } from 'react';
import { Player, Message, PlayerRole } from '../types';
import { getMeetingDiscussion } from '../services/geminiService';

interface MeetingRoomProps {
  players: Player[];
  localPlayerId: string;
  reporterId: string;
  onVote: (votedPlayerId: string | null) => void;
  deadBodies: any[];
  externalMessages: Message[];
  externalVotes: Record<string, string>;
  onSendMessage: (content: string) => void;
  onCastVote: (targetId: string, voterId?: string) => void;
  isHost: boolean;
  meetingTime: number;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ 
  players, localPlayerId, reporterId, onVote, deadBodies, externalMessages, externalVotes, onSendMessage, onCastVote, isHost, meetingTime 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(true);
  const [localVote, setLocalVote] = useState<string | null>(null);
  const [votingLocked, setVotingLocked] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(meetingTime);
  const [showResults, setShowResults] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const botVotesScheduled = React.useRef<Set<string>>(new Set());
  const botTimeouts = React.useRef<Record<string, any>>({});

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(botTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const localPlayer = useMemo(() => players.find(p => p.id === localPlayerId), [players, localPlayerId]);
  const alivePlayers = useMemo(() => players.filter(p => p.isAlive), [players]);

  const allMessages = useMemo(() => {
    const combined = [...messages, ...externalMessages];
    if (localPlayer?.isAlive) {
      // Alive players only see messages that are NOT from ghosts
      return combined.filter(m => !m.isGhost);
    }
    // Ghosts see all messages
    return combined;
  }, [messages, externalMessages, localPlayer?.isAlive]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  useEffect(() => {
    const loadDiscussion = async () => {
      try {
        const chat = await getMeetingDiscussion(players, deadBodies, reporterId);
        setMessages(chat);
      } catch (err) {
        console.error("Failed to load discussion:", err);
      } finally {
        setIsDiscussionLoading(false);
      }
    };
    loadDiscussion();
  }, [players, deadBodies, reporterId]);

  useEffect(() => {
    if (isHost) {
      const bots = players.filter(p => p.isAlive && p.isAI);
      bots.forEach((p, idx) => {
        // If bot hasn't voted yet and no vote is scheduled, schedule one
        if (!externalVotes[p.id] && !botVotesScheduled.current.has(p.id)) {
          botVotesScheduled.current.add(p.id);
          const t = setTimeout(() => {
            const shouldSkip = Math.random() > 0.65;
            let targetId = 'skip';
            if (!shouldSkip) {
              const targets = players.filter(t => t.isAlive);
              if (targets.length > 0) {
                targetId = targets[Math.floor(Math.random() * targets.length)].id;
              }
            }
            delete botTimeouts.current[p.id];
            onCastVote(targetId, p.id);
          }, 3000 + idx * 1000 + Math.random() * 2000);
          botTimeouts.current[p.id] = t;
        }
      });
    }
  }, [isHost, players, externalVotes]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const handleVoteClick = (pid: string) => {
    if (votingLocked || !localPlayer?.isAlive) return;
    setLocalVote(pid);
  };

  const concludeMeeting = () => {
    if (showResults) return; // Already concluding
    setVotingLocked(true);
    setShowResults(true);
    
    // Show results for 4 seconds before returning to game
    setTimeout(() => {
      calculateResultAndFinish();
    }, 4000);
  };

  const calculateResultAndFinish = () => {
    const voteCounts: Record<string, number> = {};
    
    (Object.values(externalVotes) as string[]).forEach((votedId: string) => {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    let maxVotes = 0;
    let winnerId: string | null = null;
    let isTie = false;

    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count; winnerId = id; isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    if (winnerId === 'skip' || isTie || !winnerId) {
      onVote(null);
    } else {
      onVote(winnerId);
    }
  };

  // Check if everyone has voted
  useEffect(() => {
    if (showResults) return;
    const voters = alivePlayers.map(p => p.id);
    const hasEveryoneVoted = voters.every(id => !!externalVotes[id]);
    
    if (hasEveryoneVoted && voters.length > 0) {
      concludeMeeting();
    }
  }, [externalVotes, alivePlayers, showResults]);

  const confirmVote = () => {
    if (!localVote) return;
    setVotingLocked(true);
    onCastVote(localVote, localPlayerId);
  };

  // Timer logic
  useEffect(() => {
    if (showResults) return;
    if (timeLeft <= 0) {
      concludeMeeting();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6 animate-in zoom-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-6xl rounded-[2.5rem] border-8 border-gray-600 overflow-hidden flex flex-col h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        <div className="bg-[#334155] p-6 text-center border-b-8 border-gray-600 relative">
          <h2 className="text-5xl font-black text-white uppercase italic tracking-widest">
            {showResults ? "Voting Results" : "Who is the Impostor?"}
          </h2>
          {!showResults && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Time Remaining</span>
              <span className={`text-4xl font-black italic ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
            </div>
          )}
          {localPlayer?.isAlive === false && <div className="text-red-500 font-black uppercase text-xs mt-2">Ghosts cannot vote</div>}
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-[2] p-8 grid grid-cols-2 gap-6 overflow-y-auto bg-[#0f172a] custom-scrollbar">
            {players.map(p => {
              const hasVoted = !!externalVotes[p.id];
              const isDead = !p.isAlive;
              const isMe = p.id === localPlayerId;
              
              // Count votes for this player if results are shown
              const voteCount = showResults ? Object.values(externalVotes).filter(v => v === p.id).length : 0;

              return (
                <button
                  key={p.id}
                  onClick={() => !isDead && handleVoteClick(p.id)}
                  disabled={isDead || votingLocked || !localPlayer?.isAlive}
                  className={`relative flex items-center p-4 rounded-2xl border-4 transition-all h-24 ${
                    isDead ? 'opacity-30 grayscale cursor-not-allowed bg-black/40' : 
                    localVote === p.id ? 'border-green-500 bg-green-900/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-gray-600 bg-gray-800'
                  } ${isMe ? 'ring-4 ring-blue-500 ring-inset' : ''}`}
                >
                  <div className="w-14 h-14 rounded-xl mr-6 shadow-xl relative" style={{ backgroundColor: p.color }}>
                    {isDead && <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold text-2xl">X</div>}
                  </div>
                  <div className="flex flex-col flex-1 text-left truncate">
                    <span className="text-white font-black text-2xl uppercase">{p.name} {isMe && "(YOU)"}</span>
                    {p.id === reporterId && <span className="text-red-500 font-black text-[10px] uppercase tracking-widest">REPORTER</span>}
                  </div>
                  {showResults && voteCount > 0 && (
                    <div className="absolute -top-3 -right-3 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-white shadow-lg animate-bounce">
                      {voteCount}
                    </div>
                  )}
                  {!showResults && hasVoted && <div className="bg-green-500 px-3 py-1 rounded-lg text-white font-black text-[10px] animate-pulse">VOTED</div>}
                </button>
              );
            })}
          </div>
          <div className="flex-1 bg-black/40 p-6 flex flex-col border-l-8 border-gray-600 backdrop-blur-md">
            <h3 className="text-gray-500 font-black uppercase text-xs mb-6 tracking-widest">Discussion Area</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar mb-4">
              {isDiscussionLoading ? <div className="text-center text-gray-500 font-black uppercase text-xs animate-pulse mt-10">Initializing Communication...</div> : 
                allMessages.map((m) => (
                  <div key={m.id} className={`bg-gray-800/80 p-4 rounded-2xl border-l-8 animate-in slide-in-from-right-4 duration-300 ${m.isGhost ? 'opacity-60' : ''}`} style={{ borderColor: players.find(p => p.id === m.senderId)?.color || '#fff' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="block font-black text-[10px] uppercase" style={{ color: players.find(p => p.id === m.senderId)?.color || '#fff' }}>
                        {m.senderName} {m.isGhost && <span className="text-blue-400 ml-1">(GHOST)</span>}
                      </span>
                    </div>
                    <p className="text-white text-base font-medium leading-tight">{m.content}</p>
                  </div>
                ))
              }
              <div ref={chatEndRef} />
            </div>

            {!showResults && (
              <div className="mb-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Waiting for:</h4>
                <div className="flex flex-wrap gap-2">
                  {alivePlayers.filter(p => !externalVotes[p.id]).map(p => (
                    <span key={p.id} className="px-2 py-1 bg-gray-800 rounded-lg text-[10px] font-black uppercase border border-white/10" style={{ color: p.color }}>
                      {p.name}
                    </span>
                  ))}
                  {alivePlayers.filter(p => !externalVotes[p.id]).length === 0 && (
                    <span className="text-[10px] text-green-500 font-black uppercase italic">Everyone has voted!</span>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendChat} className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 border-2 border-gray-600 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500 transition-all font-medium"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-black uppercase text-xs transition-all active:scale-95"
              >
                Send
              </button>
            </form>

            <div className="mt-auto flex flex-col gap-4">
              {showResults ? (
                <div className="bg-blue-900/40 border-4 border-blue-500 p-6 rounded-2xl text-center">
                  <span className="text-blue-400 font-black uppercase text-xl tracking-widest animate-pulse">
                    Processing Results...
                  </span>
                  {Object.values(externalVotes).filter(v => v === 'skip').length > 0 && (
                    <div className="mt-2 text-gray-400 font-bold text-sm">
                      Skips: {Object.values(externalVotes).filter(v => v === 'skip').length}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={() => handleVoteClick('skip')} disabled={votingLocked || !localPlayer?.isAlive} className={`w-full p-6 rounded-2xl border-4 font-black uppercase text-xl transition-all ${localVote === 'skip' ? 'border-blue-500 bg-blue-900/40 text-blue-400' : 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Skip Vote</button>
                  {localVote && !votingLocked && localPlayer?.isAlive && <button onClick={confirmVote} className="w-full p-6 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-2xl uppercase italic transition-all shadow-lg active:scale-95">Confirm Vote</button>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
