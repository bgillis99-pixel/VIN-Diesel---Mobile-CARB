import { Truck } from "../types";

// In a real production app for the App Store, this would call a Cloud Function
// to avoid CORS issues and hide scraping logic.
// For this standalone version, we simulate the logic or use a public API if available.

export const checkTruckCompliance = async (vin: string): Promise<Truck['status']> => {
  return new Promise((resolve) => {
    // Simulate API Network Delay
    setTimeout(() => {
      const cleanVin = vin.toUpperCase().trim();
      
      // Simulation Logic based on real world scenarios
      const lastChar = cleanVin.slice(-1);

      // 1. Simulate "NOT_COMPLIANT" for specific test cases or older letters
      if (['A', 'B', 'C'].includes(lastChar)) {
         resolve('NOT_COMPLIANT');
         return;
      }

      // 2. Simulate "COMPLIANT" for numbers
      if (!isNaN(parseInt(lastChar))) {
          resolve('COMPLIANT');
          return;
      }

      // 3. Fallback
      resolve('UNKNOWN');
    }, 1500);
  });
};
