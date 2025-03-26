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
import { toast } from 'sonner';

interface AddColumnDialogProps {
    onAddColumn: (column: { name: string; type: 'Text' | 'Date' }) => Promise<void>;
    existingColumns: string[]; // Pass names of all existing columns to prevent duplicates
}

export function AddColumnDialog({ onAddColumn, existingColumns }: AddColumnDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [columnName, setColumnName] = useState('');
    const [columnType, setColumnType] = useState<'Text' | 'Date'>('Text');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        const trimmedName = columnName.trim();
        if (!trimmedName) {
            toast.error("Column name cannot be empty.");
            return;
        }
        if (existingColumns.includes(trimmedName)) {
             toast.error(`Column name "${trimmedName}" already exists.`);
             return;
        }

        setIsLoading(true);
        try {
            await onAddColumn({ name: trimmedName, type: columnType });
            setIsOpen(false); // Close dialog on success
            setColumnName(''); // Reset form
            setColumnType('Text');
        } catch (error) {
            // Error should be handled by the caller's catch block (toast)
            console.error("Failed to add dynamic column:", error);
        } finally {
            setIsLoading(false);
        }
    };

     // Reset form state when dialog opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setColumnName('');
            setColumnType('Text');
            setIsLoading(false); // Ensure loading state is reset
        }
    }, [isOpen]);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Add Dynamic Column</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Dynamic Column</DialogTitle>
                    <DialogDescription>
                       Define a new column to display only on the dashboard. This column will not be added to your Google Sheet.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="col-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="col-name"
                            value={columnName}
                            onChange={(e) => setColumnName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., Notes, Status"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="col-type" className="text-right">
                            Type
                        </Label>
                        <Select
                           value={columnType}
                           onValueChange={(value: 'Text' | 'Date') => setColumnType(value)}
                           disabled={isLoading}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Text">Text</SelectItem>
                                <SelectItem value="Date">Date</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Adding...' : 'Add Column'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}