import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  Typography,
  IconButton,
  useTheme
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Login as LoginIcon,
  ContactSupport as SupportIcon,
  Wifi as NetworkIcon,
  Security as SecurityIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useState } from 'react';
import type { DetailedError } from '../utils/errorUtils';

interface EnhancedErrorDisplayProps {
  error: DetailedError;
  onRetry?: () => void;
  onLogin?: () => void;
  onContactSupport?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  onRetry,
  onLogin,
  onContactSupport,
  showDetails = true,
  className
}) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <NetworkIcon />;
      case 'permission':
        return <SecurityIcon />;
      case 'validation':
        return <WarningIcon />;
      case 'server':
        return <ErrorIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  const getErrorSeverity = (): 'error' | 'warning' | 'info' => {
    switch (error.type) {
      case 'network':
        return 'warning';
      case 'validation':
        return 'warning';
      case 'permission':
        return 'info';
      default:
        return 'error';
    }
  };

  const getActionButton = () => {
    switch (error.type) {
      case 'network':
        return onRetry ? (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        ) : null;

      case 'permission':
        return onLogin ? (
          <Button
            startIcon={<LoginIcon />}
            onClick={onLogin}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          >
            Login
          </Button>
        ) : null;

      case 'server':
        return onContactSupport ? (
          <Button
            startIcon={<SupportIcon />}
            onClick={onContactSupport}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          >
            Contact Support
          </Button>
        ) : null;

      default:
        return onRetry ? (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          >
            Try Again
          </Button>
        ) : null;
    }
  };

  return (
    <Alert
      severity={getErrorSeverity()}
      icon={getErrorIcon()}
      className={className}
      sx={{
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <AlertTitle>{error.title}</AlertTitle>
      
      <Typography variant="body2" sx={{ mb: 1 }}>
        {error.message}
      </Typography>

      {error.action && (
        <Box sx={{ mt: 1 }}>
          {showDetails && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ p: 0 }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="caption" color="textSecondary">
                What should I do?
              </Typography>
            </Box>
          )}
          
          <Collapse in={expanded || !showDetails}>
            <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                💡 <strong>Next steps:</strong> {error.action}
              </Typography>
              
              {getActionButton()}
            </Box>
          </Collapse>
        </Box>
      )}
    </Alert>
  );
};

interface ErrorBoundaryDisplayProps {
  errors: DetailedError[];
  onRetry?: () => void;
  onLogin?: () => void;
  onContactSupport?: () => void;
  maxErrors?: number;
}

export const ErrorBoundaryDisplay: React.FC<ErrorBoundaryDisplayProps> = ({
  errors,
  onRetry,
  onLogin,
  onContactSupport,
  maxErrors = 3
}) => {
  const [showAll, setShowAll] = useState(false);
  
  if (errors.length === 0) return null;

  const displayErrors = showAll ? errors : errors.slice(0, maxErrors);
  const hasMoreErrors = errors.length > maxErrors;

  return (
    <Box sx={{ mb: 2 }}>
      {displayErrors.map((error, index) => (
        <Box key={index} sx={{ mb: index < displayErrors.length - 1 ? 1 : 0 }}>
          <EnhancedErrorDisplay
            error={error}
            onRetry={onRetry}
            onLogin={onLogin}
            onContactSupport={onContactSupport}
            showDetails={errors.length === 1}
          />
        </Box>
      ))}
      
      {hasMoreErrors && !showAll && (
        <Button
          size="small"
          onClick={() => setShowAll(true)}
          sx={{ mt: 1 }}
        >
          Show {errors.length - maxErrors} more error{errors.length - maxErrors !== 1 ? 's' : ''}
        </Button>
      )}
    </Box>
  );
};

export default EnhancedErrorDisplay; 