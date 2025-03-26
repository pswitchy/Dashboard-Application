'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input'; // For editable dynamic cols (optional)
// import { DatePicker } from '@/components/ui/date-picker'; // For editable dynamic date cols (optional)
import { format } from 'date-fns'; // For displaying dates

interface ColumnDefinition {
    name: string;
    type: 'Text' | 'Date';
}

interface DashboardTableProps {
  googleSheetColumns: ColumnDefinition[]; // Columns from Sheet
  dynamicColumns: ColumnDefinition[]; // Dynamically added columns
  data: any[][]; // Array of rows, each row is an array of cell values
  isLoading: boolean;
}

export function DashboardTable({ googleSheetColumns, dynamicColumns, data, isLoading }: DashboardTableProps) {
  const allColumns = [...googleSheetColumns, ...dynamicColumns];

   if (isLoading) {
        return <div className="text-center p-10">Loading table data...</div>;
    }

    if (!data || data.length === 0) {
         return <div className="text-center p-10 text-muted-foreground">No data available or table not configured yet.</div>;
    }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {allColumns.map((col, index) => (
              <TableHead key={`${col.name}-${index}`} className="whitespace-nowrap">
                {col.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {allColumns.map((col, colIndex) => {
                const cellValue = colIndex < googleSheetColumns.length ? (row[colIndex] ?? '') : ''; // Get data for sheet columns, default for dynamic

                 // Format date if column type is Date and value is valid
                 let displayValue = cellValue;
                 if (col.type === 'Date' && cellValue) {
                     try {
                        // Attempt to parse ISO strings or other valid date formats
                        const date = new Date(cellValue);
                        if (!isNaN(date.getTime())) {
                           displayValue = format(date, 'PPP'); // Format like 'Dec 31st, 2023'
                        } else {
                            displayValue = 'Invalid Date'; // Show if parsing fails
                        }
                     } catch (e) {
                        displayValue = 'Invalid Date Format';
                     }
                 }


                return (
                  <TableCell key={`cell-${rowIndex}-${colIndex}`} className="whitespace-nowrap">
                    {/* Render dynamic columns as inputs (Optional: make them editable) */}
                    {/* {colIndex >= googleSheetColumns.length ? (
                       col.type === 'Date' ? (
                           <DatePicker disabled /> // Placeholder, needs state management for editing
                       ) : (
                           <Input value={displayValue} readOnly className="bg-muted/50" /> // Read-only input look
                       )
                    ) : ( */}
                       {displayValue}
                    {/* )} */}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}