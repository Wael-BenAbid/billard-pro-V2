
export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  icon: string;
}

export interface ConsumedItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface BilliardSession {
  id: string;
  tableId: 'A' | 'B';
  startTime: string | null;
  stopTime: string | null;
  durationMinutes: number;
  price: number;
  items: ConsumedItem[];
  clientName: string;
  isPaid: boolean;
  nextPlayer: string;
  date: string; 
  timestamp: number;
}

export interface PS4TimeOption {
  id: string;
  label: string;
  minutes: number;
  price: number;
}

export interface PS4Game {
  id: string;
  name: string;
  icon: string;
  playerOptions: number[]; // [1, 2, 4]
  timeOptions: PS4TimeOption[];
}

export interface PS4Session {
  id: string;
  gameId: string;
  gameName: string;
  players: number;
  durationMinutes: number;
  price: number;
  date: string;
  timestamp: number;
}

export interface AppSettings {
  clubName: string;
  logoUrl: string;
  themeColor: string;
  tableAColor: string;
  tableBColor: string;
  inventory: InventoryItem[];
  rateBase: number;
  rateReduced: number;
  thresholdMins: number;
  floorMin: number;
  floorMid: number;
  ps4Games: PS4Game[];
}

export interface User {
  username: string;
  role: 'admin';
  password?: string;
}

export interface ProjectAnalysis {
  summary: string;
  techStack: string[];
  categories: {
    title: string;
    score: number;
    description: string;
    recommendations: string[];
  }[];
  suggestedRoadmap: string[];
}
