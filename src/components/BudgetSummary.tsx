import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Car, Utensils, Bed, Camera } from 'lucide-react';
import { Budget } from '@/types';

interface BudgetSummaryProps {
  budget: Budget;
}

const budgetIcons = {
  fuel: Car,
  food: Utensils,
  lodging: Bed,
  attractions: Camera
};

const budgetLabels = {
  fuel: 'Transportation',
  food: 'Food & Dining',
  lodging: 'Accommodation',
  attractions: 'Activities & Attractions'
};

export default function BudgetSummary({ budget }: BudgetSummaryProps) {
  const total = budget.fuel + budget.food + budget.lodging + budget.attractions;

  return (
    <Card className="w-full shadow-card bg-gradient-to-br from-sunset/5 to-accent/5 border-sunset/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <DollarSign className="h-6 w-6 text-sunset" />
          <span className="bg-gradient-to-r from-sunset to-accent bg-clip-text text-transparent">
            Trip Budget Estimate
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(budget).map(([category, amount]) => {
          const Icon = budgetIcons[category as keyof Budget];
          const label = budgetLabels[category as keyof Budget];
          
          return (
            <div key={category} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-sunset/10">
                  <Icon className="h-4 w-4 text-sunset" />
                </div>
                <span className="font-medium">{label}</span>
              </div>
              <span className="font-bold text-lg">${amount}</span>
            </div>
          );
        })}
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between py-3 bg-gradient-to-r from-ocean/5 to-sunset/5 rounded-lg px-4">
          <span className="text-lg font-bold">Total Budget</span>
          <span className="text-2xl font-bold text-ocean">${total}</span>
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          *Estimates based on mid-range options. Actual costs may vary.
        </p>
      </CardContent>
    </Card>
  );
}