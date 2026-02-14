export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR');
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR');
};

export const formatPrice = (mil: number): string => {
  if (mil < 10000) return `${Math.round(mil)} mil`;
  const dt = mil / 1000;
  return `${dt.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
};

export const calculateDuration = (startTime: string, stopTime: string): string => {
  const start = new Date(startTime).getTime();
  const end = new Date(stopTime).getTime();
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
};

export const formatElapsedTime = (startTime: string): string => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);
  
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
