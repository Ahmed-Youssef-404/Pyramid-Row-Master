import React from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import { GameState } from '../../types/game';
import { Play, PlusCircle } from 'lucide-react';

interface ResumeGameModalProps {
  isOpen: boolean;
  activeGame: GameState;
  onResume: () => void;
  onStartNew: () => void;
}

export const ResumeGameModal: React.FC<ResumeGameModalProps> = ({
  isOpen,
  activeGame,
  onResume,
  onStartNew,
}) => {
  const totalCircles = (activeGame.pyramidSize * (activeGame.pyramidSize + 1)) / 2;
  const claimedCount = Object.values(activeGame.cells).filter(c => c.ownerId !== null).length;
  const currentTurnPlayer = activeGame.players[activeGame.currentPlayerIndex];

  return (
    <Modal isOpen={isOpen} onClose={onResume} title="Active Game Found" maxWidth="md" showCloseButton={false}>
      <div className="space-y-4">
        <p className="text-slate-300 text-sm">
          You have an unfinished game in progress. Would you like to resume where you left off or start a new game?
        </p>

        {/* Game summary chip */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>Pyramid Size:</span>
            <strong className="text-white font-semibold">{activeGame.pyramidSize} Rows ({totalCircles} Circles)</strong>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Progress:</span>
            <strong className="text-indigo-400 font-semibold">{claimedCount} / {totalCircles} Claimed</strong>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Current Turn:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-white">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: currentTurnPlayer?.colorHex }}
              />
              {currentTurnPlayer?.name}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            icon={<Play className="w-4 h-4 fill-current" />}
            onClick={onResume}
          >
            Continue Game
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={onStartNew}
          >
            Start New Game
          </Button>
        </div>
      </div>
    </Modal>
  );
};
