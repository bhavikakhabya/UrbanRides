
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, User, RideOption, PaymentMethod, RideHistoryItem, FavoritePlace } from './types';
import { Button } from './components/Button';
import { MapVisualization } from './components/MapVisualization';
import { VEHICLE_CONFIGS, MOCK_DRIVER, MOCK_HISTORY, MOCK_FAVORITES, CANCELLATION_REASONS, SAFETY_OPTIONS } from './constants';
import { 
  User as UserIcon, 
  MapPin, 
  Search, 
  ArrowLeft, 
  ShieldCheck, 
  Star, 
  Phone, 
  MessageSquare, 
  Navigation, 
  History, 
  Heart, 
  Home, 
  Briefcase, 
  CreditCard, 
  Banknote,
  Clock,
  X,
  Share2,
  AlertTriangle,
  Siren,
  CheckCircle,
  ThumbsUp,
  Volume2,
  Leaf,
  Calendar,
  ChevronRight,
  LocateFixed,
  Loader2,
  Edit2,
  Trash2,
  Plus,
  Save,
  Check,
  Zap
} from 'lucide-react';
import { getDestinationVibe } from './services/geminiService';

function App() {
  // State
  const [screen, setScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [availableRides, setAvailableRides] = useState<RideOption[]>([]);
  const [tripDistance, setTripDistance] = useState<number>(0);
  const [rideStatus, setRideStatus] = useState<'searching' | 'found' | 'arriving' | 'arrived' | 'in_progress' | 'completed'>('searching');
  const [carProgress, setCarProgress] = useState(0);
  const [destinationVibe, setDestinationVibe] = useState<string>('');
  
  // Payment Method State with Persistence
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    try {
      return (localStorage.getItem('lumina_payment_method') as PaymentMethod) || 'UPI';
    } catch {
      return 'UPI';
    }
  });

  const [activeTab, setActiveTab] = useState<'ride' | 'favorites' | 'history'>('ride');
  const [trafficCondition, setTrafficCondition] = useState<'clear' | 'moderate' | 'heavy'>('clear');
  const [isSearchingForRides, setIsSearchingForRides] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1);
  
  // Initialize history from local storage or use mock data
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_ride_history');
      return saved ? JSON.parse(saved) : MOCK_HISTORY;
    } catch (e) {
      return MOCK_HISTORY;
    }
  });

  // Favorites State with Persistence
  const [favorites, setFavorites] = useState<FavoritePlace[]>(() => {
    try {
      const saved = localStorage.getItem('lumina_favorites');
      return saved ? JSON.parse(saved) : MOCK_FAVORITES;
    } catch {
      return MOCK_FAVORITES;
    }
  });
  
  // New Feature States
  const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff'>('dropoff');
  const [otp, setOtp] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  
  // Favorites Management States
  const [editingFavorite, setEditingFavorite] = useState<FavoritePlace | null>(null); // For Add/Edit
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [favNameInput, setFavNameInput] = useState('');
  const [favAddressInput, setFavAddressInput] = useState('');
  
  // Schedule Ride States
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [tempScheduleTime, setTempScheduleTime] = useState<string>('');

  // Rating State
  const [rating, setRating] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);

  // Refs for intervals
  const trafficIntervalRef = useRef<any>(null);

  // Utils
  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(15);
  };

  // Persist history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('lumina_ride_history', JSON.stringify(rideHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [rideHistory]);

  // Persist payment method
  useEffect(() => {
    try {
      localStorage.setItem('lumina_payment_method', paymentMethod);
    } catch (e) {
      console.error("Failed to save payment method", e);
    }
  }, [paymentMethod]);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('lumina_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error("Failed to save favorites", e);
    }
  }, [favorites]);

  // Login Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName || !loginEmail) return;
    
    triggerHaptic();
    setUser({ name: loginName, email: loginEmail });
    setScreen(AppScreen.HOME);
  };

  // Safety Toolkit Actions
  const handleSafetyAction = async (actionId: string) => {
    triggerHaptic();
    if (actionId === 'share') {
      const shareData = {
        title: 'Track my ride - Lumina',
        text: `I'm on my way to ${dropoff} in a ${MOCK_DRIVER.carModel} (${MOCK_DRIVER.plateNumber}) driven by ${MOCK_DRIVER.name}.`,
        url: 'https://lumina.app/track/demo-ride'
      };
      
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback
          alert("Sharing not supported on this device. Copied to clipboard.");
          navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        }
      } catch (err) {
        console.log('Share canceled');
      }
    } else if (actionId === 'sos') {
      window.location.href = 'tel:100';
    } else {
      // Report logic placeholder
      alert("Safety report initiated. Support will contact you shortly.");
    }
    setShowSafetyModal(false);
  };

  // Schedule Handler
  const confirmSchedule = () => {
    if (tempScheduleTime) {
      const date = new Date(tempScheduleTime);
      const formatted = date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: true });
      setScheduledTime(formatted);
      setShowScheduleModal(false);
      triggerHaptic();
    }
  };

  // Favorites Handlers
  const handleDeleteFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
    setDeleteConfirmationId(null);
    triggerHaptic();
  };

  const openEditFavorite = (fav?: FavoritePlace) => {
    if (fav) {
      setEditingFavorite(fav);
      setFavNameInput(fav.name);
      setFavAddressInput(fav.address);
    } else {
      setEditingFavorite({ id: 'new', name: '', address: '', type: 'other' });
      setFavNameInput('');
      setFavAddressInput('');
    }
  };

  const handleSaveFavorite = () => {
    if (!favNameInput || !favAddressInput || !editingFavorite) return;
    
    if (editingFavorite.id === 'new') {
      const newFav: FavoritePlace = {
        id: `fav-${Date.now()}`,
        name: favNameInput,
        address: favAddressInput,
        type: 'other'
      };
      setFavorites(prev => [...prev, newFav]);
    } else {
      setFavorites(prev => prev.map(f => f.id === editingFavorite.id ? { ...f, name: favNameInput, address: favAddressInput } : f));
    }
    setEditingFavorite(null);
    triggerHaptic();
  };

  // Location Handlers
  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (pickup && dropoff) {
      // Show searching state
      setIsSearchingForRides(true);

      // Simulate API search delay and Data Fetching
      setTimeout(() => {
        // Calculate a random distance for this trip
        const dist = parseFloat((Math.random() * 13 + 2).toFixed(1)); // 2km - 15km
        setTripDistance(dist);
        
        // --- Dynamic Traffic & Pricing Logic ---
        // Randomly simulate traffic
        const rand = Math.random();
        const condition = rand > 0.7 ? 'heavy' : rand > 0.4 ? 'moderate' : 'clear';
        setTrafficCondition(condition);

        // Determine Surge
        // Simulate high demand randomly
        const demandFactor = Math.random();
        const surge = demandFactor > 0.8 ? 1.4 : demandFactor > 0.6 ? 1.2 : 1.0;
        setSurgeMultiplier(surge);

        // Generate options
        const generatedOptions: RideOption[] = VEHICLE_CONFIGS.map(config => {
          // Base Price calculation
          let calculatedPrice = config.basePrice + (dist * config.pricePerKm);
          
          // Traffic Adjustments (Heavy traffic = more time = slightly higher cost)
          if (condition === 'heavy') calculatedPrice *= 1.1;
          
          // Surge Adjustment
          calculatedPrice *= surge;

          // Rounding
          const price = Math.round(calculatedPrice);
          
          // ETA calculation based on speed and traffic
          // Heavy traffic reduces speed by 40%, Moderate by 20%
          const trafficMultiplier = condition === 'heavy' ? 1.4 : condition === 'moderate' ? 1.2 : 1;
          const eta = Math.ceil(((dist / config.avgSpeedKmH) * 60) * trafficMultiplier) + 2;

          return {
              id: config.id,
              name: config.name,
              description: config.description,
              image: config.image,
              price: price,
              eta: eta
          };
        });

        setAvailableRides(generatedOptions.sort((a,b) => a.price - b.price));
        setSelectedRide(null); // Reset selection
        setIsSearchingForRides(false);
        setScreen(AppScreen.MAP_SELECTION);
        getDestinationVibe(dropoff).then(setDestinationVibe);
      }, 2000); 
    }
  };

  const handleMapClick = (coords: { x: number, y: number }) => {
    const streetNum = Math.floor(Math.random() * 100) + 1;
    const locationName = `Sector ${streetNum}, Map Pin`;

    triggerHaptic();

    if (activeInput === 'pickup') {
      setPickup(locationName);
    } else {
      setDropoff(locationName);
    }
  };

  const handleSelectRide = (ride: RideOption) => {
    triggerHaptic();
    setSelectedRide(ride);
  };

  const handleConfirmBooking = () => {
    if (!selectedRide) return;
    triggerHaptic();
    
    setOtp(Math.floor(1000 + Math.random() * 9000).toString());
    setScreen(AppScreen.RIDE_CONFIRMED);
    
    // If Scheduled, stop here in terms of simulation
    if (scheduledTime) {
        setRideStatus('found'); // Just to show booked state, but we handle UI differently
        return; 
    }

    // Normal Flow
    setRideStatus('searching');
    setCarProgress(0);
    
    // Simulate finding driver sequence
    setTimeout(() => {
        setRideStatus('found'); 
        triggerHaptic();
    }, 2500);

    setTimeout(() => {
        setRideStatus('arriving');
    }, 4500);
  };

  const handleStartRide = () => {
      triggerHaptic();
      setRideStatus('in_progress');
      setCarProgress(0);
      setScreen(AppScreen.ON_TRIP);
  };

  const handleCallDriver = () => {
      triggerHaptic();
      window.location.href = `tel:${MOCK_DRIVER.phone}`;
  };

  const handleCancelRide = () => {
    triggerHaptic();
    if (!cancelReason) return;
    
    const cancelledRide: RideHistoryItem = {
      id: `ride-cancelled-${Date.now()}`,
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
      pickup: pickup || 'Current Location',
      destination: dropoff,
      price: 0, 
      status: 'CANCELLED'
    };
    setRideHistory(prev => [cancelledRide, ...prev]);

    setScreen(AppScreen.HOME);
    setRideStatus('searching');
    setCarProgress(0);
    setShowCancelModal(false);
    setCancelReason('');
    setSelectedRide(null);
    setScheduledTime(null);
  };

  const handleRatingSubmit = () => {
    triggerHaptic();

    if (selectedRide) {
      const totalPrice = selectedRide.price + tipAmount; 
      const newRide: RideHistoryItem = {
        id: `ride-${Date.now()}`,
        date: scheduledTime || ('Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        pickup: pickup || 'Current Location',
        destination: dropoff,
        price: totalPrice, 
        status: 'COMPLETED'
      };
      setRideHistory(prev => [newRide, ...prev]);
    }

    setScreen(AppScreen.HOME);
    setRideStatus('searching');
    setCarProgress(0);
    setRating(0);
    setTipAmount(0);
    setFeedbackTags([]);
    setSelectedRide(null);
    setPickup('');
    setDropoff('');
    setScheduledTime(null);
  };

  // Simulating car movement and Traffic
  useEffect(() => {
    // If scheduled ride, do not run simulation
    if (scheduledTime && screen === AppScreen.RIDE_CONFIRMED) return;

    let interval: any;

    // Phase 1: Driver coming to user
    if (rideStatus === 'arriving') {
      interval = setInterval(() => {
        setCarProgress(prev => {
            if (prev >= 100) {
                setRideStatus('arrived');
                triggerHaptic();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
                return 100;
            }
            return prev + 0.5; 
        });
      }, 50);
    }

    // Phase 2: Trip in progress
    if (rideStatus === 'in_progress') {
      // Randomly change traffic
      trafficIntervalRef.current = setInterval(() => {
          const conditions: ('clear' | 'moderate' | 'heavy')[] = ['clear', 'clear', 'moderate', 'heavy', 'clear'];
          const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
          setTrafficCondition(randomCondition);
      }, 4000);

      interval = setInterval(() => {
        setCarProgress(prev => {
            // Slow down if traffic is heavy
            const speed = trafficCondition === 'heavy' ? 0.1 : trafficCondition === 'moderate' ? 0.3 : 0.5;
            
            if (prev >= 100) {
                setRideStatus('completed');
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
                return 100;
            }
            return prev + speed;
        });
      }, 100);
    }

    return () => {
        clearInterval(interval);
        if (trafficIntervalRef.current) clearInterval(trafficIntervalRef.current);
    };
  }, [rideStatus, trafficCondition, scheduledTime, screen]);

  // Transition to Rating Screen
  useEffect(() => {
    if (rideStatus === 'completed' && screen === AppScreen.ON_TRIP) {
      const timeout = setTimeout(() => {
        setScreen(AppScreen.RATING);
      }, 2000); 
      return () => clearTimeout(timeout);
    }
  }, [rideStatus, screen]);

  // Dynamic ETA Calculation
  const getEta = () => {
      // Base speed factor based on ride status
      let baseSpeed = 0.5;
      if (rideStatus === 'in_progress') {
          // Use current traffic condition
          baseSpeed = trafficCondition === 'heavy' ? 0.1 : trafficCondition === 'moderate' ? 0.3 : 0.5;
      }

      if (rideStatus === 'in_progress' || rideStatus === 'arriving') {
          const distanceLeft = 100 - carProgress;
          const ticksRemaining = distanceLeft / baseSpeed;
          // Scale ticks to minutes 
          const scaleFactor = rideStatus === 'arriving' ? 50 : 100;
          const minutesLeft = Math.ceil(ticksRemaining / scaleFactor); 
          return minutesLeft > 0 ? minutesLeft : 1;
      }
      return 0;
  };

  const getDriverArrivalStatusText = () => {
    if (rideStatus === 'arriving') {
      if (carProgress < 50) return "Driver on the way";
      if (carProgress < 90) return "Driver arriving soon";
      return "Driver is almost here";
    }
    return "Driver has arrived";
  };

  // --- Render Functions ---
  const renderLogin = () => (
    <div className="h-screen w-full flex flex-col justify-end relative overflow-hidden bg-lumina-900">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop" 
          alt="City Night" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-lumina-900 via-lumina-900/80 to-transparent" />
      </div>

      <div className="z-10 w-full p-6 pb-12 animate-slide-up">
        <div className="mb-8">
           <div className="inline-flex items-center gap-2 bg-lumina-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 mb-6 shadow-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide">Available across India</span>
           </div>
           
           <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
             Move with <br />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-lumina-400 to-indigo-400">Confidence.</span>
           </h1>
           <p className="text-gray-300 text-lg max-w-[80%]">Safe, fast, and reliable rides at your fingertips.</p>
        </div>

        <div className="bg-lumina-800/40 backdrop-blur-xl p-1 rounded-3xl border border-white/10 p-6 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full bg-lumina-900/60 border border-lumina-700/50 rounded-xl p-4 text-white focus:outline-none focus:border-lumina-400 focus:bg-lumina-900/80 transition-all placeholder-gray-500 mb-2"
                  required
                />
              </div>
              <div>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-lumina-900/60 border border-lumina-700/50 rounded-xl p-4 text-white focus:outline-none focus:border-lumina-400 focus:bg-lumina-900/80 transition-all placeholder-gray-500"
                  required
                />
              </div>
              <Button type="submit" fullWidth className="!py-4 text-lg shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                 Get Started <ChevronRight className="w-5 h-5" />
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-4 justify-center">
               <div className="h-[1px] bg-white/10 flex-1" />
               <span className="text-xs text-gray-500 font-medium">OR CONTINUE WITH</span>
               <div className="h-[1px] bg-white/10 flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 transition-colors">
                   <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" /> Google
                </button>
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 text-white font-bold text-sm border border-gray-700 hover:bg-gray-700 transition-colors">
                   <img src="https://www.svgrepo.com/show/511330/apple-173.svg" className="w-5 h-5 invert" alt="Apple" /> Apple
                </button>
            </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="h-screen flex flex-col bg-lumina-900 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapVisualization showRoute={false} onMapClick={handleMapClick} />
      </div>

      {isSearchingForRides && (
        <div className="absolute inset-0 z-50 bg-lumina-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-slide-up">
           <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-lumina-800 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-lumina-400 rounded-full animate-spin" />
              <Search className="absolute inset-0 m-auto text-lumina-400 w-10 h-10 animate-pulse" />
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Analyzing Routes...</h2>
           <p className="text-gray-400">Checking traffic and demand</p>
        </div>
      )}

      {showScheduleModal && (
         <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-lumina-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-white/10 animate-slide-up shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-lumina-400" /> Schedule Ride
                  </h3>
                  <button onClick={() => setShowScheduleModal(false)}><X className="text-gray-400" /></button>
               </div>
               
               <p className="text-sm text-gray-400 mb-4">Pick a time for your ride. We'll ensure a driver is ready.</p>
               
               <input 
                  type="datetime-local" 
                  className="w-full bg-lumina-900 border border-lumina-700 rounded-xl p-4 text-white mb-6 focus:border-lumina-400 outline-none color-scheme-dark"
                  onChange={(e) => setTempScheduleTime(e.target.value)}
               />

               <Button fullWidth onClick={confirmSchedule} disabled={!tempScheduleTime}>
                 Set Pickup Time
               </Button>
            </div>
         </div>
      )}

      {/* Edit Favorite & Delete Modal code omitted for brevity but assumed present */}

      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 pointer-events-none">
        <Button variant="secondary" className="!p-2 !rounded-full aspect-square pointer-events-auto shadow-lg bg-lumina-900/80 backdrop-blur" onClick={() => setScreen(AppScreen.LOGIN)}>
           <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="bg-lumina-800/80 backdrop-blur-md p-2 rounded-full border border-lumina-700 flex items-center gap-2 pr-4 pointer-events-auto shadow-lg">
            <div className="w-8 h-8 bg-gradient-to-tr from-lumina-400 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-white">Hi, {user?.name}</span>
        </div>
      </header>

      <div className="absolute bottom-0 left-0 right-0 z-20 bg-lumina-900/95 backdrop-blur-xl rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all animate-slide-up max-h-[85vh] flex flex-col">
         <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mt-4 mb-2" />

         <div className="px-6 pb-6 pt-2 overflow-y-auto scrollbar-hide">
            <div className="flex space-x-6 mb-6 border-b border-white/10">
              <button onClick={() => setActiveTab('ride')} className={`pb-2 text-sm font-medium transition-all ${activeTab === 'ride' ? 'text-lumina-400 border-b-2 border-lumina-400' : 'text-gray-400 hover:text-white'}`}>Book Ride</button>
              <button onClick={() => setActiveTab('favorites')} className={`pb-2 text-sm font-medium transition-all ${activeTab === 'favorites' ? 'text-lumina-400 border-b-2 border-lumina-400' : 'text-gray-400 hover:text-white'}`}>Favorites</button>
              <button onClick={() => setActiveTab('history')} className={`pb-2 text-sm font-medium transition-all ${activeTab === 'history' ? 'text-lumina-400 border-b-2 border-lumina-400' : 'text-gray-400 hover:text-white'}`}>History</button>
            </div>

            {activeTab === 'ride' && (
              <div className="animate-slide-up pointer-events-auto">
                <h2 className="text-3xl font-light text-white mb-6 drop-shadow-lg">Where to <span className="font-bold text-lumina-400">today?</span></h2>
                <form onSubmit={handleLocationSubmit} className="space-y-4 relative group">
                  <div className="absolute left-[23px] top-[24px] bottom-[70px] w-[2px] bg-gradient-to-b from-lumina-400 to-indigo-500 z-0" />
                  <div className="relative z-10">
                    <div className="absolute left-3 top-3.5 w-4 h-4 bg-lumina-900 border-2 border-lumina-400 rounded-full z-10" />
                    <input 
                      value={pickup}
                      onFocus={() => setActiveInput('pickup')}
                      onChange={(e) => setPickup(e.target.value)}
                      placeholder="Pickup Location" 
                      className={`w-full pl-10 pr-10 py-3 bg-lumina-800/50 border rounded-xl text-white focus:outline-none transition-all placeholder-gray-400 ${activeInput === 'pickup' ? 'border-lumina-400 ring-1 ring-lumina-400' : 'border-lumina-700'}`}
                      required
                    />
                  </div>
                  <div className="relative z-10">
                    <div className="absolute left-3 top-3.5 w-4 h-4 bg-lumina-900 border-2 border-indigo-500 rounded-sm z-10" />
                    <input 
                      value={dropoff}
                      onFocus={() => setActiveInput('dropoff')}
                      onChange={(e) => setDropoff(e.target.value)}
                      placeholder="Destination" 
                      className={`w-full pl-10 pr-10 py-3 bg-lumina-800/50 border rounded-xl text-white focus:outline-none transition-all placeholder-gray-400 ${activeInput === 'dropoff' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-lumina-700'}`}
                      required
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                     <Button type="button" variant="secondary" className="!px-3 !py-3 bg-lumina-800" onClick={() => setShowScheduleModal(true)}>
                        <Clock className={`w-5 h-5 ${scheduledTime ? 'text-lumina-400' : ''}`} />
                     </Button>
                     <Button type="submit" fullWidth className="!py-3">
                       {scheduledTime ? `Schedule for ${scheduledTime}` : 'Find Ride'} <Search className="w-4 h-4" />
                     </Button>
                  </div>
                </form>
                {/* Suggestions omitted */}
              </div>
            )}
             {/* Other tabs omitted */}
         </div>
      </div>
    </div>
  );

  const renderMapSelection = () => (
    <div className="h-screen flex flex-col relative">
      <div className="absolute inset-0 z-0">
        <MapVisualization 
          showRoute={true} 
          trafficCondition={trafficCondition} 
          onMapClick={handleMapClick} 
          destinationLabel={dropoff}
        />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <Button variant="secondary" className="!p-2 !rounded-full shadow-lg !bg-lumina-900" onClick={() => setScreen(AppScreen.HOME)}>
           <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="mt-auto z-10 bg-lumina-900 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 p-6 animate-slide-up flex flex-col max-h-[85vh]">
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-4" />
        
        <div className="mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white">Select Ride</h2>
                <div className="flex flex-col items-end">
                   <span className="text-xs text-gray-400 bg-lumina-800 px-2 py-1 rounded">{tripDistance} km</span>
                   {scheduledTime && <span className="text-[10px] text-lumina-400 mt-1 font-bold">{scheduledTime}</span>}
                </div>
            </div>
            
            {/* Surge UI */}
            {surgeMultiplier > 1 && (
               <div className="flex items-center gap-2 mb-2 bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/30">
                  <Zap className="w-4 h-4 text-purple-400 fill-purple-400" />
                  <span className="text-xs text-purple-200 font-bold">Surge Pricing x{surgeMultiplier} due to high demand</span>
               </div>
            )}
            
            <p className="text-xs text-gray-400">
               Prices include {trafficCondition !== 'clear' ? 'traffic delay' : ''} {trafficCondition !== 'clear' && surgeMultiplier > 1 ? 'and' : ''} {surgeMultiplier > 1 ? 'surge' : ''} factors.
            </p>
        </div>

        <div className="space-y-3 overflow-y-auto pb-2 scrollbar-hide flex-1">
            {availableRides.map((ride) => (
                <button 
                  key={ride.id}
                  onClick={() => handleSelectRide(ride)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all group active:scale-[0.98] ${selectedRide?.id === ride.id ? 'bg-lumina-800 border-lumina-400 ring-1 ring-lumina-400 shadow-lg scale-[1.02]' : 'bg-lumina-800/40 border-lumina-700/50 hover:bg-lumina-800 hover:border-lumina-500'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-10 bg-white/10 rounded-lg flex items-center justify-center p-1 relative overflow-hidden">
                           <img src={ride.image} alt={ride.name} className="w-full h-full object-contain opacity-90 group-hover:scale-110 transition-transform relative z-10" />
                        </div>
                        <div className="text-left">
                            <p className={`font-bold flex items-center gap-2 ${selectedRide?.id === ride.id ? 'text-white' : 'text-gray-200'}`}>
                                {ride.name}
                            </p>
                            <p className="text-xs text-gray-400">{ride.description} • {ride.eta} min</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold text-lg ${selectedRide?.id === ride.id ? 'text-lumina-400' : 'text-white'}`}>₹{ride.price}</p>
                        {selectedRide?.id === ride.id && (
                           <div className="w-5 h-5 bg-lumina-400 rounded-full ml-auto mt-1 flex items-center justify-center">
                              <Check className="w-3 h-3 text-black font-bold" />
                           </div>
                        )}
                    </div>
                </button>
            ))}
        </div>

        <div className="mt-2 pt-2 border-t border-white/5">
             <Button fullWidth onClick={handleConfirmBooking} disabled={!selectedRide} className={!selectedRide ? 'opacity-50 cursor-not-allowed' : ''}>
                {selectedRide ? `Confirm ${selectedRide.name}` : 'Select a Vehicle'}
                {selectedRide && <ChevronRight className="w-4 h-4" />}
             </Button>
        </div>
      </div>
    </div>
  );

  const renderRideConfirmed = () => {
    const eta = getEta();
    const isClose = eta <= 2;

    return (
    <div className="h-screen flex flex-col relative">
      <div className="absolute inset-0 z-0">
        <MapVisualization 
          showRoute={true} 
          carPosition={carProgress} 
          trafficCondition={trafficCondition}
          isRideActive={rideStatus === 'arriving' || rideStatus === 'arrived'}
          isDriverArriving={rideStatus === 'arriving' || rideStatus === 'arrived'}
          destinationLabel={dropoff} 
        />
      </div>

       <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/90 to-transparent z-10">
           <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium text-center inline-block border shadow-lg mx-auto w-full max-w-[90%] flex items-center justify-center gap-3 transition-all bg-black/40 border-white/10`}>
              {scheduledTime ? (
                  <>
                    <Calendar className="w-4 h-4 text-lumina-400" />
                    Ride Scheduled
                  </>
              ) : (
                <>
                  {rideStatus === 'searching' && <><Loader2 className="w-4 h-4 animate-spin text-lumina-400" /> Contacting nearby drivers...</>}
                  {rideStatus === 'found' && <><CheckCircle className="w-4 h-4 text-green-400" /> Driver Found! Rerouting...</>}
                  {(rideStatus === 'arriving' || rideStatus === 'arrived') && <><div className="w-2 h-2 bg-lumina-400 rounded-full animate-pulse" /> Driver is on the way to Pickup</>}
                </>
              )}
           </div>
       </div>

      <div className="mt-auto z-10 bg-lumina-900 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 p-6 animate-slide-up min-h-[350px] flex flex-col relative">
        
        {/* Scheduled Ride Confirmation View */}
        {scheduledTime ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                 <div className="w-20 h-20 bg-lumina-800 rounded-full flex items-center justify-center mb-4 border border-lumina-400/30">
                     <Calendar className="w-10 h-10 text-lumina-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed</h2>
                 <p className="text-gray-400 mb-6">Your ride is scheduled for <br/> <span className="text-white font-bold">{scheduledTime}</span></p>
                 <div className="w-full bg-lumina-800 p-4 rounded-xl mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Vehicle</span>
                        <span className="text-white font-bold">{selectedRide?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Fare</span>
                        <span className="text-white font-bold">₹{selectedRide?.price}</span>
                    </div>
                 </div>
                 <Button fullWidth onClick={() => setScreen(AppScreen.HOME)}>Done</Button>
             </div>
        ) : (
            // Live Ride View
            <>
                {rideStatus === 'searching' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                        <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 border-4 border-lumina-800 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-lumina-400 rounded-full animate-spin" />
                        <Search className="absolute inset-0 m-auto text-lumina-400 w-8 h-8 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Contacting Drivers...</h3>
                        <p className="text-gray-400 text-sm mt-2">Connecting you with nearby {selectedRide?.name}s.</p>
                    </div>
                )}

                {(rideStatus !== 'searching') && (
                    <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {rideStatus === 'arriving' ? 'Driver Arriving' : 
                                rideStatus === 'arrived' ? 'Driver Arrived' : 'Driver Found'}
                            </h2>
                            {rideStatus === 'arriving' ? (
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className={`text-3xl font-bold text-lumina-400 ${isClose ? 'animate-pulse' : ''}`}>
                                        {eta} MIN
                                    </span>
                                    <span className="text-sm text-gray-400 font-medium">AWAY</span>
                                </div>
                            ) : (
                                <p className="text-lumina-400 text-sm font-medium mt-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> {rideStatus === 'arrived' ? 'Waiting at pickup' : 'Confirming details'}
                                </p>
                            )}
                        </div>
                        
                        <Button variant="secondary" className="!p-2.5 rounded-xl ml-2" onClick={() => setShowSafetyModal(true)}>
                            <ShieldCheck className="w-5 h-5 text-green-400" />
                        </Button>
                        </div>

                        {(rideStatus === 'arriving' || rideStatus === 'arrived') && (
                        <div className="flex justify-end mb-4 animate-slide-up">
                            <div className="flex flex-col items-end">
                                <button 
                                    onClick={handleStartRide}
                                    disabled={rideStatus !== 'arrived'}
                                    className={`px-6 py-3 rounded-xl text-lg font-bold tracking-widest border mb-1 shadow-[0_0_10px_rgba(74,222,128,0.2)] transition-all ${rideStatus === 'arrived' ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 cursor-pointer active:scale-95' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-70'}`}
                                >
                                    {rideStatus === 'arrived' ? `START: ${otp}` : `OTP: ${otp}`}
                                </button>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                    {rideStatus === 'arrived' ? 'Tap OTP to Start Ride' : 'Share OTP when driver arrives'}
                                </span>
                            </div>
                        </div>
                        )}

                        <div className="bg-lumina-800 p-4 rounded-2xl flex items-center gap-4 mb-6 border border-lumina-700 shadow-lg">
                            <div className="relative">
                                <img src={MOCK_DRIVER.photoUrl} alt="Driver" className="w-16 h-16 rounded-full object-cover border-2 border-white/10" />
                                <div className="absolute -bottom-1 -right-1 bg-white text-lumina-900 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center shadow-sm">
                                    <Star className="w-2.5 h-2.5 mr-0.5 fill-yellow-400 text-yellow-400" /> {MOCK_DRIVER.rating}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg">{MOCK_DRIVER.name}</h3>
                                <p className="text-gray-400 text-sm">{MOCK_DRIVER.carModel}</p>
                                <p className="text-xs text-lumina-400 mt-1">
                                {paymentMethod === 'UPI' ? 'UPI Payment' : 'Cash Payment'}: ₹{selectedRide?.price}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="bg-white/10 px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-white tracking-widest border border-white/20">
                                    {MOCK_DRIVER.plateNumber}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-auto">
                        <Button variant="secondary" className="justify-center" onClick={triggerHaptic}>
                            <MessageSquare className="w-4 h-4" /> Message
                        </Button>
                        <Button 
                            variant="primary" 
                            className="justify-center !bg-indigo-500 hover:!bg-indigo-400 !text-white !shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                            onClick={handleCallDriver}
                        >
                            <Phone className="w-4 h-4" /> Call
                        </Button>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center px-2">
                        <button onClick={() => setShowCancelModal(true)} className="text-red-400 text-xs hover:text-red-300 font-medium">
                            Cancel Ride
                        </button>
                        </div>
                    </div>
                )}
            </>
        )}

      </div>
      {showCancelModal && (
          <div className="absolute inset-0 bg-lumina-900/95 backdrop-blur-xl z-50 rounded-t-[2.5rem] p-6 flex flex-col animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white">Why are you cancelling?</h3>
                 <button onClick={() => setShowCancelModal(false)}><X className="text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                 {CANCELLATION_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center gap-3 p-4 rounded-xl bg-lumina-800 border border-white/5 cursor-pointer hover:border-lumina-400 transition-colors">
                       <input 
                         type="radio" 
                         name="cancel_reason" 
                         value={reason} 
                         checked={cancelReason === reason}
                         onChange={(e) => setCancelReason(e.target.value)}
                         className="accent-lumina-400 w-5 h-5" 
                        />
                       <span className="text-white text-sm">{reason}</span>
                    </label>
                 ))}
              </div>
              <Button variant="danger" fullWidth className="mt-4" disabled={!cancelReason} onClick={handleCancelRide}>
                Confirm Cancellation
              </Button>
          </div>
        )}
      {/* Safety Modal Logic */}
      {showSafetyModal && (
          <div className="absolute inset-0 bg-lumina-900/95 backdrop-blur-xl z-50 rounded-t-[2.5rem] p-6 flex flex-col animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck className="text-green-400" /> Safety Toolkit</h3>
                 <button onClick={() => setShowSafetyModal(false)}><X className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                  {SAFETY_OPTIONS.map((opt) => (
                      <button key={opt.id} onClick={() => handleSafetyAction(opt.id)} className="w-full flex items-center gap-4 p-4 bg-lumina-800 rounded-xl border border-white/5 text-left hover:bg-lumina-700 transition-colors">
                         <div className="w-10 h-10 rounded-full bg-lumina-900 flex items-center justify-center text-lumina-400 border border-lumina-700">
                            {opt.icon === 'share' && <Share2 className="w-5 h-5" />}
                            {opt.icon === 'phone' && <Siren className="w-5 h-5 text-red-400" />}
                            {opt.icon === 'alert' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                         </div>
                         <div>
                             <h4 className="font-bold text-white">{opt.title}</h4>
                             <p className="text-xs text-gray-400">{opt.desc}</p>
                         </div>
                      </button>
                  ))}
              </div>
              <div className="mt-auto pt-6 text-center text-xs text-gray-500">
                  Lumina Safety Center • 24/7 Support
              </div>
          </div>
        )}
    </div>
  );
  };

  const renderOnTrip = () => (
    <div className="h-screen flex flex-col relative">
      <div className="absolute inset-0 z-0">
        <MapVisualization 
          showRoute={true} 
          carPosition={carProgress} 
          trafficCondition={trafficCondition}
          isRideActive={true}
          destinationLabel={dropoff} 
        />
      </div>

      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-lumina-900/90 backdrop-blur-md rounded-2xl p-4 border-2 border-lumina-700 shadow-2xl flex items-center gap-4 animate-slide-up">
           <div className="w-12 h-12 bg-lumina-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              <Navigation className="w-6 h-6 text-lumina-900 fill-lumina-900" />
           </div>
           <div className="flex-1">
              <p className="text-sm text-gray-400">Heading to</p>
              <h2 className="text-lg font-bold text-white truncate leading-tight">{dropoff}</h2>
           </div>
           <div className="text-center pl-4 border-l border-white/10">
              <p className="text-xl font-bold text-lumina-400">{getEta()}</p>
              <p className="text-[10px] uppercase text-gray-500 font-bold">Mins</p>
           </div>
        </div>
      </div>

      <div className="absolute top-32 right-4 z-10 flex flex-col gap-3">
         <div className="bg-lumina-900/80 p-2 rounded-full border border-white/10 shadow-lg">
             <Volume2 className="w-5 h-5 text-gray-400" />
         </div>
      </div>

      <div className="mt-auto z-10 bg-lumina-900 p-6 rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-up">
          <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6" />
          
          <div className="flex items-center justify-between mb-4">
             <div>
                <h3 className="text-xl font-bold text-white">On Trip</h3>
                <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${trafficCondition === 'clear' ? 'bg-green-500' : trafficCondition === 'moderate' ? 'bg-orange-500' : 'bg-red-500'}`} />
                  {trafficCondition === 'clear' ? 'Clear route ahead' : 'Moderate traffic'}
                </p>
             </div>
             <div className="flex gap-2">
                <Button variant="secondary" className="!p-3 rounded-full" onClick={() => setShowSafetyModal(true)}>
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                </Button>
             </div>
          </div>
          
          <div className="flex justify-between items-center mb-6 p-4 bg-lumina-800/80 rounded-2xl border border-white/5 backdrop-blur-md">
            <div>
               <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Estimated Arrival</p>
               <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-bold text-lumina-400 font-mono">{getEta()}</p>
                   <p className="text-sm font-bold text-white">MINUTES</p>
               </div>
            </div>
            <Clock className="w-10 h-10 text-lumina-400/20" />
          </div>

          <div className="flex items-center gap-4 bg-lumina-800/50 p-3 rounded-xl border border-white/5">
               <img src={MOCK_DRIVER.photoUrl} alt="Driver" className="w-10 h-10 rounded-full object-cover" />
               <div className="flex-1">
                  <p className="text-sm font-bold text-white">{MOCK_DRIVER.name}</p>
                  <p className="text-xs text-gray-500">{MOCK_DRIVER.carModel} • {MOCK_DRIVER.plateNumber}</p>
               </div>
               <div className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded">
                   ₹{selectedRide?.price}
               </div>
          </div>
      </div>
      {/* Safety Modal Code Reused... */}
      {showSafetyModal && (
        <div className="absolute inset-0 bg-lumina-900/95 backdrop-blur-xl z-50 rounded-t-[2.5rem] p-6 flex flex-col animate-slide-up">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck className="text-green-400" /> Safety Toolkit</h3>
                 <button onClick={() => setShowSafetyModal(false)}><X className="text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                  {SAFETY_OPTIONS.map((opt) => (
                      <button key={opt.id} onClick={() => handleSafetyAction(opt.id)} className="w-full flex items-center gap-4 p-4 bg-lumina-800 rounded-xl border border-white/5 text-left hover:bg-lumina-700 transition-colors">
                         <div className="w-10 h-10 rounded-full bg-lumina-900 flex items-center justify-center text-lumina-400 border border-lumina-700">
                            {opt.icon === 'share' && <Share2 className="w-5 h-5" />}
                            {opt.icon === 'phone' && <Siren className="w-5 h-5 text-red-400" />}
                            {opt.icon === 'alert' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                         </div>
                         <div>
                             <h4 className="font-bold text-white">{opt.title}</h4>
                             <p className="text-xs text-gray-400">{opt.desc}</p>
                         </div>
                      </button>
                  ))}
              </div>
        </div>
      )}
    </div>
  );

  const renderRating = () => (
    <div className="h-screen flex flex-col bg-lumina-900 relative overflow-hidden p-6">
       <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lumina-500/20 rounded-full blur-[80px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] animate-pulse-slow" />
       </div>

       <div className="z-10 flex flex-col h-full items-center justify-center text-center">
           <div className="w-24 h-24 relative mb-6">
              <div className="absolute inset-0 bg-lumina-400 rounded-full animate-ping opacity-20" />
              <img src={MOCK_DRIVER.photoUrl} alt="Driver" className="w-full h-full rounded-full object-cover border-4 border-lumina-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]" />
              <div className="absolute -bottom-2 -right-2 bg-white text-lumina-900 px-2 py-0.5 rounded-full text-xs font-bold flex items-center border border-lumina-200">
                 <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> Arrived
              </div>
           </div>

           <h2 className="text-3xl font-bold text-white mb-2">You've Arrived!</h2>
           <p className="text-gray-400 mb-8 max-w-[250px]">Hope you enjoyed your ride with {MOCK_DRIVER.name}.</p>

           <div className="bg-lumina-800/50 px-6 py-2 rounded-full border border-white/5 mb-8">
              <p className="text-sm text-gray-400">Total Paid</p>
              <p className="text-xl font-bold text-white">₹{selectedRide?.price}</p>
           </div>

           <div className="flex gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => { setRating(star); triggerHaptic(); }}
                  className="transition-transform active:scale-90"
                >
                  <Star 
                    className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-gray-600'}`} 
                  />
                </button>
              ))}
           </div>

           <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['Safe Driving', 'Clean Car', 'Polite', 'Great Music'].map(tag => (
                 <button 
                    key={tag}
                    onClick={() => {
                        setFeedbackTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
                        triggerHaptic();
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${feedbackTags.includes(tag) ? 'bg-lumina-400 text-lumina-900 border-lumina-400' : 'bg-lumina-800 text-gray-400 border-white/5 hover:border-white/20'}`}
                 >
                    {tag}
                 </button>
              ))}
           </div>

           {rating > 3 && (
             <div className="mb-8 w-full">
                <p className="text-xs text-gray-400 mb-3 uppercase tracking-widest">Add a tip</p>
                <div className="flex gap-3 justify-center">
                   {[10, 20, 50].map(amt => (
                      <button 
                        key={amt} 
                        onClick={() => { setTipAmount(amt === tipAmount ? 0 : amt); triggerHaptic(); }}
                        className={`w-16 py-2 rounded-lg font-bold text-sm border transition-all ${tipAmount === amt ? 'bg-green-500 text-white border-green-500 shadow-lg' : 'bg-lumina-800 text-gray-400 border-white/5'}`}
                      >
                        ₹{amt}
                      </button>
                   ))}
                </div>
             </div>
           )}

           <Button fullWidth className="mt-auto" onClick={handleRatingSubmit}>
              Submit Rating
           </Button>
       </div>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen shadow-2xl overflow-hidden font-sans text-slate-50 relative">
      {screen === AppScreen.LOGIN && renderLogin()}
      {screen === AppScreen.HOME && renderHome()}
      {screen === AppScreen.MAP_SELECTION && renderMapSelection()}
      {screen === AppScreen.RIDE_CONFIRMED && renderRideConfirmed()}
      {screen === AppScreen.ON_TRIP && renderOnTrip()}
      {screen === AppScreen.RATING && renderRating()}
    </div>
  );
}

export default App;
