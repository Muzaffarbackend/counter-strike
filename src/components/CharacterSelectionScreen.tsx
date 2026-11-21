import { ArrowLeft, Check } from 'lucide-react';
import { CHARACTERS, getCharacterById, TEAM_NAMES } from '../data/characters';
import { audioEngine } from '../engine/AudioEngine';
import { TeamId } from '../types/game';
import { ShowcaseViewport } from './ShowcaseViewport';

interface CharacterSelectionScreenProps {
  selectedTeam: TeamId;
  selectedCharacterId: string;
  equippedWeaponId: string;
  onSelect: (team: TeamId, characterId: string) => void;
  onBack: () => void;
}

export function CharacterSelectionScreen({
  selectedTeam,
  selectedCharacterId,
  equippedWeaponId,
  onSelect,
  onBack,
}: CharacterSelectionScreenProps) {
  const activeChar = getCharacterById(selectedCharacterId);
  const teamChars = CHARACTERS.filter((c) => c.team === selectedTeam);

  const switchTeam = (team: TeamId) => {
    audioEngine.playUiClick();
    const first = CHARACTERS.find((c) => c.team === team)!;
    onSelect(team, first.id);
  };

  return (
    <div className="w-full h-full bg-[#090B0E] text-zinc-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800/80 bg-[#0D1016]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              audioEngine.playUiClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#151922] hover:bg-[#1E2430] border border-zinc-800 rounded-lg text-sm text-zinc-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Orqaga</span>
          </button>
          <h1 className="font-display text-2xl font-bold tracking-wider">JAMOA VA QAHRAMON TANLASH</h1>
        </div>

        <div className="flex items-center gap-2 bg-[#12161D] p-1 rounded-lg border border-zinc-800">
          {(['A', 'B'] as TeamId[]).map((tid) => (
            <button
              key={tid}
              onClick={() => switchTeam(tid)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedTeam === tid
                  ? 'bg-orange-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {TEAM_NAMES[tid].name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Character List (5 per team) */}
        <div className="lg:col-span-5 overflow-y-auto p-8 border-r border-zinc-800/80 space-y-4">
          <div className="mb-2">
            <h2 className="font-display text-lg font-bold text-zinc-100">
              {TEAM_NAMES[selectedTeam].name}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">{TEAM_NAMES[selectedTeam].desc}</p>
          </div>

          <div className="space-y-3">
            {teamChars.map((ch) => {
              const isSelected = ch.id === selectedCharacterId;
              return (
                <button
                  key={ch.id}
                  onMouseEnter={() => audioEngine.playUiHover()}
                  onClick={() => {
                    audioEngine.playUiClick();
                    onSelect(ch.team, ch.id);
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-orange-500/12 border-orange-500'
                      : 'bg-[#12161D] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: ch.accentColor }}
                      />
                      <span className="font-display text-base font-bold text-zinc-100">
                        {ch.name}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-orange-400 mt-1">{ch.role}</p>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{ch.bio}</p>
                  </div>

                  {isSelected && (
                    <span className="w-6 h-6 rounded-md bg-orange-600 flex items-center justify-center text-white shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Rotating 3D Character Preview */}
        <div className="lg:col-span-7 relative bg-[#0B0E13] flex flex-col">
          <div className="flex-1 min-h-[360px]">
            <ShowcaseViewport
              mode="character"
              characterId={activeChar.id}
              weaponId={equippedWeaponId}
              interactiveRotate={true}
            />
          </div>

          <div className="p-6 border-t border-zinc-800/80 bg-[#0D1016] flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400">
                3D modelni sichqoncha bilan aylantirishingiz mumkin · {activeChar.role}
              </p>
              <h3 className="font-display text-2xl font-bold text-zinc-100 mt-0.5">
                {activeChar.name}
              </h3>
            </div>

            <button
              onClick={() => {
                audioEngine.playUiClick();
                onBack();
              }}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-display font-bold text-sm tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              TANLOVNI TASDIQLASH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
