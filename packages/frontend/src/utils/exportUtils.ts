import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: any[], filename: string = 'export.xlsx', transformer?: (data: any[]) => any[]) {
  const exportData = transformer ? transformer(data) : data;
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
}

export function exportToPDF(data: any[], columns: string[], filename: string = 'export.pdf', transformer?: (data: any[]) => any[]) {
  const exportData = transformer ? transformer(data) : data;
  const doc = new jsPDF();
  autoTable(doc, {
    head: [columns],
    body: exportData.map(row => columns.map(col => row[col])),
    styles: { fontSize: 8 }
  });
  doc.save(filename);
} 