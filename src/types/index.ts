export interface TravelStyle {
  value: string;
  label: string;
}

export interface ItineraryDay {
  day: number;
  city: string;
  activities: string[];
  weather: string;
}

export interface Budget {
  fuel: number;
  food: number;
  lodging: number;
  attractions: number;
}

export interface ItineraryResponse {
  itinerary: ItineraryDay[];
  budget: Budget;
}

export interface ItineraryRequest {
  cities: string[];
  days: number;
  style: string;
}