// /backend/src/controllers/tableController.js

const TableConfig = require('../models/TableConfig');
const { getSheetData } = require('../services/googleSheetsService');
// Note: We DO NOT require server.js or websocketService.js here to avoid circular dependency

// --- Placeholder for broadcast function ---
// This will be replaced by the actual function injected from server.js
let localBroadcast = (data) => {
    console.warn("Attempted to broadcast before WebSocket setup was complete:", data);
};

// --- Function for server.js to inject the real broadcast function ---
const setBroadcastFunction = (broadcastFunc) => {
    if (typeof broadcastFunc === 'function') {
        console.log("tableController: Broadcast function received successfully.");
        localBroadcast = broadcastFunc;
    } else {
        console.error("tableController: Received invalid broadcast function.");
    }
};

// --- In-memory cache and polling state ---
let currentSheetData = { headers: [], data: [] }; // Stores the latest data
let pollingInterval = null; // Holds the setInterval ID

// === ASYNC POLLING LOGIC ===

// Fetches data, compares, and broadcasts if changed
const fetchDataAndBroadcast = async (spreadsheetId, sheetName, headerRow) => {
  console.log(`Polling Google Sheet: ID=${spreadsheetId}, Name=${sheetName}, HeaderRow=${headerRow}`);
  try {
    const newData = await getSheetData(spreadsheetId, sheetName, headerRow);

    // Simple comparison (stringify). More robust checks could compare structure/length first.
    if (JSON.stringify(newData) !== JSON.stringify(currentSheetData)) {
      console.log('Sheet data changed, broadcasting update...');
      currentSheetData = newData;
      // Use the injected broadcast function
      localBroadcast({ type: 'sheetUpdate', payload: currentSheetData });
    } else {
       console.log('No changes detected in sheet data.');
    }
  } catch (error) {
    console.error(`Error during sheet polling for ${spreadsheetId}:`, error.message);
    // Optionally broadcast an error to clients
    // localBroadcast({ type: 'error', message: 'Failed to fetch sheet data update.' });
    // Consider stopping polling on certain errors (e.g., 403, 404)?
     if (error.message.includes('Permission denied') || error.message.includes('Spreadsheet or sheet not found')) {
         console.error("Stopping polling due to fatal sheet access error.");
         stopSheetPolling();
         // Notify clients?
         localBroadcast({ type: 'error', message: `Sheet access error: ${error.message}. Polling stopped.` });
     }
  }
};

// Starts the polling interval
const startSheetPolling = (spreadsheetId, sheetName, headerRow) => {
  if (!spreadsheetId) {
      console.warn("startSheetPolling skipped: No spreadsheetId provided.");
      return;
  }
  // Clear any previous interval
  stopSheetPolling(); // Ensures only one interval runs

  console.log(`Starting polling for Sheet ID: ${spreadsheetId} (${sheetName}, Header: ${headerRow})`);
  // Perform an initial fetch immediately
  fetchDataAndBroadcast(spreadsheetId, sheetName, headerRow);
  // Set up the interval
  pollingInterval = setInterval(
      () => fetchDataAndBroadcast(spreadsheetId, sheetName, headerRow),
      30000 // Poll every 30 seconds (adjust as needed)
  );
};

// Stops the polling interval
const stopSheetPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Stopped Google Sheet polling.');
  }
};

// === CONTROLLER METHODS ===

// --- Get Table Configuration ---
exports.getTableConfig = async (req, res) => {
  try {
    const config = await TableConfig.findOne({ userId: req.user._id });
    if (!config) {
      // It's okay if no config exists yet, return null data
      return res.status(200).json({ status: 'success', data: null });
    }
    res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    console.error("Get Table Config Error:", error);
    res.status(500).json({ message: 'Error fetching table configuration', error: error.message });
  }
};

// --- Create or Update Table Configuration ---
exports.createOrUpdateTableConfig = async (req, res) => {
  try {
    const { googleSheetId, sheetName = 'Sheet1', headerRow = 1, columns } = req.body;
    const userId = req.user._id;

    // Basic Validation
    if (!googleSheetId) return res.status(400).json({ message: 'Google Sheet ID is required.' });
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
        return res.status(400).json({ message: 'Initial columns definition (at least one) is required.' });
    }
    if (headerRow < 1 || !Number.isInteger(headerRow)) {
        return res.status(400).json({ message: 'Header Row must be a positive integer.' });
    }
     // Validate column structure (simple check)
     if (!columns.every(col => col.name && typeof col.name === 'string' && ['Text', 'Date'].includes(col.type))) {
         return res.status(400).json({ message: 'Invalid column definition. Each column must have a name (string) and type ("Text" or "Date").' });
     }


    let config = await TableConfig.findOne({ userId });
    let isNewConfig = false;

    if (config) {
      // Update existing config
      console.log(`Updating config for user ${userId}`);
      config.googleSheetId = googleSheetId;
      config.sheetName = sheetName;
      config.headerRow = headerRow;
      config.columns = columns; // Overwrite initial columns
      // Note: We don't overwrite dynamicColumns here, handled by addDynamicColumn
    } else {
      // Create new config
      console.log(`Creating new config for user ${userId}`);
      isNewConfig = true;
      config = new TableConfig({
        userId,
        googleSheetId,
        sheetName,
        headerRow,
        columns,
        dynamicColumns: [], // Initialize empty
      });
    }

    await config.save();
    console.log(`Config ${isNewConfig ? 'created' : 'updated'} successfully for user ${userId}.`);

    // Stop existing polling (if any) and start polling with new config
    stopSheetPolling();
    startSheetPolling(config.googleSheetId, config.sheetName, config.headerRow);

    res.status(isNewConfig ? 201 : 200).json({ status: 'success', data: config });

  } catch (error) {
    console.error("Create/Update Table Config Error:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error saving config', errors: error.errors });
    }
    res.status(500).json({ message: 'Error saving table configuration', error: error.message });
  }
};

// --- Add Dynamic Column ---
exports.addDynamicColumn = async (req, res) => {
    try {
        const { name, type } = req.body;
        const userId = req.user._id;

        // Validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Column name is required and must be a non-empty string.' });
        }
        if (!type || !['Text', 'Date'].includes(type)) {
             return res.status(400).json({ message: 'Invalid column type. Must be "Text" or "Date".' });
        }
        const trimmedName = name.trim();

        const config = await TableConfig.findOne({ userId });
        if (!config) {
            return res.status(404).json({ message: 'Table configuration not found. Please create a table first.' });
        }

        // Check for duplicate names (in both original and dynamic columns)
        const existingNames = [
            ...config.columns.map(col => col.name),
            ...config.dynamicColumns.map(col => col.name)
        ];
        if (existingNames.includes(trimmedName)) {
             return res.status(400).json({ message: `Column name "${trimmedName}" already exists.` });
        }

        config.dynamicColumns.push({ name: trimmedName, type });
        await config.save();
        console.log(`Dynamic column "${trimmedName}" added for user ${userId}.`);

        res.status(200).json({ status: 'success', data: config }); // Return updated config

    } catch (error) {
        console.error("Add Dynamic Column Error:", error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation Error saving dynamic column', errors: error.errors });
        }
        res.status(500).json({ message: 'Error adding dynamic column', error: error.message });
    }
};

// --- Get Current Table Data (from cache) ---
exports.getTableData = async (req, res) => {
    try {
        const userId = req.user._id;
        // Check if polling should be (re)started for this user if not active
        const config = await TableConfig.findOne({ userId });

        if (config && !pollingInterval) {
            // Polling isn't running (e.g., after server restart), start it now.
            console.log(`Polling was inactive for user ${userId} on data request, starting...`);
            startSheetPolling(config.googleSheetId, config.sheetName, config.headerRow);
            // Note: The response will likely send the *old* currentSheetData here,
            // the client will get the fresh data via WebSocket soon after polling starts.
            // Alternatively, we could await the first fetchDataAndBroadcast, but that delays the response.
        } else if (!config) {
            // No config exists for this user
            stopSheetPolling(); // Ensure no polling runs if config deleted
            return res.status(404).json({ message: "No table configured for this user." });
        }

        // Return the data currently held in memory
        res.status(200).json({ status: 'success', data: currentSheetData });

    } catch (error) {
         console.error("Get Table Data Error:", error);
        res.status(500).json({ message: 'Error fetching table data state', error: error.message });
    }
};

// === Functions for Server Initialization ===

// Called by server.js after it starts listening
const startInitialPollingIfNeeded = async () => {
    try {
        // Example: Find the first user's config to start polling initially.
        // You might want more sophisticated logic, e.g., poll for all active users,
        // or only start polling when a user connects via WebSocket or makes a request.
        // For simplicity, let's poll for the first config found.
        const config = await TableConfig.findOne().sort({ createdAt: 1 }); // Get the oldest config
        if (config) {
            console.log(`Initial polling check: Found config for user ${config.userId}, starting polling.`);
            startSheetPolling(config.googleSheetId, config.sheetName, config.headerRow);
        } else {
             console.log("Initial polling check: No configurations found in database, polling not started.");
        }
    } catch (err) {
        console.error("Error during initial polling check:", err);
    }
};


// === EXPORTS ===

// Export methods for routes
// getTableConfig, createOrUpdateTableConfig, addDynamicColumn, getTableData already assigned to exports

// Export functions needed by server.js
exports.setBroadcastFunction = setBroadcastFunction;
exports.startInitialPollingIfNeeded = startInitialPollingIfNeeded;

// Export polling controls (optional, less likely needed externally now)
exports.startSheetPolling = startSheetPolling;
exports.stopSheetPolling = stopSheetPolling;