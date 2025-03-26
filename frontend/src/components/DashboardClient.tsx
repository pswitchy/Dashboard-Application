// /frontend/src/components/DashboardClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { DashboardTable } from './DashboardTable';
import { CreateTableDialog } from './CreateTableDialog';
import { AddColumnDialog } from './AddColumnDialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LogOut, RefreshCw, Loader2 } from 'lucide-react'; // Import Loader2
import axios, { AxiosError } from 'axios'; // Import axios and AxiosError

// Interfaces
interface ColumnDefinition {
  name: string;
  type: 'Text' | 'Date';
}

interface TableConfig {
  _id: string;
  userId: string;
  googleSheetId: string;
  sheetName: string;
  headerRow: number;
  columns: ColumnDefinition[];
  dynamicColumns: ColumnDefinition[];
  createdAt: string;
  updatedAt: string;
}

interface SheetData {
  headers: string[];
  data: any[][];
}

export function DashboardClient() {
  const { user, logout, loading: authLoading } = useAuth();
  const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
  const [sheetData, setSheetData] = useState<SheetData>({ headers: [], data: [] });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true); // Loading for initial config fetch
  const [isLoadingData, setIsLoadingData] = useState(false); // Loading for manual data refresh/initial data
  const [isWebSocketAttempted, setIsWebSocketAttempted] = useState(false); // Track if WS connection was tried
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  // --- Fetch Table Configuration ---
  const fetchConfig = useCallback(async () => {
    if (!authLoading && user) {
      console.log('DashboardClient: fetchConfig starting. User authenticated.');
      setIsLoadingConfig(true);
      setIsLoadingData(true);
      try {
        console.log('DashboardClient: Attempting to GET /api/table/config');
        const response = await api.get<{ status: string; data: TableConfig | null }>('/table/config');
        console.log('DashboardClient: /api/table/config response received:', response.data);

        if (response.data.status === 'success' && response.data.data) {
          setTableConfig(response.data.data);
          console.log('DashboardClient: Table config loaded successfully.');
          fetchTableData(true); // Fetch initial data after config load
        } else {
          console.log('DashboardClient: No existing table config found for user.');
          setTableConfig(null);
          setSheetData({ headers: [], data: [] });
          setIsLoadingData(false);
        }
      } catch (error) { // error is 'unknown' - Apply Type Check Fix
        console.error('DashboardClient: Failed to fetch table config:', error);
        let errorMessage = 'Could not load table configuration.';
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string }>;
            errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
            if (axiosError.response?.status === 401) {
                console.error('DashboardClient: Received 401 fetching config. Interceptor should handle logout.');
                errorMessage = 'Authentication error loading configuration.';
            }
        } else if (error instanceof Error) {
             errorMessage = error.message;
        } else {
            console.error('DashboardClient: An unexpected non-error type was caught:', error);
            errorMessage = 'An unexpected error occurred while loading configuration.';
        }
        toast.error(errorMessage);
        setIsLoadingData(false);
      } finally {
        setIsLoadingConfig(false);
      }
    } else if (!authLoading && !user) {
      console.log('DashboardClient: fetchConfig skipped. User not authenticated.');
      setIsLoadingConfig(false);
      setIsLoadingData(false);
      setTableConfig(null);
      setSheetData({ headers: [], data: [] });
    } else {
       console.log('DashboardClient: fetchConfig waiting for auth check to complete...');
       setIsLoadingConfig(true);
       setIsLoadingData(true);
    }
  }, [authLoading, user]); // Removed fetchTableData from here, called internally

  // --- Fetch Table Data (Manual Refresh or Initial) ---
  const fetchTableData = useCallback(async (isInitialFetch = false) => {
    if (!tableConfig) {
      console.log('DashboardClient: fetchTableData skipped, no table config.');
      setIsLoadingData(false);
      return;
    }
    console.log(`DashboardClient: Fetching table data... (Initial: ${isInitialFetch})`);
    // Set loading true only if initial or manual refresh
    if (isInitialFetch || !isInitialFetch) setIsLoadingData(true);

    try {
      const response = await api.get<{ status: string; data: SheetData }>('/table/data');
      if (response.data.status === 'success') {
        setSheetData(response.data.data);
        console.log('DashboardClient: Table data fetched successfully.');
        if (!isInitialFetch) toast.success('Table data refreshed.');
      } else {
         console.error('DashboardClient: Failed to fetch table data (API status not success)');
         toast.error('Could not refresh table data.');
      }
    } catch (error) { // error is 'unknown' - Apply Type Check Fix
      console.error('DashboardClient: Failed to fetch table data:', error);
      let errorMessage = 'Could not refresh table data.';
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ message?: string }>;
            errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
            if (axiosError.response?.status === 401) {
                console.error('DashboardClient: Received 401 fetching data. Interceptor should handle logout.');
                errorMessage = 'Authentication error fetching data.';
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else {
            console.error('DashboardClient: An unexpected non-error type was caught fetching data:', error);
            errorMessage = 'An unexpected error occurred while fetching data.';
        }
        toast.error(errorMessage);
    } finally {
      setIsLoadingData(false);
    }
  }, [tableConfig]);

  // --- WebSocket Connection ---
  const connectWebSocket = useCallback(() => {
    if (!wsUrl || !tableConfig || ws) {
        if (ws) console.log("DashboardClient: WebSocket already connected or connection attempt in progress.");
        else if (!tableConfig) console.log("DashboardClient: WebSocket connection skipped, no table config.");
        else if (!wsUrl) console.error("DashboardClient: WebSocket URL is not defined.");
        return;
    }

    console.log('DashboardClient: Attempting to connect WebSocket...');
    setIsWebSocketAttempted(true);
    const newWs = new WebSocket(wsUrl);
    setWs(newWs);

    newWs.onopen = () => {
      console.log('DashboardClient: WebSocket connected successfully.');
      setIsWsConnected(true);
    };

    newWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('DashboardClient: WebSocket message received:', message.type);
            if (message.type === 'sheetUpdate') {
                console.log("DashboardClient: Processing sheetUpdate message.");
                if (message.payload && Array.isArray(message.payload.headers) && Array.isArray(message.payload.data)) {
                    setSheetData(message.payload);
                    toast.info('Table data updated automatically.');
                } else {
                    console.error("DashboardClient: Invalid sheetUpdate payload received:", message.payload);
                }
            } else if (message.type === 'error') {
                toast.error(`WebSocket Error: ${message.message}`);
            }
        } catch (parseError) { // Catch JSON parsing errors
            console.error('DashboardClient: Failed to parse WebSocket message:', parseError);
        }
    };

    newWs.onerror = (error) => {
      console.error('DashboardClient: WebSocket error:', error);
      toast.error('WebSocket connection error.');
      setIsWsConnected(false);
      setWs(null);
    };

    newWs.onclose = (event) => {
      console.log('DashboardClient: WebSocket disconnected.', event.code, event.reason);
      setIsWsConnected(false);
      setWs(null);
      // Optional reconnection logic could go here
    };
  }, [wsUrl, tableConfig, ws]);

  // --- Effects ---
  useEffect(() => {
    fetchConfig(); // Fetch config on initial mount or when auth state changes
  }, [fetchConfig]); // Use the memoized callback

  useEffect(() => {
    // Manage WS connection based on config presence
    if (tableConfig && !ws && !isWebSocketAttempted) {
      connectWebSocket();
    } else if (!tableConfig && ws) {
       console.log("DashboardClient: Table config removed, closing WebSocket.");
       ws.close(1000);
       setWs(null);
       setIsWsConnected(false);
       setIsWebSocketAttempted(false);
    }
    // Cleanup on unmount
    return () => {
      if (ws) {
        console.log('DashboardClient: Closing WebSocket connection on unmount.');
        ws.close(1000);
      }
    };
  }, [tableConfig, connectWebSocket, ws, isWebSocketAttempted]);

  // --- Handlers ---
  const handleTableCreate = async (configData: { googleSheetId: string; sheetName: string; headerRow: number; columns: Array<{ name: string; type: 'Text' | 'Date' }> }) => {
    console.log('DashboardClient: Submitting new/updated table config:', configData);
    try {
      const response = await api.post('/table/config', configData);
      if (response.data.status === 'success' && response.data.data) {
          setTableConfig(response.data.data);
          toast.success('Table configuration saved successfully!');
          fetchTableData(true);
          if (ws) {
              ws.close(1000);
              setWs(null);
              setIsWsConnected(false);
              setIsWebSocketAttempted(false);
          }
      } else {
          throw new Error(response.data.message || 'API did not return success');
      }
    } catch (error) { // error is 'unknown' - Apply Type Check Fix
      console.error('DashboardClient: Failed to save table configuration:', error);
      let errorMessage = 'Failed to save configuration.';
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
          console.error('DashboardClient: Unexpected non-error caught saving config:', error);
          errorMessage = 'An unexpected error occurred while saving configuration.';
      }
      toast.error(errorMessage);
      throw error; // Re-throw to prevent dialog closing
    }
  };

  const handleAddColumn = async (newColumn: { name: string; type: 'Text' | 'Date' }) => {
    console.log("Adding dynamic column:", newColumn);
    if (!tableConfig) {
         toast.error("Cannot add column: Table configuration not loaded.");
         return;
    }
    try {
        const response = await api.post('/table/config/dynamic-column', newColumn);
         if (response.data.status === 'success' && response.data.data) {
             setTableConfig(response.data.data);
             toast.success(`Dynamic column "${newColumn.name}" added successfully!`);
         } else {
             throw new Error(response.data.message || 'API did not return success');
         }
    } catch (error) { // error is 'unknown' - Apply Type Check Fix
         console.error("Failed to add dynamic column:", error);
         let errorMessage = "Failed to add column.";
          if (axios.isAxiosError(error)) {
              const axiosError = error as AxiosError<{ message?: string }>;
              errorMessage = axiosError.response?.data?.message || axiosError.message || errorMessage;
          } else if (error instanceof Error) {
              errorMessage = error.message;
          } else {
              console.error('DashboardClient: Unexpected non-error caught adding column:', error);
              errorMessage = 'An unexpected error occurred while adding the column.';
          }
         toast.error(errorMessage);
         throw error; // Re-throw to prevent dialog closing
    }
  };

  // --- Render Logic ---
  const isInitialLoading = authLoading || isLoadingConfig;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        Loading dashboard...
      </div>
    );
  }

  if (!user) {
    return ( // This state might be briefly visible during logout redirect
      <div className="flex items-center justify-center h-screen">
        User session ended. Redirecting to login...
      </div>
    );
  }

  const allColumns = [
    ...(tableConfig?.columns || []),
    ...(tableConfig?.dynamicColumns || [])
  ];
  const combinedColumnNames = allColumns.map(c => c.name);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user.username}!</p>
          <div className={`text-xs mt-1 flex items-center gap-1.5 ${isWsConnected ? 'text-green-600' : (ws ? 'text-amber-600' : 'text-slate-500')}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${isWsConnected ? 'bg-green-500' : (ws ? 'bg-amber-500' : 'bg-slate-400')}`}></span>
            {isWsConnected ? 'Real-time updates active' : (ws ? 'Connecting to real-time updates...' : 'Real-time updates inactive')}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CreateTableDialog onTableCreate={handleTableCreate} currentConfig={tableConfig}>
            <Button variant="outline">
              {tableConfig ? 'Edit Table Config' : 'Create Table'}
            </Button>
          </CreateTableDialog>

          {tableConfig && (
            <AddColumnDialog
              onAddColumn={handleAddColumn}
              existingColumns={combinedColumnNames}
            />
          )}
          <Button variant="ghost" size="icon" onClick={() => fetchTableData(false)} title="Refresh Data" disabled={isLoadingData || !tableConfig}>
            <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main>
        {/* Data Loading Indicator */}
        {tableConfig && isLoadingData && (
             <div className="flex items-center justify-center p-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                Loading table data...
            </div>
        )}

        {/* Table Display */}
        {tableConfig && !isLoadingData && (
          <DashboardTable
            googleSheetColumns={tableConfig.columns || []}
            dynamicColumns={tableConfig.dynamicColumns || []}
            data={sheetData.data}
            isLoading={false}
          />
        )}

        {/* No Config Message */}
        {!tableConfig && !isInitialLoading && ( // Ensure initial load is finished before showing this
          <div className="text-center p-10 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No table configured yet.</p>
            <p className="mt-2">Click "Create Table" to connect your Google Sheet.</p>
          </div>
        )}
      </main>
    </div>
  );
}