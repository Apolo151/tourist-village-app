import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import SearchableDropdown from './SearchableDropdown';
import type { SearchableDropdownProps } from './SearchableDropdown';

interface ClearableSearchDropdownProps extends SearchableDropdownProps {
  onClearSelection?: () => void;
  showClearButton?: boolean;
}

export default function ClearableSearchDropdown({
  onClearSelection,
  showClearButton = true,
  ...props
}: ClearableSearchDropdownProps) {
  return (
    <Box sx={{ position: 'relative' }}>
      <SearchableDropdown {...props} />
      {showClearButton && props.value && !props.disabled && (
        <Tooltip title="Clear selection">
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              right: 40,
              top: 12,
              zIndex: 2,
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
              }
            }}
            onClick={() => {
              if (onClearSelection) {
                onClearSelection();
              } else if (props.onChange) {
                props.onChange(null);
              }
            }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
