export async function onRequest(context) {
  // Hardcoded fallback credentials based on your sheet profile
  // Note: For production, it's safer to keep these in Cloudflare Settings -> Environment Variables!
  const API_KEY = context.env.GOOGLE_API_KEY || "AIzaSyC3mPWSKkzM-itFTAZCv9rT0SUHCy3Xmsc";
  const SPREADSHEET_ID = context.env.SPREADSHEET_ID || "10XipEfM89vdBc9D7OiPjwMToI4yHdGWID7e69elgfv4";
  
  // Targets the entire first tab sheet layout
  const RANGE = "Sheet1"; 
  const googleSheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {
    // 1. Fetch live structural layout from Google API cluster
    const response = await fetch(googleSheetsUrl);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API responded with status: ${response.status}. Ensure the sheet sharing is set to "Anyone with the link can view".`);
    }

    const rawData = await response.json();
    const rows = rawData.values || [];
    
    if (rows.length === 0) {
      throw new Error("The targeted Google Sheet is empty or lacks clear data rows.");
    }

    // 2. Map row matrices into objects matching lower camelCase keys used by App.jsx
    const headers = rows[0].map(h => h.trim()); 
    
    const formattedRecords = rows.slice(1).map(row => {
      let record = {};
      headers.forEach((header, index) => {
        let value = row[index] || "";
        
        // Match specific types expected by dashboard metrics
        if (header === "budget" || header === "progress" || header === "efficiency" || header === "activeTeam") {
          // Normalize clean numeric values
          const cleanedNum = parseFloat(value.replace(/[^0-9.]/g, ''));
          record[header] = isNaN(cleanedNum) ? 0 : cleanedNum;
        } else if (header === "history") {
          // Turn string comma arrays ("80,85,90") into proper JavaScript numeric arrays for sparklines
          record[header] = value ? value.split(',').map(v => {
            const num = parseFloat(v.trim());
            return isNaN(num) ? 50 : num; // fallback point
          }) : [];
        } else {
          // Keep string characters for id, name, category properties
          record[header] = value;
        }
      });
      return record;
    });

    // 3. Generate high-frequency dynamic health matrices simulating server cluster behavior
    const computedHealth = {
      cpuUsage: Math.floor(Math.sin(Date.now() / 5000) * 10 + 15), // Smooth oscillation between 5% and 25%
      networkLoad: Math.floor(Math.random() * 15 + 40),            // Bounded randomized ingress streams
      dbLatencyMs: Math.floor(Math.random() * 8 + 12)             // Clean API roundtrip simulation metrics
    };

    // 4. Construct complete response envelope structured exactly for App.jsx parsing hooks
    const payload = {
      success: true,
      records: formattedRecords,
      systemHealth: computedHealth,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate", // Ensures Cloudflare does not cache live streams
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      records: [],
      systemHealth: { cpuUsage: 0, networkLoad: 0, dbLatencyMs: 0 }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
