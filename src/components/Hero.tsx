import React from 'react';
import { Plane, MapPin, Compass } from 'lucide-react';
import heroImage from '@/assets/hero-travel.jpg';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-sky via-ocean/10 to-sunset/10 py-20 lg:py-32">
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-r from-ocean to-sunset rounded-full shadow-soft">
              <Plane className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-ocean via-primary to-sunset bg-clip-text text-transparent">
              Tripidea
            </h1>
          </div>
          
          {/* Tagline */}
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your travel dreams into perfectly planned itineraries. 
            Just tell us where you want to go, and we'll create your personalized adventure.
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground mt-12">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-ocean" />
              <span>Multiple Destinations</span>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-ocean" />
              <span>Personalized Styles</span>
            </div>
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-ocean" />
              <span>Instant Itineraries</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}