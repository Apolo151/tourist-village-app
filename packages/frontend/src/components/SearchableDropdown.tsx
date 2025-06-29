import React from 'react';
import {
  Autocomplete,
  TextField,
  FormControl,
  FormHelperText,
  Box,
  Typography,
  Chip
} from '@mui/material';
import type { AutocompleteProps, FilterOptionsState } from '@mui/material';

export interface SearchableDropdownOption {
  id: number | string;
  label: string;
  [key: string]: any;
}

export interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  getOptionLabel?: (option: SearchableDropdownOption) => string;
  renderOption?: (props: React.HTMLAttributes<HTMLLIElement>, option: SearchableDropdownOption) => React.ReactNode;
  filterOptions?: (options: SearchableDropdownOption[], state: FilterOptionsState<SearchableDropdownOption>) => SearchableDropdownOption[];
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  multipleValue?: (number | string)[];
  onMultipleChange?: (values: (number | string)[]) => void;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  error = false,
  helperText,
  getOptionLabel = (option) => option.label,
  renderOption,
  filterOptions,
  size = 'medium',
  fullWidth = true,
  clearable = true,
  multiple = false,
  multipleValue = [],
  onMultipleChange
}: SearchableDropdownProps) {
  const selectedOption = options.find(option => option.id === value);

  const defaultFilterOptions: AutocompleteProps<SearchableDropdownOption, false, false, false>['filterOptions'] = 
    (options, { inputValue }) => {
      const filterValue = inputValue.toLowerCase();
      return options.filter(option => 
        getOptionLabel(option).toLowerCase().includes(filterValue)
      );
    };

  if (multiple) {
    return (
      <FormControl fullWidth={fullWidth} error={error} required={required}>
        <Autocomplete
          multiple
          options={options}
          value={options.filter(option => multipleValue.includes(option.id))}
          onChange={(_, newValue) => {
            onMultipleChange?.(newValue.map(option => option.id));
          }}
          getOptionLabel={getOptionLabel}
          renderOption={renderOption}
          filterOptions={filterOptions || defaultFilterOptions}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              size={size}
              error={error}
            />
          )}
          disabled={disabled}
          clearOnBlur={false}
          size={size}
        />
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} error={error} required={required}>
      <Autocomplete
        options={options}
        value={selectedOption || null}
        onChange={(_, newValue) => {
          onChange(newValue?.id || null);
        }}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        filterOptions={filterOptions || defaultFilterOptions}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size={size}
            error={error}
          />
        )}
        disabled={disabled}
        clearOnBlur={false}
        size={size}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
} 