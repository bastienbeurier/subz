import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Room, Player, Answer, Vote, ChatMessage, VoteKick } from "@/types/game";

interface GameState {
  // Synced from Supabase Realtime
  room: Room | null;
  players: Player[];
  answers: Answer[];
  votes: Vote[];
  messages: ChatMessage[];
  voteKicks: VoteKick[];

  // Local player identity (persisted in localStorage)
  myPlayerId: string | null;
  myPseudo: string | null;

  // Local UI flags
  hasSubmittedAnswer: boolean;
  hasVoted: boolean;

  // Realtime channel status
  isConnected: boolean;
}

interface GameActions {
  setRoom: (room: Room) => void;
  upsertPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setPlayers: (players: Player[]) => void;
  addAnswer: (answer: Answer) => void;
  upsertAnswer: (answer: Answer) => void;
  removeAnswer: (answerId: string) => void;
  setAnswers: (answers: Answer[]) => void;
  addVote: (vote: Vote) => void;
  removeVote: (voteId: string) => void;
  setVotes: (votes: Vote[]) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addVoteKick: (voteKick: VoteKick) => void;
  removeVoteKick: (voteKickId: string) => void;
  setVoteKicks: (voteKicks: VoteKick[]) => void;
  setMyPlayer: (id: string, pseudo: string) => void;
  setSubmitted: (submitted: boolean) => void;
  setVoted: (voted: boolean) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

const initialState: GameState = {
  room: null,
  players: [],
  answers: [],
  votes: [],
  messages: [],
  voteKicks: [],
  myPlayerId: null,
  myPseudo: null,
  hasSubmittedAnswer: false,
  hasVoted: false,
  isConnected: false,
};

export const useGameStore = create<GameState & GameActions>()(
  immer((set) => ({
    ...initialState,

    setRoom: (room) =>
      set((state) => {
        state.room = room;
      }),

    upsertPlayer: (player) =>
      set((state) => {
        const idx = state.players.findIndex((p) => p.id === player.id);
        if (idx >= 0) {
          state.players[idx] = player;
        } else {
          state.players.push(player);
        }
      }),

    removePlayer: (playerId) =>
      set((state) => {
        state.players = state.players.filter((p) => p.id !== playerId);
      }),

    setPlayers: (players) =>
      set((state) => {
        state.players = players;
      }),

    addAnswer: (answer) =>
      set((state) => {
        if (!state.answers.find((a) => a.id === answer.id)) {
          state.answers.push(answer);
        }
      }),

    upsertAnswer: (answer) =>
      set((state) => {
        const idx = state.answers.findIndex((a) => a.id === answer.id);
        if (idx >= 0) {
          state.answers[idx] = answer;
        } else {
          state.answers.push(answer);
        }
      }),

    setAnswers: (answers) =>
      set((state) => {
        state.answers = answers;
      }),

    addVote: (vote) =>
      set((state) => {
        if (!state.votes.find((v) => v.id === vote.id)) {
          state.votes.push(vote);
        }
      }),

    removeAnswer: (answerId) =>
      set((state) => {
        state.answers = state.answers.filter((a) => a.id !== answerId);
      }),

    removeVote: (voteId) =>
      set((state) => {
        state.votes = state.votes.filter((v) => v.id !== voteId);
      }),

    setVotes: (votes) =>
      set((state) => {
        state.votes = votes;
      }),

    addMessage: (message) =>
      set((state) => {
        if (!state.messages.find((m) => m.id === message.id)) {
          state.messages.push(message);
        }
      }),

    setMessages: (messages) =>
      set((state) => {
        state.messages = messages;
      }),

    addVoteKick: (voteKick) =>
      set((state) => {
        if (!state.voteKicks.find((vk) => vk.id === voteKick.id)) {
          state.voteKicks.push(voteKick);
        }
      }),

    removeVoteKick: (voteKickId) =>
      set((state) => {
        state.voteKicks = state.voteKicks.filter((vk) => vk.id !== voteKickId);
      }),

    setVoteKicks: (voteKicks) =>
      set((state) => {
        state.voteKicks = voteKicks;
      }),

    setMyPlayer: (id, pseudo) =>
      set((state) => {
        state.myPlayerId = id;
        state.myPseudo = pseudo;
      }),

    setSubmitted: (submitted) =>
      set((state) => {
        state.hasSubmittedAnswer = submitted;
      }),

    setVoted: (voted) =>
      set((state) => {
        state.hasVoted = voted;
      }),

    setConnected: (connected) =>
      set((state) => {
        state.isConnected = connected;
      }),

    reset: () => set(() => initialState),
  }))
);

// Selectors
export const selectMyPlayer = (state: GameState & GameActions) =>
  state.players.find((p) => p.id === state.myPlayerId) ?? null;

export const selectConnectedPlayers = (state: GameState & GameActions) =>
  state.players.filter((p) => p.is_connected);

// Players eligible to submit answers / cast votes this round. Mid-round joiners
// (joined_round === current_round) are excluded — they can only participate
// starting next round, so they shouldn't block the "all answered/voted" checks.
export const selectActivePlayersThisRound = (state: GameState & GameActions) => {
  const round = state.room?.current_round ?? 0;
  return state.players.filter(
    (p) => p.is_connected && p.joined_round < round
  );
};

export const selectCurrentAnswers = (state: GameState & GameActions) =>
  state.answers
    .filter((a) => a.round === (state.room?.current_round ?? 0))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

export const selectCurrentVotes = (state: GameState & GameActions) =>
  state.votes.filter((v) => v.round === (state.room?.current_round ?? 0));

export const selectSortedPlayers = (state: GameState & GameActions) =>
  [...state.players].sort((a, b) => b.score - a.score);
