'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ColumnInput {
    id: number; // For unique key prop
    name: string;
    type: 'Text' | 'Date';
}

interface CreateTableDialogProps {
    onTableCreate: (config: { googleSheetId: string; sheetName: string; headerRow: number; columns: Array<{ name: string; type: 'Text' | 'Date' }> }) => Promise<void>;
    currentConfig?: { googleSheetId: string; sheetName: string; headerRow: number; } | null; // To pre-fill if exists
    children: React.ReactNode; // To wrap the trigger button
}

export function CreateTableDialog({ onTableCreate, currentConfig, children }: CreateTableDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [googleSheetId, setGoogleSheetId] = useState(currentConfig?.googleSheetId || '');
    const [sheetName, setSheetName] = useState(currentConfig?.sheetName || 'Sheet1');
    const [headerRow, setHeaderRow] = useState<number>(currentConfig?.headerRow || 1);
    const [columns, setColumns] = useState<ColumnInput[]>([{ id: Date.now(), name: '', type: 'Text' }]);
    const [isLoading, setIsLoading] = useState(false);

    const addColumnInput = () => {
        setColumns([...columns, { id: Date.now(), name: '', type: 'Text' }]);
    };

    const removeColumnInput = (id: number) => {
        if (columns.length > 1) { // Keep at least one column
            setColumns(columns.filter(col => col.id !== id));
        }
    };

    const handleColumnChange = (id: number, field: 'name' | 'type', value: string) => {
        setColumns(columns.map(col => col.id === id ? { ...col, [field]: value } : col));
    };

     const handleHeaderRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        setHeaderRow(isNaN(value) || value < 1 ? 1 : value); // Ensure it's a positive integer
    };


    const handleSave = async () => {
        if (!googleSheetId.trim()) {
            toast.error("Google Sheet ID is required.");
            return;
        }
        if (!sheetName.trim()) {
             toast.error("Sheet Name is required.");
             return;
         }
         if (headerRow < 1) {
            toast.error("Header Row must be 1 or greater.");
            return;
         }

        const validColumns = columns.filter(col => col.name.trim() !== '');
        if (validColumns.length === 0) {
            toast.error("Please define at least one column name.");
            return;
        }
        // Check for duplicate column names
        const columnNames = validColumns.map(c => c.name.trim());
        if (new Set(columnNames).size !== columnNames.length) {
            toast.error("Column names must be unique.");
            return;
        }


        setIsLoading(true);
        try {
            await onTableCreate({
                googleSheetId: googleSheetId.trim(),
                sheetName: sheetName.trim(),
                headerRow: headerRow,
                columns: validColumns.map(({ name, type }) => ({ name: name.trim(), type })),
            });
            setIsOpen(false); // Close dialog on success
            // Reset state? Optional, depends if you want it cleared after save.
            // setGoogleSheetId(''); setColumns([{ id: Date.now(), name: '', type: 'Text' }]);
        } catch (error) {
             // Error toast is likely handled within onTableCreate
            console.error("Failed to save table config:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset form when dialog opens if currentConfig exists
    React.useEffect(() => {
        if (isOpen) {
             setGoogleSheetId(currentConfig?.googleSheetId || '');
             setSheetName(currentConfig?.sheetName || 'Sheet1');
             setHeaderRow(currentConfig?.headerRow || 1);
             // Reset columns to default if no config or keep existing columns if editing?
             // For simplicity, let's always start with one empty column for the user to define
             setColumns([{ id: Date.now(), name: '', type: 'Text' }]);
        }
    }, [isOpen, currentConfig]);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
                {/* <Button>Create / Edit Table</Button> */}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{currentConfig ? 'Edit Table Configuration' : 'Create New Table'}</DialogTitle>
                    <DialogDescription>
                        Enter your Google Sheet details and define the initial columns based on your sheet's header row.
                        The data types help format the display (especially for dates).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sheet-id" className="text-right">
                            Sheet ID
                        </Label>
                        <Input
                            id="sheet-id"
                            value={googleSheetId}
                            onChange={(e) => setGoogleSheetId(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 1aBcDeFgHiJkLmNoPqRsTuVwXyZ..."
                            disabled={isLoading}
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sheet-name" className="text-right">
                           Sheet Name
                        </Label>
                        <Input
                            id="sheet-name"
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., Sheet1, Data Q4"
                            disabled={isLoading}
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="header-row" className="text-right">
                           Header Row
                        </Label>
                        <Input
                            id="header-row"
                            type="number"
                            min="1"
                            value={headerRow}
                            onChange={handleHeaderRowChange}
                            className="col-span-1" // Make it smaller
                            disabled={isLoading}
                        />
                        <span className="col-span-2 text-xs text-muted-foreground">Row number containing headers (e.g., 1)</span>
                    </div>

                    <h4 className="font-semibold mt-4 border-t pt-4">Define Initial Columns</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                        List the column headers exactly as they appear in your Google Sheet's header row ({`Row ${headerRow}`}).
                    </p>
                    <div className="space-y-3">
                        {columns.map((col, index) => (
                            <div key={col.id} className="flex items-center gap-2">
                                <Input
                                    value={col.name}
                                    onChange={(e) => handleColumnChange(col.id, 'name', e.target.value)}
                                    placeholder={`Column ${index + 1} Header`}
                                    className="flex-grow"
                                    disabled={isLoading}
                                />
                                <Select
                                    value={col.type}
                                    onValueChange={(value) => handleColumnChange(col.id, 'type', value)}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Text">Text</SelectItem>
                                        <SelectItem value="Date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeColumnInput(col.id)}
                                    disabled={columns.length <= 1 || isLoading}
                                    aria-label="Remove column"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addColumnInput} disabled={isLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Column Definition
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}