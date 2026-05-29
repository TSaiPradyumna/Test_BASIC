// functions/api/excel.js

export async function onRequest(context) {
  // 1. Fetch credentials securely pulled from Cloudflare Environment Settings
  const API_KEY = context.env.GOOGLE_API_KEY;
  const SPREADSHEET_ID = context.env.SPREADSHEET_ID;
  
  // Define the target range (e.g., 'Sheet1!A1:E20' or just 'Sheet1')
  const RANGE = "Sheet1"; 
  const googleSheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {
    // 2. Query Google's live serverless database cluster
    const response = await fetch(googleSheetsUrl);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    
    // 3. Format rows from arrays into clean, consumable JSON objects for your React App
    // rawData.values contains an array of arrays (Rows and Columns)
    const rows = rawData.values || [];
    const headers = rows[0] || []; // Top row labels
    
    const formattedData = rows.slice(1).map(row => {
      let item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || ""; // Maps value to its corresponding header title
      });
      return item;
    });

    // 4. Send clean structured JSON payload back to React
    return new Response(JSON.stringify({ success: true, data: formattedData }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Handles local dev environment restrictions
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
