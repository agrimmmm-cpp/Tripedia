import { ItineraryRequest, ItineraryResponse, ItineraryDay } from '@/types';

const mockActivities: Record<string, { [style: string]: string[] }> = {
  Vancouver: {
    Balanced: ["Stanley Park", "Granville Island", "Gastown Walking Tour"],
    Nature: ["Capilano Suspension Bridge", "Grouse Mountain", "Queen Elizabeth Park"],
    Food: ["Granville Island Market", "Chinatown Food Tour", "Food Trucks Downtown"],
    Adventure: ["Sea to Sky Gondola", "Whitewater Rafting", "Cycling Seawall"]
  },
  Seattle: {
    Balanced: ["Pike Place Market", "Space Needle", "Waterfront Walk"],
    Nature: ["Discovery Park", "Washington Park Arboretum", "Puget Sound Ferry"],
    Food: ["Pike Place Market", "Capitol Hill Food Scene", "Fremont Brewery Tour"],
    Adventure: ["Mount Rainier Day Trip", "Kayaking Lake Union", "Rock Climbing"]
  },
  Portland: {
    Balanced: ["Powell's Books", "Food Truck Pods", "Waterfront Park"],
    Nature: ["Forest Park", "Japanese Garden", "Columbia River Gorge"],
    Food: ["Food Cart Tours", "Brewery District", "Farmers Market"],
    Adventure: ["Mount Hood", "Multnomah Falls Hike", "Biking Bridges"]
  }
};

const weatherOptions = ["☀️", "⛅", "🌧️", "⛈️", "❄️"];

const getRandomWeather = () => weatherOptions[Math.floor(Math.random() * weatherOptions.length)];

const getActivitiesForCity = (city: string, style: string): string[] => {
  const cityActivities = mockActivities[city];
  if (cityActivities && cityActivities[style]) {
    return cityActivities[style];
  }
  // Fallback for unknown cities
  return ["City Walking Tour", "Local Museum Visit", "Traditional Market"];
};

const calculateBudget = (days: number, cities: string[], style: string) => {
  const baseRates = {
    fuel: 25,      // per day
    food: 45,      // per day
    lodging: 85,   // per day
    attractions: 35 // per day
  };

  // Style multipliers
  const styleMultipliers: Record<string, number> = {
    Balanced: 1.0,
    Nature: 0.8,
    Food: 1.3,
    Adventure: 1.2
  };

  const multiplier = styleMultipliers[style] || 1.0;
  const cityMultiplier = cities.length > 2 ? 1.1 : 1.0; // Extra cost for multiple cities

  return {
    fuel: Math.round(baseRates.fuel * days * cityMultiplier),
    food: Math.round(baseRates.food * days * multiplier),
    lodging: Math.round(baseRates.lodging * days),
    attractions: Math.round(baseRates.attractions * days * multiplier)
  };
};

export const generateItinerary = async (request: ItineraryRequest): Promise<ItineraryResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { cities, days, style } = request;
  const itinerary: ItineraryDay[] = [];

  for (let day = 1; day <= days; day++) {
    const cityIndex = Math.floor((day - 1) / Math.ceil(days / cities.length));
    const city = cities[cityIndex] || cities[0];
    
    const activities = getActivitiesForCity(city, style);
    
    itinerary.push({
      day,
      city,
      activities,
      weather: getRandomWeather()
    });
  }

  const budget = calculateBudget(days, cities, style);

  return {
    itinerary,
    budget
  };
};