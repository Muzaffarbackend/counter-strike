import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { WEAPON_CATEGORIES, WEAPON_SKINS, WEAPONS } from '../data/weapons';
import { audioEngine } from '../engine/AudioEngine';
import { EquippedLoadout, SkinId, WeaponCategory, WeaponSpec } from '../types/game';
import { ShowcaseViewport } from './ShowcaseViewport';

interface WeaponInventoryScreenProps {
  loadout: EquippedLoadout;
  onUpdateLoadout: (next: EquippedLoadout) => void;
  onBack: () => void;
}

export function WeaponInventoryScreen({
  loadout,
  onUpdateLoadout,
  onBack,
}: WeaponInventoryScreenProps) {
  const [category, setCategory] = useState<WeaponCategory | 'all'>('all');
  const [inspectWeaponId, setInspectWeaponId] = useState<string>(loadout.primaryWeaponId);

  const filtered = category === 'all' ? WEAPONS : WEAPONS.filter((w) => w.category === category);
  const activeWeapon = WEAPONS.find((w) => w.id === inspectWeaponId) || WEAPONS[0];
  const activeSkin: SkinId = loadout.weaponSkins[activeWeapon.id] || 'classic';

  const isEquipped = (w: WeaponSpec) => {
    if (w.slot === 1) return loadout.primaryWeaponId === w.id;
    if (w.slot === 2) return loadout.secondaryWeaponId === w.id;
    return loadout.meleeWeaponId === w.id;
  };

  const equipWeapon = (w: WeaponSpec) => {
    audioEngine.playEquip();
    if (w.slot === 1) {
      onUpdateLoadout({ ...loadout, primaryWeaponId: w.id });
    } else if (w.slot === 2) {
      onUpdateLoadout({ ...loadout, secondaryWeaponId: w.id });
    } else {
      onUpdateLoadout({ ...loadout, meleeWeaponId: w.id });
    }
  };

  const setSkin = (skinId: SkinId) => {
    audioEngine.playUiClick();
    onUpdateLoadout({
      ...loadout,
      weaponSkins: {
        ...loadout.weaponSkins,
        [activeWeapon.id]: skinId,
      },
    });
  };

  const rarityColor = (r: WeaponSpec['rarity']) =>
    r === 'Afsonaviy'
      ? 'text-amber-400'
      : r === 'Epik'
      ? 'text-orange-400'
      : r === 'Noyob'
      ? 'text-sky-400'
      : 'text-zinc-400';

  return (
    <div className="w-full h-full bg-[#090B0E] text-zinc-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 border-b border-zinc-800/80 bg-[#0D1016]">
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
          <h1 className="font-display text-2xl font-bold tracking-wider">QUROLLAR OMBORI</h1>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#12161D] p-1 rounded-lg border border-zinc-800">
          {WEAPON_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                audioEngine.playUiClick();
                setCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                category === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Weapon Cards */}
        <div className="lg:col-span-5 overflow-y-auto p-6 border-r border-zinc-800/80 space-y-3">
          {filtered.map((w) => {
            const selected = w.id === activeWeapon.id;
            const equipped = isEquipped(w);
            return (
              <div
                key={w.id}
                onClick={() => {
                  audioEngine.playUiHover();
                  setInspectWeaponId(w.id);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  selected
                    ? 'bg-[#171D27] border-orange-500'
                    : 'bg-[#12161D] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-semibold ${rarityColor(w.rarity)}`}>{w.rarity}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-400">{w.slot}-o'rin</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-zinc-100 mt-0.5 truncate">
                    {w.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{w.description}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    equipWeapon(w);
                    setInspectWeaponId(w.id);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    equipped
                      ? 'bg-emerald-600/20 border border-emerald-500/60 text-emerald-300'
                      : 'bg-orange-600 hover:bg-orange-500 text-white'
                  }`}
                >
                  {equipped ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Jihozlangan</span>
                    </>
                  ) : (
                    <span>Jihozlash</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: 3D Weapon Inspector + 7 Cosmetic Skins */}
        <div className="lg:col-span-7 flex flex-col bg-[#0B0E13] overflow-y-auto">
          <div className="h-[340px] lg:h-[380px] relative border-b border-zinc-800/80">
            <ShowcaseViewport
              mode="weapon"
              weaponId={activeWeapon.id}
              skinId={activeSkin}
              interactiveRotate={true}
            />
            <div className="absolute top-4 left-6 pointer-events-none">
              <span className={`text-xs font-semibold ${rarityColor(activeWeapon.rarity)}`}>
                {activeWeapon.rarity} · {WEAPON_SKINS[activeSkin].name}
              </span>
              <h2 className="font-display text-2xl font-bold text-zinc-100">{activeWeapon.name}</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 7 Cosmetic Skins */}
            <div>
              <span className="block text-xs font-semibold text-zinc-400 mb-3">
                Kosmetik qoplamalar (7 xil dizayn)
              </span>
              <div className="flex flex-wrap gap-2.5">
                {Object.values(WEAPON_SKINS).map((skin) => {
                  const chosen = activeSkin === skin.id;
                  return (
                    <button
                      key={skin.id}
                      onClick={() => setSkin(skin.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        chosen
                          ? 'bg-orange-500/15 border-orange-500 text-zinc-100'
                          : 'bg-[#12161D] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${skin.primaryColor}, ${skin.accentColor})`,
                        }}
                      />
                      <span>{skin.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weapon Ballistic Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#12161D] border border-zinc-800 rounded-lg p-3.5">
                <div className="text-xs text-zinc-400">Zarba kuchi</div>
                <div className="font-mono-num text-xl font-bold text-zinc-100 mt-1">
                  {activeWeapon.damage}
                  {activeWeapon.pellets ? ` × ${activeWeapon.pellets}` : ''}
                </div>
              </div>
              <div className="bg-[#12161D] border border-zinc-800 rounded-lg p-3.5">
                <div className="text-xs text-zinc-400">Otish tezligi</div>
                <div className="font-mono-num text-xl font-bold text-zinc-100 mt-1">
                  {activeWeapon.fireRate}/s
                </div>
              </div>
              <div className="bg-[#12161D] border border-zinc-800 rounded-lg p-3.5">
                <div className="text-xs text-zinc-400">Magazin</div>
                <div className="font-mono-num text-xl font-bold text-zinc-100 mt-1">
                  {activeWeapon.isMelee ? '—' : `${activeWeapon.magSize} / ${activeWeapon.reserveAmmo}`}
                </div>
              </div>
              <div className="bg-[#12161D] border border-zinc-800 rounded-lg p-3.5">
                <div className="text-xs text-zinc-400">Masofa</div>
                <div className="font-mono-num text-xl font-bold text-zinc-100 mt-1">
                  {activeWeapon.range} m
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-400 max-w-lg">{activeWeapon.description}</p>
              <button
                onClick={() => equipWeapon(activeWeapon)}
                className={`px-6 py-2.5 rounded-lg font-display font-bold text-sm tracking-wider transition-colors cursor-pointer shrink-0 ${
                  isEquipped(activeWeapon)
                    ? 'bg-emerald-600/20 border border-emerald-500/60 text-emerald-300'
                    : 'bg-orange-600 hover:bg-orange-500 text-white'
                }`}
              >
                {isEquipped(activeWeapon) ? 'JIHOZLANGAN' : 'QUROLNI TANLASH'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
