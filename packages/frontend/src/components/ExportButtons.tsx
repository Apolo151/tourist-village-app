import { Button, Box } from '@mui/material';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ExportButtonsProps {
  data: any[];
  columns: string[];
  excelFileName?: string;
  pdfFileName?: string;
  transformer?: (data: any[]) => any[];
}

export default function ExportButtons({ 
  data, 
  columns, 
  excelFileName = 'export.xlsx', 
  pdfFileName = 'export.pdf',
  transformer 
}: ExportButtonsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Button variant="outlined" onClick={() => exportToExcel(data, excelFileName, transformer)}>
        Export to Excel
      </Button>
      <Button variant="outlined" onClick={() => exportToPDF(data, columns, pdfFileName, transformer)}>
        Export to PDF
      </Button>
    </Box>
  );
} 