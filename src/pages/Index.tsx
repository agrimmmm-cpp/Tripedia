import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import Hero from '@/components/Hero';
import ItineraryForm from '@/components/ItineraryForm';
import ItineraryCard from '@/components/ItineraryCard';
import BudgetSummary from '@/components/BudgetSummary';
import { generateItinerary } from '@/services/mockApi';
import { ItineraryRequest, ItineraryResponse } from '@/types';

const Index = () => {
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateItinerary = async (request: ItineraryRequest) => {
    setIsLoading(true);
    try {
      const response = await generateItinerary(request);
      setItinerary(response);
      
      toast({
        title: "Itinerary Generated! ✈️",
        description: `Created a ${request.days}-day ${request.style.toLowerCase()} trip for you!`,
      });
      
      // Smooth scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('itinerary-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Oops! Something went wrong",
        description: "Failed to generate your itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <ItineraryForm 
          onSubmit={handleGenerateItinerary}
          isLoading={isLoading}
        />
        
        {itinerary && (
          <div id="itinerary-results" className="mt-20 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-ocean to-sunset bg-clip-text text-transparent">
                Your Perfect Itinerary
              </h2>
              <p className="text-lg text-muted-foreground">
                Here's your personalized travel plan with activities and budget breakdown
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Itinerary Cards */}
              <div className="lg:col-span-2 space-y-6">
                {itinerary.itinerary.map((day) => (
                  <ItineraryCard key={day.day} day={day} />
                ))}
              </div>
              
              {/* Budget Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-8">
                  <BudgetSummary budget={itinerary.budget} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
