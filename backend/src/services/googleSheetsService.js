// /backend/src/services/googleSheetsService.js

const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// REMOVE the KEY_FILE_PATH definition from the top level
// const KEY_FILE_PATH = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS); // <-- REMOVE THIS

async function getAuthToken() {
  // DEFINE KEY_FILE_PATH *inside* the function
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Add a check to ensure the environment variable is set
  if (!credentialsPath) {
    console.error("*** Critical Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set or not loaded correctly. Check your .env file and dotenv configuration. ***");
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not found.');
  }

  // Now resolve the path using the loaded variable
  const KEY_FILE_PATH = path.resolve(credentialsPath);
  console.log("Using Google credentials file at:", KEY_FILE_PATH); // Keep for debugging

  try {
      const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH, // Use the path resolved inside the function
        scopes: SCOPES,
      });
      const authToken = await auth.getClient();
      return authToken;
  } catch (err) {
      console.error(`Error loading Google Auth credentials from ${KEY_FILE_PATH}:`, err.message);
      if (err.message.includes('ENOENT') || err.message.includes('no such file')) {
          console.error(`*** Critical: Key file not found at the specified path: ${KEY_FILE_PATH}. Ensure the file exists and the path in .env ("${credentialsPath}") is correct relative to the /backend directory. ***`);
      }
      throw new Error('Failed to authenticate with Google Sheets API.');
  }
}

// The rest of the getSheetData function remains the same...
async function getSheetData(spreadsheetId, sheetName, headerRow = 1) {
    try {
      const auth = await getAuthToken(); // This will now resolve the path internally
      const sheets = google.sheets({ version: 'v4', auth });

      // ... (rest of the function is unchanged)

      const headerRange = `${sheetName}!${headerRow}:${headerRow}`;
      const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: headerRange,
      });

      const headers = headerResponse.data.values ? headerResponse.data.values[0] : [];
      if (headers.length === 0) {
          console.log("No headers found in row", headerRow);
          return { headers: [], data: [] };
      }

      const lastColumn = String.fromCharCode(64 + headers.length);
      const dataStartRow = headerRow + 1;
      const dataRange = `${sheetName}!A${dataStartRow}:${lastColumn}`;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: dataRange,
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER',
      });

      const values = response.data.values || [];

      const processedData = values.map(row => {
        return row.map((cell) => {
           if (typeof cell === 'number' && cell > 25569) {
             try {
               const utc_days = Math.floor(cell - 25569);
               const utc_value = utc_days * 86400;
               const date_info = new Date(utc_value * 1000);
               if (date_info.getFullYear() > 1900 && date_info.getFullYear() < 2100) {
                   return date_info.toISOString();
               }
             } catch (e) { /* ignore conversion error */ }
           }
           return cell;
        });
      });

      return { headers, data: processedData };

    } catch (error) {
      // Log the specific error from getAuthToken if it occurs
      if (error.message.includes('GOOGLE_APPLICATION_CREDENTIALS') || error.message.includes('Failed to authenticate')) {
          console.error("Authentication failed:", error.message);
      } else {
          console.error('Error fetching Google Sheet data:', error.message);
          if (error.code === 403) {
              console.error("Permission denied. Ensure the service account email has access to the sheet.");
          } else if (error.code === 404) {
              console.error(`Spreadsheet or sheet not found. Check ID: ${spreadsheetId}, Name: ${sheetName}`);
          }
      }
      // Re-throw a user-friendly or generic error
      throw new Error(`Failed to get sheet data. Check logs for details.`);
    }
  }


module.exports = { getSheetData };