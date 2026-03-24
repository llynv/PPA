import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import type { SpotCategory, DrillFilters, DrillConcept } from '../../types/drill';
import { DRILL_SPOTS } from '../../data/drillSpots';
import { useDrillStore } from '../../store/drillStore';

const CATEGORIES: { label: string; value: SpotCategory }[] = [
  { label: 'Preflop', value: 'preflop' },
  { label: 'Flop', value: 'flop' },
  { label: 'Turn', value: 'turn' },
  { label: 'River', value: 'river' },
];

const DIFFICULTIES: { label: string; value: 1 | 2 | 3 }[] = [
  { label: 'Beginner', value: 1 },
  { label: 'Intermediate', value: 2 },
  { label: 'Advanced', value: 3 },
];

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function DrillSetup() {
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<(1 | 2 | 3)[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<DrillConcept[]>([]);
  const startSession = useDrillStore((s) => s.startSession);

  const [searchParams] = useSearchParams();
  const conceptParam = searchParams.get("concept");

  useEffect(() => {
    if (conceptParam) {
      const validConcepts: string[] = [
        "open_raise", "three_bet", "cold_call", "squeeze", "steal",
        "cbet_value", "cbet_bluff", "check_raise", "float", "probe",
        "barrel", "pot_control", "semi_bluff", "check_call",
        "value_bet_thin", "bluff_catch", "river_raise", "river_bluff",
      ];
      if (validConcepts.includes(conceptParam)) {
        setSelectedConcepts([conceptParam as DrillConcept]);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const matchingCount = useMemo(() => {
    return DRILL_SPOTS.filter((s) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(s.category)) return false;
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(s.difficulty)) return false;
      if (selectedConcepts.length > 0 && !selectedConcepts.includes(s.concept)) return false;
      return true;
    }).length;
  }, [selectedCategories, selectedDifficulties, selectedConcepts]);

  const handleStart = () => {
    const filters: DrillFilters = {
      categories: selectedCategories,
      difficulties: selectedDifficulties,
      concepts: selectedConcepts,
    };
    startSession(filters);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-lg w-full">
        {/* Title */}
        <h1 className="text-2xl font-bold text-neutral-100 mb-1">Spot Drills</h1>
        <p className="text-neutral-400 text-sm mb-6">
          Practice isolated decisions with instant GTO feedback.
        </p>

        {/* Category Filter */}
        <div className="mb-5">
          <label className="block text-neutral-300 font-medium mb-2 text-sm">
            Street
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ label, value }) => {
              const active = selectedCategories.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => setSelectedCategories(toggleInArray(selectedCategories, value))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-amber-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="mb-6">
          <label className="block text-neutral-300 font-medium mb-2 text-sm">
            Difficulty
          </label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map(({ label, value }) => {
              const active = selectedDifficulties.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => setSelectedDifficulties(toggleInArray(selectedDifficulties, value))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-amber-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spot Count */}
        <p className="text-neutral-400 text-sm mb-4">
          <span className="text-neutral-100 font-semibold">{matchingCount}</span>{' '}
          {matchingCount === 1 ? 'spot matches' : 'spots match'} your filters
        </p>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={matchingCount === 0}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white py-3 rounded-lg font-bold text-lg transition-colors disabled:cursor-not-allowed"
        >
          Start Drilling
        </button>
      </div>
    </div>
  );
}
