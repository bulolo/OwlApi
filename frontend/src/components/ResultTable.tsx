"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ResultTableProps {
  data: any[]
}

export function ResultTable({ data }: ResultTableProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
        暂无数据
      </div>
    )
  }

  const firstRole = data[0]
  if (!firstRole || typeof firstRole !== 'object') {
     return (
      <div className="h-full w-full rounded-md border border-zinc-200 bg-white p-4 font-mono text-xs text-zinc-600 overflow-auto">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    )
  }

  // Get keys from first object for columns
  const columns = Object.keys(firstRole)

  return (
    <div className="h-full w-full rounded-md border border-zinc-200 bg-white">
      <ScrollArea className="h-full w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              {columns.map((col) => (
                <TableHead 
                  key={col} 
                  className="h-8 px-4 text-[11px] font-bold text-zinc-500 uppercase whitespace-nowrap"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i} className="hover:bg-zinc-50 border-zinc-100">
                {columns.map((col) => (
                  <TableCell 
                    key={`${i}-${col}`} 
                    className="py-2 px-4 text-xs font-mono text-zinc-700 whitespace-nowrap"
                  >
                     {/* Handle object/array rendering simply */}
                    {typeof row[col] === 'object' 
                      ? JSON.stringify(row[col]) 
                      : String(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
