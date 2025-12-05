
import { Driver, RideHistoryItem, FavoritePlace } from './types';

// Dynamic Vehicle Configuration for Fare Calculation
export const VEHICLE_CONFIGS = [
  {
    id: 'lumina-bike',
    name: 'Bike',
    basePrice: 20,
    pricePerKm: 7,
    avgSpeedKmH: 25,
    description: 'Beat the traffic',
    image: 'https://cdn-icons-png.flaticon.com/512/3097/3097136.png',
  },
  {
    id: 'lumina-auto',
    name: 'Auto',
    basePrice: 30,
    pricePerKm: 13,
    avgSpeedKmH: 22,
    description: 'Hassle-free auto rides',
    image: 'https://cdn-icons-png.flaticon.com/512/7484/7484931.png',
  },
  {
    id: 'lumina-mini',
    name: 'Mini',
    basePrice: 50,
    pricePerKm: 18,
    avgSpeedKmH: 35,
    description: 'Comfy hatchbacks',
    image: 'https://cdn-icons-png.flaticon.com/512/3085/3085335.png',
  },
  {
    id: 'lumina-ev',
    name: 'EV Plus',
    basePrice: 55,
    pricePerKm: 16, // Slightly cheaper per km to encourage green travel
    avgSpeedKmH: 32,
    description: 'Eco-friendly & silent',
    image: 'https://cdn-icons-png.flaticon.com/512/3233/3233516.png', 
  },
  {
    id: 'lumina-prime',
    name: 'Prime Sedan',
    basePrice: 70,
    pricePerKm: 24,
    avgSpeedKmH: 40,
    description: 'Spacious sedans',
    image: 'https://cdn-icons-png.flaticon.com/512/55/55283.png',
  },
  {
    id: 'lumina-suv',
    name: 'SUV',
    basePrice: 90,
    pricePerKm: 32,
    avgSpeedKmH: 38,
    description: 'For big groups',
    image: 'https://cdn-icons-png.flaticon.com/512/3089/3089803.png',
  },
];

export const MOCK_DRIVER: Driver = {
  name: 'Ramesh Kumar',
  rating: 4.8,
  carModel: 'Maruti Swift Dzire',
  plateNumber: 'KA-01-MJ-2024',
  phone: '+91 98765 43210',
  photoUrl: 'https://picsum.photos/100/100?random=4',
};

export const MOCK_HISTORY: RideHistoryItem[] = [
  {
    id: 'ride-101',
    date: 'Today, 10:30 AM',
    pickup: 'Home',
    destination: 'Tech Park, Sector 4',
    price: 160,
    status: 'COMPLETED',
  },
  {
    id: 'ride-102',
    date: 'Yesterday, 6:15 PM',
    pickup: 'Phoenix Mall',
    destination: 'Home',
    price: 210,
    status: 'COMPLETED',
  },
  {
    id: 'ride-103',
    date: 'Mon, 9:00 AM',
    pickup: 'Home',
    destination: 'Airport Terminal 2',
    price: 850,
    status: 'CANCELLED',
  },
];

export const MOCK_FAVORITES: FavoritePlace[] = [
  {
    id: 'fav-1',
    name: 'Home',
    address: '12/B Green Avenue, Indiranagar',
    type: 'home',
  },
  {
    id: 'fav-2',
    name: 'Work',
    address: 'Cyber Hub, DLF Phase 3',
    type: 'work',
  },
  {
    id: 'fav-3',
    name: 'Gym',
    address: 'Gold\'s Gym, Koramangala',
    type: 'other',
  },
];

export const CANCELLATION_REASONS = [
  "Driver denied duty",
  "Expected a shorter wait time",
  "Driver is not moving",
  "Changed my plans",
  "Booked by mistake",
  "Found a better ride",
];

export const SAFETY_OPTIONS = [
  { id: 'share', title: 'Share Ride Details', desc: 'Share your live location with friends', icon: 'share' },
  { id: 'sos', title: 'Emergency Call (SOS)', desc: 'Call police or emergency contacts', icon: 'phone' },
  { id: 'report', title: 'Report Safety Issue', desc: 'Report unsafe driving or behavior', icon: 'alert' },
];
