export type ComplianceStatus = 'COMPLIANT' | 'NOT_COMPLIANT' | 'UNKNOWN';

export async function lookupCompliance(vin: string): Promise<{ status: ComplianceStatus; raw: any }> {
  // TODO: Replace this stub with actual scraping/API call to cleantruckcheck.arb.ca.gov
  // Currently simulating a network request and random status
  
  await new Promise(resolve => setTimeout(resolve, 1500)); // Fake latency

  // Mock Logic based on VIN ending
  const lastChar = vin.slice(-1);
  
  let status: ComplianceStatus = 'UNKNOWN';
  if (!isNaN(parseInt(lastChar))) {
    // Ends in number: Compliant
    status = 'COMPLIANT';
  } else {
    // Ends in letter: Non-Compliant
    status = 'NOT_COMPLIANT';
  }

  // Force one specific case for demo
  if(vin.endsWith('TESTUNK')) status = 'UNKNOWN';

  return {
    status,
    raw: {
      source: 'MOCK_API',
      timestamp: new Date().toISOString(),
      note: 'This is a simulation. Connect real API in lib/compliance.ts'
    }
  };
}
