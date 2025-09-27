import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Calendar, Compass } from 'lucide-react';
import { ItineraryRequest, TravelStyle } from '@/types';

interface ItineraryFormProps {
  onSubmit: (data: ItineraryRequest) => void;
  isLoading: boolean;
}

const travelStyles: TravelStyle[] = [
  { value: 'Balanced', label: 'Balanced - Mix of everything' },
  { value: 'Nature', label: 'Nature - Outdoor adventures' },
  { value: 'Food', label: 'Food - Culinary experiences' },
  { value: 'Adventure', label: 'Adventure - Thrill seeking' }
];

export default function ItineraryForm({ onSubmit, isLoading }: ItineraryFormProps) {
  const [cities, setCities] = useState('');
  const [days, setDays] = useState<number>(3);
  const [style, setStyle] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cityList = cities.split(',').map(city => city.trim()).filter(Boolean);
    
    if (cityList.length === 0 || !style) {
      return;
    }
    
    onSubmit({
      cities: cityList,
      days,
      style
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-ocean to-sunset bg-clip-text text-transparent">
          Plan Your Perfect Trip
        </CardTitle>
        <CardDescription className="text-lg">
          Tell us your destinations and we'll create a personalized itinerary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cities" className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-ocean" />
              Cities to Visit
            </Label>
            <Input
              id="cities"
              type="text"
              placeholder="e.g., Vancouver, Seattle, Portland"
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              className="h-12 text-base"
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter cities separated by commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="days" className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-ocean" />
              Number of Days
            </Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="h-12 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style" className="text-base font-medium flex items-center gap-2">
              <Compass className="h-4 w-4 text-ocean" />
              Travel Style
            </Label>
            <Select value={style} onValueChange={setStyle} required>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Choose your travel style" />
              </SelectTrigger>
              <SelectContent>
                {travelStyles.map((travelStyle) => (
                  <SelectItem key={travelStyle.value} value={travelStyle.value}>
                    {travelStyle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-ocean to-primary hover:from-ocean/90 hover:to-primary/90 transition-all duration-300 shadow-soft"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Your Itinerary...' : 'Generate Itinerary'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}