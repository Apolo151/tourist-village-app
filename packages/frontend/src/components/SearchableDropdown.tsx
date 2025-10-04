import React, { useState } from 'react';
import {
  Autocomplete,
  TextField,
  FormControl,
  FormHelperText,
  Box,
  Typography,
  Chip,
  CircularProgress
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
  freeSolo?: boolean;
  onInputChange?: (inputValue: string) => void;
  inputValue?: string;
  loading?: boolean;
  onServerSearch?: (searchText: string) => Promise<void>;
  serverSideSearch?: boolean;
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
  onMultipleChange,
  freeSolo = false,
  onInputChange,
  inputValue,
  loading = false,
  onServerSearch,
  serverSideSearch = false
}: SearchableDropdownProps) {
  const selectedOption = options.find(option => option.id === value);

  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const defaultFilterOptions: AutocompleteProps<SearchableDropdownOption, false, false, false>['filterOptions'] = 
    (options, { inputValue }) => {
      // If using server-side search, don't filter client-side
      if (serverSideSearch) return options;
      
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
          if (typeof newValue === 'string') {
            // Free text input
            onChange(null);
          } else {
            // Option selected
            onChange(newValue?.id || null);
          }
        }}
        getOptionLabel={(option) => {
          if (typeof option === 'string') {
            return option;
          }
          return getOptionLabel(option);
        }}
        renderOption={renderOption ? (props, option) => {
          if (typeof option === 'string') {
            return <li {...props}>{option}</li>;
          }
          return renderOption(props, option);
        } : undefined}
        filterOptions={filterOptions || defaultFilterOptions}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size={size}
            error={error}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {(loading || isSearching) && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        disabled={disabled}
        clearOnBlur={false}
        size={size}
        freeSolo={freeSolo}
        onInputChange={(_, inputValue) => {
          // Only proceed if the search text has actually changed
          if (inputValue !== searchText) {
            // Track search text internally
            setSearchText(inputValue);
            
            // Handle server-side search
            if (serverSideSearch && inputValue.length >= 2) {
              setIsSearching(true);
              onServerSearch?.(inputValue)
                .finally(() => setIsSearching(false));
            }
            
            onInputChange?.(inputValue);
          }
        }}
        inputValue={inputValue}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
} 