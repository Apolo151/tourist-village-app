import { useState, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Typography,
  Box,
  Alert,
  AlertTitle,
  Link,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Stack
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onImport: (data: any[]) => Promise<{
    success: number;
    errors: { row: number; email: string; error: string }[];
  }>;
  templateUrl?: string;
  onTemplateDownload?: () => void;
  title?: string;
  buttonText?: string;
  successMessage?: string;
  allowedFileTypes?: string;
  maxFileSize?: number; // in MB
}

export default function ExcelImport({
  onImport,
  templateUrl,
  onTemplateDownload,
  title = 'Import from Excel',
  buttonText = 'Import from Excel',
  successMessage = 'Import completed successfully',
  allowedFileTypes = '.xlsx, .xls, .csv',
  maxFileSize = 10 // 10MB default
}: ExcelImportProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: { row: number; email: string; error: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setOpen(true);
    setFile(null);
    setError(null);
    setImportResult(null);
    setProgress(0);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check file type
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      setError('Invalid file type. Please upload an Excel or CSV file.');
      return;
    }
    
    // Check file size
    if (selectedFile.size > maxFileSize * 1024 * 1024) {
      setError(`File size exceeds the maximum limit of ${maxFileSize}MB.`);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Failed to parse Excel file. Please check the file format.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import.');
      return;
    }
    
    try {
      setLoading(true);
      setProgress(10);
      setError(null);
      
      // Parse the Excel file
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        throw new Error('The file contains no data.');
      }
      
      setProgress(30);
      
      // Process the data in batches to show progress
      const result = await onImport(data);
      
      setProgress(100);
      setImportResult(result);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setProgress(0);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  const handleDownloadTemplate = () => {
    if (onTemplateDownload) {
      onTemplateDownload();
    } else if (templateUrl) {
      window.open(templateUrl, '_blank');
    }
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<UploadIcon />}
        onClick={handleOpen}
        sx={{ ml: 1 }}
      >
        {buttonText}
      </Button>
      
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {title}
            <IconButton edge="end" color="inherit" onClick={handleClose} disabled={loading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading ? (
            <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Processing... {progress}%
              </Typography>
            </Box>
          ) : importResult ? (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Alert severity={importResult.errors.length > 0 ? "warning" : "success"}>
                <AlertTitle>Import Completed</AlertTitle>
                <Typography>
                  Successfully imported {importResult.success} users.
                  {importResult.errors.length > 0 && ` Failed to import ${importResult.errors.length} users.`}
                </Typography>
              </Alert>
              
              {importResult.errors.length > 0 && (
                <Paper variant="outlined" sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary={<Typography variant="subtitle2">Import Errors</Typography>}
                        secondary="The following rows could not be imported"
                      />
                    </ListItem>
                    <Divider />
                    {importResult.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`Row ${error.row}: ${error.email || 'Unknown user'}`}
                          secondary={error.error}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          ) : (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Upload an Excel file (.xlsx, .xls) or CSV file containing user data. 
                Please ensure the file follows the required format.
              </DialogContentText>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Required Format</AlertTitle>
                <Typography variant="body2">
                  The Excel file must contain the following columns:
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li><strong>name</strong> (required) - Full name of the user</li>
                    <li><strong>email</strong> (required) - Email address (must be unique)</li>
                    <li><strong>role</strong> (required) - One of: super_admin, admin, owner, renter</li>
                  </Box>
                  Optional columns include: password, phone_number, is_active, village_ids, passport_number, etc.
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadTemplate}
                  >
                    Download Template
                  </Button>
                </Box>
              </Alert>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Box 
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                  cursor: 'pointer'
                }}
                onClick={handleSelectFile}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept={allowedFileTypes}
                  onChange={handleFileChange}
                />
                <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  {file ? file.name : 'Click to select file'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {file 
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
                    : `Supports ${allowedFileTypes} up to ${maxFileSize}MB`
                  }
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && !loading && (
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || loading}
              startIcon={<UploadIcon />}
            >
              Import
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
