import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar } from 'lucide-react';
import { ItineraryDay } from '@/types';

interface ItineraryCardProps {
  day: ItineraryDay;
}

export default function ItineraryCard({ day }: ItineraryCardProps) {
  return (
    <Card className="w-full shadow-card hover:shadow-floating transition-all duration-300 border-0 bg-gradient-to-br from-card to-sky">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center gap-2 text-ocean">
              <Calendar className="h-5 w-5" />
              <span className="font-bold">Day {day.day}</span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{day.weather}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">{day.city}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold mb-2 text-foreground">Suggested Activities</h4>
          <div className="flex flex-wrap gap-2">
            {day.activities.map((activity, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-ocean/10 text-ocean hover:bg-ocean/20 border-ocean/20"
              >
                {activity}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}