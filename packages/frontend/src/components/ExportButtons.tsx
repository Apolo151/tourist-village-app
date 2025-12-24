import { Button, Box } from '@mui/material';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ExportButtonsProps {
  data?: any[];
  columns?: string[];
  excelFileName?: string;
  pdfFileName?: string;
  transformer?: (data: any[]) => any[];
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  disabled?: boolean;
  excelLabel?: string;
  pdfLabel?: string;
  excelIcon?: React.ReactNode;
  pdfIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
}

export default function ExportButtons({ 
  data = [], 
  columns = [], 
  excelFileName = 'export.xlsx', 
  pdfFileName = 'export.pdf',
  transformer,
  onExportExcel,
  onExportPDF,
  disabled = false,
  excelLabel = 'Export to Excel',
  pdfLabel = 'Export to PDF',
  excelIcon,
  pdfIcon,
  size = 'small',
  variant = 'outlined'
}: ExportButtonsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      <Button 
        variant={variant}
        size={size}
        startIcon={excelIcon}
        disabled={disabled} 
        onClick={() => onExportExcel ? onExportExcel() : exportToExcel(data, excelFileName, transformer)}
      >
        {excelLabel}
      </Button>
      <Button 
        variant={variant}
        size={size}
        startIcon={pdfIcon}
        disabled={disabled} 
        onClick={() => onExportPDF ? onExportPDF() : exportToPDF(data, columns, pdfFileName, transformer)}
      >
        {pdfLabel}
      </Button>
    </Box>
  );
} 