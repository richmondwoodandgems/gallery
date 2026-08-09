export interface Photo {
  order: number;
  thumb: string;
  full: string;
  width: number;
  height: number;
  animated: boolean;
}

export interface Piece {
  id: string;
  title: string;
  description: string;
  addedAt: string;
  photos: Photo[];
}

export interface Manifest {
  generatedAt: string;
  about: string;
  items: Piece[];
}
