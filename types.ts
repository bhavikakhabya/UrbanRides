
export interface User {
  name: string;
  email: string;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface RideOption {
  id: string;
  name: string;
  eta: number; // minutes
  price: number;
  image: string;
  description: string;
}

export interface Driver {
  name: string;
  rating: number;
  carModel: string;
  plateNumber: string;
  phone: string;
  photoUrl: string;
}

export type PaymentMethod = 'UPI' | 'CASH';

export interface RideHistoryItem {
  id: string;
  date: string;
  pickup: string;
  destination: string;
  price: number;
  status: 'COMPLETED' | 'CANCELLED';
}

export interface FavoritePlace {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'other';
}

export enum AppScreen {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  MAP_SELECTION = 'MAP_SELECTION',
  RIDE_CONFIRMED = 'RIDE_CONFIRMED',
  ON_TRIP = 'ON_TRIP',
  RATING = 'RATING',
}
