import { ArrowLeft, Check, Play } from 'lucide-react';
import { getMapThumbnailUrl, MAPS } from '../data/maps';
import { audioEngine } from '../engine/AudioEngine';
import { MapId } from '../types/game';

interface MapSelectionScreenProps {
  selectedMapId: MapId;
  onSelectMap: (id: MapId) => void;
  onStartMatch: () => void;
  onBack: () => void;
}

export function MapSelectionScreen({
  selectedMapId,
  onSelectMap,
  onStartMatch,
  onBack,
}: MapSelectionScreenProps) {
  const activeMap = MAPS.find((m) => m.id === selectedMapId) || MAPS[0];

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
          <h1 className="font-display text-2xl font-bold tracking-wider">XARITA TANLASH (10 HUDUD)</h1>
        </div>

        <button
          onClick={() => {
            audioEngine.playUiClick();
            onStartMatch();
          }}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-display font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          <Play className="w-4 h-4" />
          <span>USHBU XARITADA O'YNASH</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Active Map Spotlight */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#12161D] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="lg:col-span-5 relative min-h-[220px]">
              <img
                src={getMapThumbnailUrl(activeMap)}
                alt={activeMap.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 text-xs text-zinc-300 font-mono-num">
                Xarita #{String(activeMap.index).padStart(2, '0')} · {activeMap.region}
              </div>
            </div>
            <div className="lg:col-span-7 p-6 flex flex-col justify-center">
              <p className="text-xs font-semibold text-orange-400 mb-1">{activeMap.atmosphere}</p>
              <h2 className="font-display text-3xl font-bold text-zinc-100 mb-3">
                {activeMap.name}
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
                {activeMap.description}
              </p>
            </div>
          </div>

          {/* 10 Maps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {MAPS.map((m) => {
              const selected = m.id === selectedMapId;
              return (
                <button
                  key={m.id}
                  onMouseEnter={() => audioEngine.playUiHover()}
                  onClick={() => {
                    audioEngine.playUiClick();
                    onSelectMap(m.id);
                  }}
                  className={`group text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#171D27] border-orange-500 ring-1 ring-orange-500'
                      : 'bg-[#12161D] border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={getMapThumbnailUrl(m)}
                      alt={m.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute bottom-2 left-2.5 text-[11px] font-mono-num text-zinc-300">
                      {String(m.index).padStart(2, '0')} · {m.region}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-md bg-orange-600 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-display text-sm font-bold text-zinc-100 truncate">
                      {m.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{m.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
