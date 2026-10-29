import React from 'react';
import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { LayerRuntimeState, ShaderLayerDefinition } from '../shaders/types';

interface LayerCardProps {
  layer: ShaderLayerDefinition;
  runtime: LayerRuntimeState;
  orderIndex: number;
  totalLayers: number;
  activeChainRank: number | null; // 1-based rank among currently active layers
  isDragging?: boolean;
  isDragOver?: boolean;
  onMixChange: (layerId: string, mix: number) => void;
  onSubParamChange: (layerId: string, subKey: string, value: number) => void;
  onSolo: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
  onMoveToTop: (layerId: string) => void;
  onDragStart: (layerId: string) => void;
  onDragOver: (e: React.DragEvent, layerId: string) => void;
  onDrop: (layerId: string) => void;
  onDragEnd: () => void;
}

export const LayerCard: React.FC<LayerCardProps> = ({
  layer,
  runtime,
  orderIndex,
  totalLayers,
  activeChainRank,
  isDragging,
  isDragOver,
  onMixChange,
  onSubParamChange,
  onSolo,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const mixVal = runtime?.mix ?? layer.defaultMix;
  const isActive = mixVal > 0.01;

  const ensureLayerVisible = () => {
    if (mixVal <= 0.01) {
      onMixChange(layer.id, layer.defaultMix > 0.05 ? layer.defaultMix : 0.75);
    }
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(layer.id)}
      onDragOver={(e) => onDragOver(e, layer.id)}
      onDrop={() => onDrop(layer.id)}
      onDragEnd={onDragEnd}
      className={`p-3 rounded-lg border transition-all space-y-2.5 ${
        isDragOver
          ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50'
          : isDragging
          ? 'opacity-45 border-amber-400/50 bg-white/[0.06]'
          : isActive
          ? 'bg-white/[0.045] border-white/20'
          : 'bg-white/[0.015] border-white/10 opacity-85 hover:opacity-100'
      }`}
    >
      {/* Layer Header, Reorder Controls & Master Mix Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-neutral-300 shrink-0"
              title="Drag to reorder layer in negative-space stack"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold shrink-0 ${
                activeChainRank === 1
                  ? 'bg-amber-400 text-neutral-950'
                  : activeChainRank !== null
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'bg-white/5 text-neutral-400 border border-white/10'
              }`}
              title={
                activeChainRank === 1
                  ? 'Primary Foreground Layer (#1) — its negative space is filled by #2'
                  : activeChainRank !== null
                  ? `Active Negative-Space Chain #${activeChainRank} (fills negative space of #1..#${activeChainRank - 1})`
                  : `Stack Position #${orderIndex + 1}`
              }
            >
              {activeChainRank !== null ? `#${activeChainRank}` : `${orderIndex + 1}`}
            </span>
            <label
              htmlFor={`slider-${layer.id}-mix`}
              className="text-white font-semibold truncate cursor-pointer"
              title={layer.description}
            >
              {layer.name}
            </label>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Reorder buttons: Top, Up, Down */}
            {orderIndex > 0 && (
              <button
                type="button"
                onClick={() => onMoveToTop(layer.id)}
                title="Move to #1 (Front of Negative-Space Chain)"
                className="p-1 rounded bg-white/5 border border-white/10 text-neutral-300 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronsUp className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              disabled={orderIndex === 0}
              onClick={() => onMoveUp(layer.id)}
              title="Move layer up in stack order"
              className="p-1 rounded bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={orderIndex === totalLayers - 1}
              onClick={() => onMoveDown(layer.id)}
              title="Move layer down in stack order"
              className="p-1 rounded bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSolo(layer.id)}
              className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Solo
            </button>
            <span className="font-mono tabular-nums text-amber-400 w-9 text-right">
              {(mixVal * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Active Negative-Space Role Sub-Label */}
        {activeChainRank !== null && (
          <div className="flex items-center justify-between text-[10px] text-neutral-400 pl-5">
            <span>
              {activeChainRank === 1
                ? 'Foreground #1 — carves negative space for #2'
                : `Fills negative space left by #${activeChainRank - 1}`}
            </span>
            <span className="font-mono text-neutral-500">
              Stack #{orderIndex + 1}
            </span>
          </div>
        )}

        <input
          id={`slider-${layer.id}-mix`}
          type="range"
          min="0.0"
          max="1.0"
          step="0.02"
          value={mixVal}
          onChange={(e) => onMixChange(layer.id, parseFloat(e.target.value))}
          className="w-full hud-slider"
        />
      </div>

      {/* Core Layer Shader Parameters */}
      {layer.subParams.length > 0 && (
        <div
          className={`grid gap-2.5 pt-1 ${
            layer.subParams.length === 1
              ? 'grid-cols-1'
              : layer.subParams.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          {layer.subParams.map((sub) => {
            const val = runtime?.values?.[sub.key] ?? sub.defaultValue;
            const formatted = sub.format ? sub.format(val) : val.toFixed(2);
            return (
              <div key={sub.key} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-300 gap-1">
                  <span className="truncate" title={sub.label}>
                    {sub.label}
                  </span>
                  <span className="font-mono tabular-nums text-neutral-400 shrink-0">
                    {formatted}
                  </span>
                </div>
                <input
                  type="range"
                  min={sub.min}
                  max={sub.max}
                  step={sub.step}
                  value={val}
                  onChange={(e) => {
                    ensureLayerVisible();
                    onSubParamChange(layer.id, sub.key, parseFloat(e.target.value));
                  }}
                  className="w-full hud-slider"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

