import { create } from 'zustand';

export interface Persona {
  id?: string;
  name: string;
  archetype: string;
  brandMission: string;
  productName: string;
  problemDescription: string;
  painPoints: string[];
  toneProfessionalism: number;
  toneConciseness: number;
  toneEmpathy: number;
  authenticityMarkers: {
    useLowercaseI: boolean;
    useContractions: boolean;
    varySentenceLength: boolean;
    avoidCorporateSpeak: boolean;
  };
}

interface PersonaStore {
  persona: Persona | null;
  setPersona: (persona: Persona) => void;
  updatePersona: (updates: Partial<Persona>) => void;
  resetPersona: () => void;
}

const defaultPersona: Persona = {
  name: '',
  archetype: 'The Helpful Expert',
  brandMission: '',
  productName: '',
  problemDescription: '',
  painPoints: [],
  toneProfessionalism: 7,
  toneConciseness: 6,
  toneEmpathy: 8,
  authenticityMarkers: {
    useLowercaseI: true,
    useContractions: true,
    varySentenceLength: true,
    avoidCorporateSpeak: true,
  },
};

export const usePersonaStore = create<PersonaStore>((set) => ({
  persona: null,
  setPersona: (persona) => set({ persona }),
  updatePersona: (updates) =>
    set((state) => ({
      persona: state.persona ? { ...state.persona, ...updates } : { ...defaultPersona, ...updates },
    })),
  resetPersona: () => set({ persona: null }),
}));

