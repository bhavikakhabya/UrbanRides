
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Car, Plus, Minus } from 'lucide-react';

interface MapVisualizationProps {
  showRoute?: boolean;
  carPosition?: number; // 0 to 100 percentage
  onMapClick?: (coords: { x: number; y: number }) => void;
  trafficCondition?: 'clear' | 'moderate' | 'heavy';
  isRideActive?: boolean;
  isDriverArriving?: boolean;
  destinationLabel?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const MapVisualization: React.FC<MapVisualizationProps> = ({ 
  showRoute = false, 
  carPosition = 0,
  onMapClick,
  trafficCondition = 'clear',
  isRideActive = false,
  isDriverArriving = false,
  destinationLabel = 'Destination Address'
}) => {
  // Simulated map markers relative to a 100x100 coordinate system
  const [tempPin, setTempPin] = useState<{x: number, y: number} | null>(null);
  const [sunAngle, setSunAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const animationRef = useRef<number>(0);
  
  // Dynamic coordinates
  const driverStart = { x: 5, y: 40 }; // Where driver appears from
  const pickup = { x: 20, y: 80 };
  const drop = { x: 80, y: 20 };

  // Animate Sun Position for dynamic shadows
  useEffect(() => {
    const animate = () => {
      setSunAngle(prev => (prev + 0.05) % 360); // Slow rotation
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // Generate random buildings only once
  const buildings = useMemo(() => {
    // Deterministic random for consistent render
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
    
    return Array.from({ length: 18 }).map((_, i) => {
        const s = i * 123;
        const w = 5 + seededRandom(s) * 10;
        const h = 5 + seededRandom(s + 1) * 10;
        return {
            id: i,
            x: seededRandom(s + 2) * 85,
            y: seededRandom(s + 3) * 85,
            width: w,
            height: h,
            opacity: 0.1 + seededRandom(s + 4) * 0.2,
            height3d: 1 + seededRandom(s + 5) * 2 // Simulated 3D height scale
        };
    }).filter(b => {
        // Keep clear path between pickup and drop approx
        const cx = b.x + b.width/2;
        const cy = b.y + b.height/2;
        const dist = Math.abs((drop.y - pickup.y) * cx - (drop.x - pickup.x) * cy + drop.x * pickup.y - drop.y * pickup.x) / Math.sqrt(Math.pow(drop.y - pickup.y, 2) + Math.pow(drop.x - pickup.x, 2));
        return dist > 8; // Don't place buildings on the road
    });
  }, []);

  // Traffic Colors for Gradient
  const getTrafficGradientColors = () => {
    switch (trafficCondition) {
      case 'heavy': return ['#ef4444', '#b91c1c', '#7f1d1d']; // Red to Dark Red
      case 'moderate': return ['#10b981', '#f59e0b', '#f97316']; // Green to Orange
      case 'clear': default: return ['#10b981', '#22d3ee', '#3b82f6']; // Green to Cyan to Blue
    }
  };
  const trafficColors = getTrafficGradientColors();
  const gradientId = `traffic-grad-${trafficCondition}`;

  // Calculate curved path
  const startPoint = isDriverArriving ? driverStart : pickup;
  const endPoint = isDriverArriving ? pickup : drop;
  
  const controlPoint = isDriverArriving 
      ? { x: 15, y: 60 } 
      : { x: 45, y: 45 };

  const pathD = `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`;

  const getCarCoords = (t: number) => {
    const p0 = startPoint;
    const p1 = controlPoint;
    const p2 = endPoint;
    
    // Quadratic Bezier formula
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    return { x, y };
  };

  const carCoords = getCarCoords(carPosition / 100);

  const getCarRotation = (t: number) => {
    const nextT = Math.min(t + 0.01, 1);
    const current = getCarCoords(t);
    const next = getCarCoords(nextT);
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };
  
  const carRotation = getCarRotation(carPosition / 100);

  const getDashAnimationDuration = () => {
    switch(trafficCondition) {
      case 'heavy': return '4s';
      case 'moderate': return '2.5s';
      case 'clear': default: return '1.5s';
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return;
    
    if (navigator.vibrate) navigator.vibrate(20);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Relative to current viewbox? No, getting raw click relative to element
    // We need to adjust for zoom if we were doing complex coord mapping, 
    // but since the SVG scales the whole content, the % logic needs to consider the ViewBox if we want absolute map coords.
    // For simplicity in this demo, we assume clicks map directly to the visible area percentage 
    // BUT we need to reverse the ViewBox transform to get "True Map Coordinates" (0-100).
    
    // Calculate SVG ViewBox coordinates
    const viewBoxSize = 100 / zoom;
    const viewBoxX = 50 - (viewBoxSize / 2);
    const viewBoxY = 50 - (viewBoxSize / 2);
    
    const clickXPercent = (e.clientX - rect.left) / rect.width;
    const clickYPercent = (e.clientY - rect.top) / rect.height;
    
    const mapX = viewBoxX + (clickXPercent * viewBoxSize);
    const mapY = viewBoxY + (clickYPercent * viewBoxSize);

    setTempPin({ x: mapX, y: mapY });
    onMapClick({ x: mapX, y: mapY });

    // Add Ripple
    const newRipple = { id: Date.now(), x: mapX, y: mapY };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 1000);
    
    setTimeout(() => setTempPin(null), 1500);
  };

  // Shadow Offsets
  const sunRad = (sunAngle * Math.PI) / 180;
  const shadowOffsetX = Math.cos(sunRad) * 2;
  const shadowOffsetY = Math.sin(sunRad) * 2;

  const isDriverClose = isDriverArriving && carPosition > 80;

  // ViewBox Calculation for Zoom
  // Center is always 50, 50 for this demo
  const viewBoxSize = 100 / zoom;
  const viewBoxX = 50 - (viewBoxSize / 2);
  const viewBoxY = 50 - (viewBoxSize / 2);

  return (
    <div className="relative w-full h-full bg-[#0b101b] overflow-hidden select-none group">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(Math.min(zoom + 0.5, 3)); }} 
          className="bg-lumina-800/80 p-2 rounded-full text-white hover:bg-lumina-700 backdrop-blur shadow-lg border border-white/10"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(Math.max(zoom - 0.5, 1)); }} 
          className="bg-lumina-800/80 p-2 rounded-full text-white hover:bg-lumina-700 backdrop-blur shadow-lg border border-white/10"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <svg 
        className={`absolute inset-0 w-full h-full ${onMapClick ? 'cursor-crosshair' : ''} transition-all duration-500 ease-in-out`} 
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxSize} ${viewBoxSize}`}
        preserveAspectRatio="xMidYMid slice"
        onClick={handleSvgClick}
      >
        <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={trafficColors[0]} style={{ transition: 'stop-color 2s ease-in-out' }} />
                <stop offset="50%" stopColor={trafficColors[1]} style={{ transition: 'stop-color 2s ease-in-out' }} />
                <stop offset="100%" stopColor={trafficColors[2]} style={{ transition: 'stop-color 2s ease-in-out' }} />
            </linearGradient>
            <pattern id="smallGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#1e293b" strokeWidth="0.2" />
            </pattern>
            <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>

        {/* Base Grid */}
        <rect x="0" y="0" width="100" height="100" fill="url(#smallGrid)" />
        
        {/* Ripples */}
        {ripples.map(r => (
           <circle 
             key={r.id} 
             cx={r.x} 
             cy={r.y} 
             r="0" 
             fill="none" 
             stroke="#22d3ee" 
             strokeWidth="0.5"
             className="animate-[ripple_1s_ease-out_forwards]"
           />
        ))}
        <style>{`
          @keyframes ripple {
            0% { r: 0; opacity: 1; stroke-width: 0.5; }
            100% { r: 15; opacity: 0; stroke-width: 0; }
          }
        `}</style>
        
        {/* Radar Circles */}
        {showRoute && !isDriverArriving && (
             <circle cx={pickup.x} cy={pickup.y} r="15" fill="none" stroke={trafficColors[1]} strokeWidth="0.2" opacity="0.2" className="animate-[ping_3s_ease-out_infinite]" />
        )}
        
        {/* Current Location Pulse */}
        {!showRoute && (
            <g>
                <circle cx="50" cy="50" r="15" fill="none" stroke="#22d3ee" strokeWidth="0.2" opacity="0.2" className="animate-[ping_3s_ease-out_infinite]" />
                <circle cx="50" cy="50" r="2" fill="#22d3ee" opacity="0.5" className="animate-pulse" />
            </g>
        )}

        {/* Buildings */}
        {buildings.map((b) => (
            <g key={b.id}>
                <rect 
                    x={b.x + shadowOffsetX * b.height3d} 
                    y={b.y + shadowOffsetY * b.height3d} 
                    width={b.width} 
                    height={b.height} 
                    fill="black" 
                    fillOpacity="0.3"
                    filter="blur(1px)"
                />
                <rect 
                    x={b.x + 0.5} 
                    y={b.y + 0.5} 
                    width={b.width} 
                    height={b.height} 
                    fill="#0f172a" 
                />
                <rect 
                    x={b.x} 
                    y={b.y} 
                    width={b.width} 
                    height={b.height} 
                    fill="#334155" 
                    fillOpacity={b.opacity}
                    stroke="#475569"
                    strokeWidth="0.1"
                />
            </g>
        ))}

        {/* Route */}
        {showRoute && (
          <g filter="url(#glow)">
            <path 
              d={pathD} 
              fill="none" 
              stroke={`url(#${gradientId})`}
              strokeWidth="3" 
              strokeOpacity="0.2"
              strokeLinecap="round"
            />
            <path 
              d={pathD} 
              fill="none" 
              stroke={`url(#${gradientId})`}
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
            {(isRideActive || isDriverArriving) && (
               <path 
               d={pathD} 
               fill="none" 
               stroke="white" 
               strokeWidth="0.8" 
               strokeLinecap="round"
               strokeDasharray="1 6"
               strokeOpacity="0.8"
               style={{ animation: `dash ${getDashAnimationDuration()} linear infinite` }}
             >
             </path>
            )}
            <style>
                 {`
                   @keyframes dash {
                     to {
                       stroke-dashoffset: -7;
                     }
                   }
                 `}
             </style>
          </g>
        )}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        {/* Pins, Cars, Markers - Logic remains similar but now visually scaled by SVG zoom implicitly */}
        {/* Important: HTML overlays need to track map coords. 
            Since we are using ViewBox on the SVG, these absolute positioned divs based on % 
            will NOT line up if we don't adjust them.
            
            CORRECTION: The previous implementation used `left: ${x}%`. 
            If we zoom using SVG ViewBox, the SVG content scales, but the `div` overlays do not automatically scale their positions relative to the 'virtual' map.
            
            FIX: To allow zoom, we must apply the same transform logic to the HTML overlay layer 
            OR map the HTML coordinates based on current zoom.
            
            Let's adjust the style `left` and `top` based on zoom.
            Screen% = (MapCoord - ViewBoxOrigin) / ViewBoxSize * 100
        */}
        
        {/* Helper to transform map coordinate to screen percentage */}
        {(() => {
           const mapToScreen = (mc: number, offset: number) => (mc - offset) / viewBoxSize * 100;
           
           const renderPin = (x: number, y: number, type: 'pickup' | 'drop' | 'temp', label?: string) => {
              const sx = mapToScreen(x, viewBoxX);
              const sy = mapToScreen(y, viewBoxY);
              
              // If out of view, don't render or clamp? Let's just render, CSS overflow hidden handles it.
              
              if (type === 'temp') {
                  return (
                     <div 
                       className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-40 animate-[zoomIn_0.3s_ease-out_forwards]" 
                       style={{ left: `${sx}%`, top: `${sy}%` }}
                     >
                        <MapPin className="w-8 h-8 text-lumina-400 drop-shadow-[0_0_15px_rgba(34,211,238,1)]" fill="rgba(34,211,238,0.2)" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-1 bg-lumina-400/50 rounded-full blur-[2px]" />
                     </div>
                  );
              }
              if (type === 'pickup') {
                  return (
                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20" style={{ left: `${sx}%`, top: `${sy}%` }}>
                        <div className="relative group/pin cursor-pointer pointer-events-auto">
                            <div className={`absolute inset-0 rounded-full bg-lumina-400 blur-md opacity-40 ${isDriverClose ? 'animate-pulse scale-125' : 'animate-pulse'}`}></div>
                            <div className={`w-4 h-4 bg-lumina-400 rounded-full shadow-[0_0_20px_rgba(34,211,238,1)] ring-4 ring-lumina-400/30 relative z-10 ${isDriverClose ? 'scale-125' : ''} transition-transform duration-500`} />
                            <div className="absolute inset-0 bg-lumina-400 rounded-full animate-ping opacity-75" />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase text-lumina-400 whitespace-nowrap border border-lumina-400/30 backdrop-blur-sm opacity-0 group-hover/pin:opacity-100 transition-opacity z-20 shadow-lg">
                                Pickup Point
                            </div>
                        </div>
                    </div>
                  );
              }
              if (type === 'drop') {
                   return (
                      <div className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20" style={{ left: `${sx}%`, top: `${sy}%` }}>
                         <div className="relative group/pin cursor-pointer pointer-events-auto">
                            <div className="absolute inset-0 rounded-full bg-red-500 blur-lg opacity-40 animate-pulse translate-y-2"></div>
                            <MapPin className="w-10 h-10 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] pb-1 relative z-10 transition-transform group-hover/pin:-translate-y-1" fill="#7f1d1d" />
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 px-3 py-2 rounded-lg border border-red-500/30 backdrop-blur-md opacity-0 group-hover/pin:opacity-100 transition-all duration-200 z-30 shadow-2xl min-w-[150px] text-center transform translate-y-2 group-hover/pin:translate-y-0 pointer-events-none">
                              <div className="text-[10px] font-bold tracking-wider uppercase text-red-400 mb-0.5">Destination</div>
                              <div className="text-xs text-white font-medium truncate max-w-[180px]">{label}</div>
                              <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-red-900/50"></div>
                            </div>
                         </div>
                      </div>
                   );
              }
              return null;
           };

           const renderCar = () => {
              const sx = mapToScreen(carCoords.x, viewBoxX);
              const sy = mapToScreen(carCoords.y, viewBoxY);
              return (
                  <div 
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-linear z-30"
                    style={{ 
                        left: `${sx}%`, 
                        top: `${sy}%`,
                        transform: `translate(-50%, -50%) rotate(${carRotation}deg)` 
                    }}
                  >
                     {isDriverArriving && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/90 text-black px-2 py-0.5 rounded text-[10px] font-bold tracking-wide whitespace-nowrap shadow-lg animate-bounce">
                          Driver
                        </div>
                     )}
                     <div className={`absolute inset-0 bg-lumina-400 blur-lg opacity-30 ${isRideActive ? 'animate-pulse' : ''}`}></div>
                     <div className="bg-white text-lumina-900 p-1.5 rounded-lg shadow-[0_0_25px_rgba(255,255,255,0.6)] relative z-10 border border-gray-100 ring-1 ring-black/5">
                        <Car className="w-5 h-5" fill="currentColor" />
                     </div>
                     <div 
                       className="absolute top-1/2 left-full w-24 h-16 bg-gradient-to-r from-yellow-100/40 via-yellow-100/10 to-transparent -translate-y-1/2 -translate-x-2 rounded-full blur-md" 
                       style={{ 
                         clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)',
                         opacity: trafficCondition === 'heavy' ? 0.3 : 0.6,
                         width: trafficCondition === 'heavy' ? '3rem' : '6rem'
                        }} 
                     />
                     <div className="absolute top-1/2 right-full w-3 h-5 bg-red-600/80 -translate-y-1/2 translate-x-1 blur-[2px] shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                  </div>
              );
           };
           
           return (
             <>
               {tempPin && renderPin(tempPin.x, tempPin.y, 'temp')}
               {showRoute && renderPin(pickup.x, pickup.y, 'pickup')}
               {/* Center marker for locate mode */}
               {!showRoute && (
                  <div className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20" style={{ left: `50%`, top: `50%` }}>
                    <div className="relative group/pin">
                        <div className="absolute inset-0 rounded-full bg-blue-500 blur-md opacity-40 animate-pulse"></div>
                        <div className="w-5 h-5 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,1)] ring-4 ring-blue-500/30 border-2 border-white relative z-10" />
                        <div className="absolute -inset-4 bg-blue-500 rounded-full animate-ping opacity-30" />
                    </div>
                 </div>
               )}
               {showRoute && !isDriverArriving && renderPin(drop.x, drop.y, 'drop', destinationLabel)}
               {showRoute && renderCar()}
             </>
           );
        })()}
      </div>
      
      <style>{`
          @keyframes zoomIn {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `}</style>
    </div>
  );
};
