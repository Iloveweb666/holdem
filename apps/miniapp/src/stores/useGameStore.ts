import { create } from 'zustand';
import type { Card, GamePhase, Player, PlayerAction } from '@holdem/shared-types';
import { request } from '@/services/request';

export interface GameState {
  gameId: string | null;
  phase: GamePhase;
  pot: number;
  communityCards: Card[];
  players: Player[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  myCards: [Card, Card] | null;
  minRaise: number;
  currentBet: number;

  // UI state
  isMyTurn: boolean;
  actionTimeout: number | null;

  // Actions
  setGameState: (state: Partial<GameState>) => void;
  resetGame: () => void;
  startGame: (roomId: string) => Promise<boolean>;
  performAction: (action: PlayerAction, amount?: number) => Promise<boolean>;
  handleGameUpdate: (data: unknown) => void;
}

const initialState = {
  gameId: null,
  phase: 'preflop' as GamePhase,
  pot: 0,
  communityCards: [],
  players: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  smallBlindIndex: 0,
  bigBlindIndex: 0,
  myCards: null,
  minRaise: 0,
  currentBet: 0,
  isMyTurn: false,
  actionTimeout: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setGameState: (newState) => {
    set((state) => ({ ...state, ...newState }));
  },

  resetGame: () => {
    set(initialState);
  },

  startGame: async (roomId) => {
    try {
      const response = await request<{
        gameId: string;
        dealerIndex: number;
        smallBlindIndex: number;
        bigBlindIndex: number;
      }>({
        url: `/api/game/${roomId}/start`,
        method: 'POST',
      });

      if (response.success && response.data) {
        set({
          gameId: response.data.gameId,
          dealerIndex: response.data.dealerIndex,
          smallBlindIndex: response.data.smallBlindIndex,
          bigBlindIndex: response.data.bigBlindIndex,
          phase: 'preflop',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Start game error:', error);
      return false;
    }
  },

  performAction: async (action, amount) => {
    const { gameId } = get();
    if (!gameId) return false;

    try {
      const response = await request({
        url: `/api/game/${gameId}/action`,
        method: 'POST',
        data: { action, amount },
      });

      return response.success;
    } catch (error) {
      console.error('Perform action error:', error);
      return false;
    }
  },

  handleGameUpdate: (data: unknown) => {
    const update = data as Partial<GameState>;
    set((state) => ({
      ...state,
      ...update,
    }));
  },
}));
