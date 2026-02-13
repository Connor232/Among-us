
import React, { useState, useEffect, useMemo } from 'react';
import { Player, Message, PlayerRole } from '../types';
import { getMeetingDiscussion } from '../services/geminiService';

interface MeetingRoomProps {
  players: Player[];
  localPlayerId: string;
  reporterId: string;
  onVote: (votedPlayerId: string | null) => void;
  deadBodies: any[];
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ players, localPlayerId, reporterId, onVote, deadBodies }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(true);
  const [localVote, setLocalVote] = useState<string | null>(null);
  const [votingLocked, setVotingLocked] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});

  const localPlayer = useMemo(() => players.find(p => p.id === localPlayerId), [players, localPlayerId]);

  useEffect(() => {
    const loadDiscussion = async () => {
      const chat = await getMeetingDiscussion(players, deadBodies, reporterId);
      setMessages(chat);
      setIsDiscussionLoading(false);
      
      const others = players.filter(p => p.isAlive && p.id !== localPlayerId);
      others.forEach((p, idx) => {
        setTimeout(() => {
          setVotes(prev => {
            const shouldSkip = Math.random() > 0.65;
            let targetId = 'skip';
            if (!shouldSkip) {
              const targets = players.filter(t => t.isAlive);
              targetId = targets[Math.floor(Math.random() * targets.length)].id;
            }
            return { ...prev, [p.id]: targetId };
          });
        }, 1500 + idx * 700 + Math.random() * 1000);
      });
    };
    loadDiscussion();
  }, [players, deadBodies, reporterId, localPlayerId]);

  const handleVoteClick = (pid: string) => {
    if (votingLocked || !localPlayer?.isAlive) return;
    setLocalVote(pid);
  };

  const calculateResultAndFinish = () => {
    const voteCounts: Record<string, number> = {};
    const finalVotes: Record<string, string> = { ...votes, [localPlayerId]: localVote || 'skip' };
    
    (Object.values(finalVotes) as string[]).forEach((votedId: string) => {
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

  const confirmVote = () => {
    setVotingLocked(true);
    setVotes(prev => ({ ...prev, [localPlayerId]: localVote || 'skip' }));
    setTimeout(() => { calculateResultAndFinish(); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6 animate-in zoom-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-6xl rounded-[2.5rem] border-8 border-gray-600 overflow-hidden flex flex-col h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        <div className="bg-[#334155] p-6 text-center border-b-8 border-gray-600 relative">
          <h2 className="text-5xl font-black text-white uppercase italic tracking-widest">Who is the Impostor?</h2>
          {localPlayer?.isAlive === false && <div className="text-red-500 font-black uppercase text-xs mt-2">Ghosts cannot vote</div>}
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-[2] p-8 grid grid-cols-2 gap-6 overflow-y-auto bg-[#0f172a] custom-scrollbar">
            {players.map(p => {
              const hasVoted = !!votes[p.id];
              const isDead = !p.isAlive;
              const isMe = p.id === localPlayerId;
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
                  {hasVoted && <div className="bg-green-500 px-3 py-1 rounded-lg text-white font-black text-[10px] animate-pulse">VOTED</div>}
                </button>
              );
            })}
          </div>
          <div className="flex-1 bg-black/40 p-6 flex flex-col border-l-8 border-gray-600 backdrop-blur-md">
            <h3 className="text-gray-500 font-black uppercase text-xs mb-6 tracking-widest">Log Summary</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
              {isDiscussionLoading ? <div className="text-center text-gray-500 font-black uppercase text-xs animate-pulse mt-10">Initializing Communication...</div> : 
                messages.map((m, idx) => (
                  <div key={idx} className="bg-gray-800/80 p-4 rounded-2xl border-l-8" style={{ borderColor: players.find(p => p.id === m.senderId)?.color || '#fff' }}>
                    <span className="block font-black text-[10px] uppercase mb-1" style={{ color: players.find(p => p.id === m.senderId)?.color || '#fff' }}>{m.senderName}</span>
                    <p className="text-white text-base font-medium leading-tight">{m.content}</p>
                  </div>
                ))
              }
            </div>
            <div className="mt-8 flex flex-col gap-4">
              <button onClick={() => handleVoteClick('skip')} disabled={votingLocked || !localPlayer?.isAlive} className={`w-full p-6 rounded-2xl border-4 font-black uppercase text-xl transition-all ${localVote === 'skip' ? 'border-blue-500 bg-blue-900/40 text-blue-400' : 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>Skip Vote</button>
              {localVote && !votingLocked && localPlayer?.isAlive && <button onClick={confirmVote} className="w-full p-6 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-2xl uppercase italic transition-all shadow-lg active:scale-95">Confirm Vote</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
