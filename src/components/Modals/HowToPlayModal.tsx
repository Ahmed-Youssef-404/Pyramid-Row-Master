import React from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import { CheckCircle2, Award, Zap, Layers, Sparkles, AlertCircle, Bot } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play Pyramid Row Master" maxWidth="2xl">
      <div className="space-y-5 text-sm text-slate-300 max-h-[72vh] overflow-y-auto pr-1">
        {/* Intro */}
        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Objective:</strong> Claim circles inside the pyramid to
            complete lines and earn points. The player with the highest score when all circles
            are claimed wins the match!
          </p>
        </div>

        {/* Highlighted Core Rule Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-base">
            <Award className="w-5 h-5" />
            <span>The Line Completion Rule</span>
          </div>
          <p className="text-slate-200 text-xs leading-relaxed">
            A scoring line is completed when <strong>every circle in that line has been claimed by ANY players</strong>,
            regardless of which player owns them.
          </p>
          <p className="text-amber-200 text-xs font-semibold leading-relaxed">
            The player who claims the <strong>LAST remaining unclaimed circle</strong> needed to complete that line receives all the points for that line!
          </p>

          {/* Visual Example */}
          <div className="mt-3 pt-3 border-t border-amber-500/20 bg-slate-950/60 rounded-lg p-3 text-xs">
            <div className="text-slate-400 mb-2 font-medium">Example: 4-circle horizontal line</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-[10px] text-white font-bold">1</span>
              <span className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-[10px] text-white font-bold">2</span>
              <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">3</span>
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-[10px] ring-2 ring-white">4</span>
              <span className="text-amber-300 font-bold ml-2">➜ Yellow claims 4th circle: Line complete!</span>
            </div>
            <div className="text-[11px] text-slate-300">
              <strong className="text-amber-300">Yellow receives +4 points</strong>, even though the other three circles belong to Red, Blue, and Green. A player does <em className="text-white not-italic font-bold">not</em> need to own all circles in the line.
            </div>
          </div>
        </div>

        {/* Core Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Turn Flow */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Turn Order & Moves</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Players take turns in rotation. On your turn, tap <strong>any unclaimed circle</strong> anywhere
              on the board. There is no requirement to play adjacent to previous moves.
            </p>
          </div>

          {/* Three Directions */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Layers className="w-4 h-4" />
              <span>3 Scoring Directions</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              <li>
                <strong>Horizontal Rows:</strong> Across each row of the pyramid.
              </li>
              <li>
                <strong>Down-Left Diagonals ↙:</strong> Parallel to the left edge.
              </li>
              <li>
                <strong>Down-Right Diagonals ↘:</strong> Parallel to the right edge.
              </li>
            </ul>
          </div>

          {/* Combo Multi-Line Bonus */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Multi-Line Combos</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A single circle can simultaneously complete <strong>up to 3 lines</strong> (1
              horizontal + 2 diagonals). You earn the sum of all completed lines in one move!
            </p>
          </div>

          {/* Line Length & Points */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Award className="w-4 h-4" />
              <span>Points = Line Length</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Each completed line awards points equal to its number of circles (a line of 4 gives +4 pts, a line of 7 gives +7 pts).
            </p>
          </div>
        </div>

        {/* Top Circle & Minimum Length Rule */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Minimum 2 Circles & The Top Row</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            A valid scoring line must contain <strong>at least 2 circles</strong>. The top circle of the pyramid is a standard playable circle, but claiming it awards 0 points because it is not a 2+ circle line.
          </p>
        </div>

        {/* One-time scoring note */}
        <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-200">
          <strong>No Double Scoring:</strong> Each line awards points only once, to the player whose move completes it. Once completed, that line is locked.
        </div>

        {/* AI Bots Feature Note */}
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-200 flex items-start gap-2.5">
          <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white">AI-Controlled Bots:</strong> You can play against 1 to 3 AI opponents (Easy, Medium, or Hard). Bots operate on the exact same rules, board evaluation, and scoring mechanics as human players without needing an internet connection.
          </div>
        </div>

        {/* Footer close */}
        <div className="flex justify-end pt-1">
          <Button variant="primary" onClick={onClose} size="md">
            Got it, Let's Play!
          </Button>
        </div>
      </div>
    </Modal>
  );
};
