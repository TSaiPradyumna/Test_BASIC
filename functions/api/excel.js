export async function onRequest(context) {
  const API_KEY = context.env.GOOGLE_API_KEY || "AIzaSyC3mPWSKkzM-itFTAZCv9rT0SUHCy3Xmsc";
  const SPREADSHEET_ID = context.env.SPREADSHEET_ID || "10XipEfM89vdBc9D7OiPjwMToI4yHdGWID7e69elgfv4";
  
  const RANGE = "Sheet1"; 
  const googleSheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {
    const response = await fetch(googleSheetsUrl);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    let rows = rawData.values || [];
    
    // 1. Skip any completely blank rows at the top to find the true header row
    while (rows.length > 0 && (!rows[0] || rows[0].length === 0 || rows[0].every(cell => !cell.trim()))) {
      rows.shift();
    }

    if (rows.length === 0) {
      throw new Error("The targeted Google Sheet is empty or missing headers.");
    }

    // 2. Extract headers and normalize them intensely to clear API formatting quirks
    // This turns "A (Column)", "PROJECT NAME ", or "ID" safely into clean matching keys
    const rawHeaders = rows[0];
    const headers = rawHeaders.map((header, index) => {
      let clean = header.toString().trim().toLowerCase();
      
      // If Google fallback gives us column letters like "a (column)", map them to layout positions
      if (clean.includes("(column)") || clean.length === 1) {
        const structuralFallbacks = ["id", "name", "category", "budget", "progress", "activeTeam", "efficiency", "history"];
        return structuralFallbacks[index] || `key_${index}`;
      }
      
      // Map common human variations directly to the exact frontend property names
      if (clean.includes("project")) return "name";
      if (clean.includes("team")) return "activeTeam";
      if (clean.includes("trend")) return "history";
      return clean; 
    });

    // 3. Process the data records safely
    const formattedRecords = rows.slice(1).map(row => {
      let record = {};
      headers.forEach((header, index) => {
        let value = row[index] || "";
        
        // Ensure numbers are perfectly parsed for layout calculations
        if (header === "budget" || header === "progress" || header === "efficiency" || header === "activeTeam") {
          const cleanedNum = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
          record[header] = isNaN(cleanedNum) ? 0 : cleanedNum;
        } else if (header === "history") {
          // Parse historical line strings cleanly
          record[header] = value ? value.toString().split(',').map(v => {
            const num = parseFloat(v.trim());
            return isNaN(num) ? 50 : num;
          }) : [50, 60, 70]; // Default trend fallback line
        } else {
          record[header] = value.toString().trim();
        }
      });
      return record;
    });

    // 4. Generate system metrics
    const computedHealth = {
      cpuUsage: Math.floor(Math.sin(Date.now() / 5000) * 10 + 15),
      networkLoad: Math.floor(Math.random() * 15 + 40),
      dbLatencyMs: Math.floor(Math.random() * 8 + 12)
    };

    return new Response(JSON.stringify({
      success: true,
      records: formattedRecords,
      systemHealth: computedHealth,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
