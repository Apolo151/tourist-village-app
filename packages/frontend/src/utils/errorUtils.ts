export interface DetailedError {
  title: string;
  message: string;
  action?: string;
  field?: string;
  type: 'network' | 'validation' | 'permission' | 'server' | 'business';
}

export class ErrorMessageHandler {
  /**
   * Parse and enhance error messages from API responses
   */
  static parseApiError(error: any): DetailedError {
    // Network errors
    if (!error.status || error.status === 0) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection.',
        action: 'Try refreshing the page or check your network connection.',
        type: 'network'
      };
    }

    // Authentication/Permission errors
    if (error.status === 401) {
      return {
        title: 'Authentication Required',
        message: 'Your session has expired. Please log in again.',
        action: 'Click here to go to the login page.',
        type: 'permission'
      };
    }

    if (error.status === 403) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        action: 'Contact your administrator if you believe this is an error.',
        type: 'permission'
      };
    }

    // Not found errors
    if (error.status === 404) {
      return {
        title: 'Not Found',
        message: 'The requested item could not be found.',
        action: 'Please check if the item still exists or try refreshing the page.',
        type: 'business'
      };
    }

    // Validation errors
    if (error.status === 400) {
      const message = error.message || error.data?.message || 'Invalid data provided';
      return this.parseValidationError(message);
    }

    // Conflict errors
    if (error.status === 409) {
      const message = error.message || error.data?.message || 'Conflict detected';
      return {
        title: 'Data Conflict',
        message: this.enhanceConflictMessage(message),
        action: 'Please check the data and try again with different values.',
        type: 'validation'
      };
    }

    // Server errors
    if (error.status >= 500) {
      return {
        title: 'Server Error',
        message: 'Something went wrong on our end. This has been logged and our team will look into it.',
        action: 'Please try again in a few minutes. If the problem persists, contact support.',
        type: 'server'
      };
    }

    // Default case with enhanced message
    const message = error.message || error.data?.message || 'An unexpected error occurred';
    return {
      title: 'Error',
      message: this.enhanceErrorMessage(message),
      action: 'Please try again. If the problem persists, contact support.',
      type: 'business'
    };
  }

  /**
   * Parse and enhance validation error messages
   */
  private static parseValidationError(message: string): DetailedError {
    const lowerMessage = message.toLowerCase();

    // Email validation
    if (lowerMessage.includes('email')) {
      if (lowerMessage.includes('invalid') || lowerMessage.includes('format')) {
        return {
          title: 'Invalid Email',
          message: 'Please enter a valid email address (e.g., user@example.com)',
          action: 'Check that your email contains @ and a valid domain.',
          field: 'email',
          type: 'validation'
        };
      }
      if (lowerMessage.includes('exists') || lowerMessage.includes('already')) {
        return {
          title: 'Email Already Exists',
          message: 'This email address is already registered.',
          action: 'Try logging in instead, or use a different email address.',
          field: 'email',
          type: 'validation'
        };
      }
    }

    // Password validation
    if (lowerMessage.includes('password')) {
      return {
        title: 'Password Requirements',
        message: 'Password must be at least 8 characters long and contain letters and numbers.',
        action: 'Create a stronger password with at least 8 characters, including both letters and numbers.',
        field: 'password',
        type: 'validation'
      };
    }

    // Phone validation
    if (lowerMessage.includes('phone')) {
      return {
        title: 'Invalid Phone Number',
        message: 'Please enter a valid phone number.',
        action: 'Include country code and ensure the number format is correct (e.g., +1234567890).',
        field: 'phone_number',
        type: 'validation'
      };
    }

    // Date validation
    if (lowerMessage.includes('date')) {
      if (lowerMessage.includes('after') || lowerMessage.includes('before')) {
        return {
          title: 'Invalid Date Range',
          message: message,
          action: 'Check that your dates are in the correct order and within valid ranges.',
          type: 'validation'
        };
      }
      return {
        title: 'Date Error',
        message: message,
        action: 'Please select a valid date.',
        type: 'validation'
      };
    }

    // Required field validation
    if (lowerMessage.includes('required') || lowerMessage.includes('cannot be empty')) {
      const field = this.extractFieldFromMessage(message);
      return {
        title: 'Required Field Missing',
        message: message,
        action: `Please fill in the ${field || 'required'} field.`,
        field: field,
        type: 'validation'
      };
    }

    // Numeric validation
    if (lowerMessage.includes('must be greater than') || lowerMessage.includes('must be positive')) {
      return {
        title: 'Invalid Number',
        message: message,
        action: 'Please enter a valid positive number.',
        type: 'validation'
      };
    }

    // Default validation error
    return {
      title: 'Validation Error',
      message: message,
      action: 'Please check your input and try again.',
      type: 'validation'
    };
  }

  /**
   * Enhance conflict error messages
   */
  private static enhanceConflictMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('already exists')) {
      if (lowerMessage.includes('email')) {
        return 'This email address is already registered. Please use a different email or try logging in.';
      }
      if (lowerMessage.includes('name')) {
        return 'This name is already taken. Please choose a different name.';
      }
      return 'This item already exists. Please use different values.';
    }

    if (lowerMessage.includes('in use') || lowerMessage.includes('being used')) {
      return 'This item cannot be deleted because it\'s currently being used. Remove all related items first.';
    }

    return message;
  }

  /**
   * Enhance generic error messages with more helpful information
   */
  private static enhanceErrorMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('failed to create')) {
      return message + ' Please check all required fields and try again.';
    }

    if (lowerMessage.includes('failed to update')) {
      return message + ' Your changes could not be saved. Please verify the data and try again.';
    }

    if (lowerMessage.includes('failed to delete')) {
      return message + ' The item might be in use or you may not have permission to delete it.';
    }

    if (lowerMessage.includes('failed to load') || lowerMessage.includes('failed to fetch')) {
      return message + ' Please refresh the page and try again.';
    }

    return message;
  }

  /**
   * Extract field name from error messages
   */
  private static extractFieldFromMessage(message: string): string | undefined {
    const fieldPatterns = [
      /(\w+)\s+is required/i,
      /(\w+)\s+cannot be empty/i,
      /please enter.*?(\w+)/i,
      /(\w+)\s+must be/i
    ];

    for (const pattern of fieldPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    return undefined;
  }

  /**
   * Get user-friendly form validation messages
   */
  static getFormValidationMessage(fieldName: string, validationType: string): string {
    const fieldLabels: Record<string, string> = {
      'name': 'Name',
      'email': 'Email',
      'password': 'Password',
      'phone_number': 'Phone Number',
      'village_id': 'Village',
      'apartment_id': 'Apartment',
      'owner_id': 'Owner',
      'user_id': 'User',
      'amount': 'Amount',
      'date': 'Date',
      'arrival_date': 'Arrival Date',
      'leaving_date': 'Leaving Date',
      'start_date': 'Start Date',
      'end_date': 'End Date'
    };

    const fieldLabel = fieldLabels[fieldName] || fieldName.replace('_', ' ');

    switch (validationType) {
      case 'required':
        return `${fieldLabel} is required. Please fill in this field.`;
      case 'email':
        return `Please enter a valid email address (e.g., user@example.com).`;
      case 'phone':
        return `Please enter a valid phone number with country code.`;
      case 'positive':
        return `${fieldLabel} must be greater than 0.`;
      case 'date_order':
        return `End date must be after start date.`;
      case 'date_future':
        return `${fieldLabel} cannot be in the past.`;
      case 'length_max':
        return `${fieldLabel} is too long. Please use fewer characters.`;
      case 'length_min':
        return `${fieldLabel} is too short. Please enter more characters.`;
      default:
        return `Please check the ${fieldLabel} field.`;
    }
  }

  /**
   * Get context-specific error messages based on the current page/action
   */
  static getContextualErrorMessage(context: string, error: any): DetailedError {
    const baseError = this.parseApiError(error);

    switch (context) {
      case 'login':
        if (baseError.type === 'validation' && error.status === 401) {
          return {
            ...baseError,
            title: 'Login Failed',
            message: 'Invalid email or password. Please check your credentials.',
            action: 'Double-check your email and password, or contact support if you\'ve forgotten your login details.'
          };
        }
        break;

      case 'create_apartment':
        if (baseError.type === 'validation') {
          return {
            ...baseError,
            action: 'Please check that all required fields are filled: apartment name, village, owner, and phase.'
          };
        }
        break;

      case 'create_booking':
        if (baseError.type === 'validation') {
          return {
            ...baseError,
            action: 'Please verify that all booking details are correct: dates, guest information, and apartment availability.'
          };
        }
        break;

      case 'payment':
        if (baseError.type === 'validation') {
          return {
            ...baseError,
            action: 'Please check the payment amount, method, and that all required fields are completed.'
          };
        }
        break;

      case 'utility_reading':
        if (baseError.type === 'validation') {
          return {
            ...baseError,
            action: 'Please ensure reading values are positive and end readings are greater than start readings.'
          };
        }
        break;
    }

    return baseError;
  }
} 