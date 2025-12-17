// NHTSA vPIC API Service (Free Federal API)
// Used to verify Year, Make, Model from VIN before checking CARB status.

interface NHTSAVehicle {
  Make: string;
  Model: string;
  ModelYear: string;
  BodyClass: string;
  GVWR: string;
  ErrorCode: string;
}

export const decodeVinNHTSA = async (vin: string): Promise<NHTSAVehicle | null> => {
  if (!vin || vin.length !== 17) return null;

  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
    const data = await response.json();

    if (!data.Results) return null;

    const getVal = (id: number) => {
      const item = data.Results.find((r: any) => r.VariableId === id);
      return item ? item.Value : null;
    };

    // Variable IDs: 26=Make, 28=Model, 29=Year, 5=Body Class, 25=GVWR
    const vehicle = {
      Make: getVal(26) || 'Unknown',
      Model: getVal(28) || 'Unknown',
      ModelYear: getVal(29) || 'Unknown',
      BodyClass: getVal(5) || 'Unknown',
      GVWR: getVal(25) || 'Unknown', // Crucial for >14k lbs check
      ErrorCode: data.Message || '0'
    };

    return vehicle;
  } catch (e) {
    console.error("NHTSA API Error:", e);
    return null;
  }
};