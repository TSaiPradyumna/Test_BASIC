export async function onRequest(context) {
  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Base dataset
  const baseData = [
    { id: "EX-101", name: "Global Infrastructure Expansion", category: "Operations", budget: 145000, progress: 68, activeTeam: 14, efficiency: 94 },
    { id: "EX-102", name: "Q3 Customer Acquisition Campaign", category: "Marketing", budget: 85000, progress: 42, activeTeam: 8, efficiency: 81 },
    { id: "EX-103", name: "AI Analytics Engine Integration", category: "R&D", budget: 320000, progress: 89, activeTeam: 24, efficiency: 97 },
    { id: "EX-104", name: "E-Commerce Core Checkout V2", category: "Product Dev", budget: 195000, progress: 15, activeTeam: 11, efficiency: 76 },
    { id: "EX-105", name: "Legacy Database Decommissioning", category: "Security", budget: 62000, progress: 95, activeTeam: 4, efficiency: 99 },
    { id: "EX-106", name: "Multi-Region Cluster Migration", category: "DevOps", budget: 115000, progress: 54, activeTeam: 6, efficiency: 88 }
  ];

  const now = Date.now();
  const modifiedData = baseData.map((item, idx) => {
    // Generate a deterministic offset using index and current time
    // This makes the values drift slowly and look like real-time streaming data
    const seed = Math.sin(now / 5000 + idx) * 0.5 + 0.5; // value between 0 and 1
    const fluctuationPercent = (seed - 0.5) * 0.1; // -5% to +5% fluctuation
    
    // Progress shifts slightly upwards with time, wrapping at 100
    const timeProgress = Math.floor((item.progress + (now / 35000) * (idx + 1)) % 100);
    
    // Efficiency fluctuates by a small amount
    const efficiencyFluct = Math.min(100, Math.max(30, Math.floor(item.efficiency + fluctuationPercent * 20)));
    
    // Active team fluctuates slightly
    const teamFluct = Math.max(1, Math.floor(item.activeTeam + (Math.sin(now / 8000 + idx) > 0 ? 1 : -1)));

    // Generate historical metrics for a mini-sparkline chart
    const history = [];
    for (let i = 8; i >= 0; i--) {
      const pastTime = now - i * 3000;
      const pastSeed = Math.sin(pastTime / 5000 + idx) * 0.5 + 0.5;
      const pastEff = Math.min(100, Math.max(30, Math.floor(item.efficiency + (pastSeed - 0.5) * 15)));
      history.push(pastEff);
    }

    return {
      ...item,
      progress: timeProgress,
      efficiency: efficiencyFluct,
      activeTeam: teamFluct,
      history: history
    };
  });

  return new Response(JSON.stringify({
    success: true,
    timestamp: new Date().toISOString(),
    systemHealth: {
      cpuUsage: Math.floor(25 + Math.sin(now / 4000) * 10),
      networkLoad: Math.floor(60 + Math.cos(now / 6000) * 20),
      dbLatencyMs: Math.floor(12 + Math.sin(now / 2000) * 5)
    },
    records: modifiedData
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json;charset=UTF-8"
    }
  });
}
