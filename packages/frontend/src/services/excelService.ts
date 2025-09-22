import * as XLSX from 'xlsx';
import { userService } from './userService';

interface UserImportRow {
  name: string;
  email: string;
  password?: string;
  phone_number?: string;
  role: string;
  is_active?: string;
  village_ids?: string;
  passport_number?: string;
  passport_expiry_date?: string;
  address?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_email?: string;
  next_of_kin_address?: string;
  next_of_kin_will?: string;
}

export class ExcelService {
  /**
   * Generate and download a user import template
   */
  generateUserImportTemplate(): void {
    // Define the template structure with column headers
    const templateHeaders = [
      'name',
      'email',
      'password',
      'phone_number',
      'role',
      'is_active',
      'village_ids',
      'passport_number',
      'passport_expiry_date',
      'address',
      'next_of_kin_name',
      'next_of_kin_phone',
      'next_of_kin_email',
      'next_of_kin_address',
      'next_of_kin_will'
    ];

    // Add example data rows
    const exampleData = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'leave_blank_for_auto_generation',
        phone_number: '1234567890',
        role: 'owner',
        is_active: 'TRUE',
        village_ids: '1,2',
        passport_number: 'AB123456',
        passport_expiry_date: '2025-12-31',
        address: '123 Main St, City',
        next_of_kin_name: 'Jane Doe',
        next_of_kin_phone: '0987654321',
        next_of_kin_email: 'jane.doe@example.com',
        next_of_kin_address: '456 Second St, City',
        next_of_kin_will: 'Details about will'
      },
      {
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        password: '',
        phone_number: '5551234567',
        role: 'renter',
        is_active: 'TRUE',
        village_ids: '',
        passport_number: 'CD789012',
        passport_expiry_date: '2026-06-30',
        address: '789 Oak St, Town',
        next_of_kin_name: 'Bob Smith',
        next_of_kin_phone: '5559876543',
        next_of_kin_email: 'bob.smith@example.com',
        next_of_kin_address: '321 Pine St, Town',
        next_of_kin_will: ''
      }
    ];

    // Create a worksheet with headers and example data
    const ws = XLSX.utils.json_to_sheet(exampleData, { header: templateHeaders });

    // Add column width specifications
    const wscols = templateHeaders.map(() => ({ wch: 20 })); // Set width of 20 for all columns
    ws['!cols'] = wscols;

    // Create a workbook and add the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users Template');

    // Generate the file and trigger download
    XLSX.writeFile(wb, 'user_import_template.xlsx');
  }

  /**
   * Process user import data
   */
  async processUserImport(data: any[]): Promise<{
    success: number;
    errors: { row: number; email: string; error: string }[];
  }> {
    const results = {
      success: 0,
      errors: [] as { row: number; email: string; error: string }[]
    };

    // Validate required fields in the data
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel rows start at 1, and we have a header row

      try {
        // Validate required fields
        if (!row.name || !row.email || !row.role) {
          throw new Error('Missing required fields: name, email, and role are required');
        }

        // Validate role
        const validRoles = ['super_admin', 'admin', 'owner', 'renter'];
        if (!validRoles.includes(row.role)) {
          throw new Error(`Invalid role: ${row.role}. Must be one of: ${validRoles.join(', ')}`);
        }

        // Process boolean fields
        const isActive = row.is_active ? row.is_active.toString().toUpperCase() === 'TRUE' : true;

        // Process village IDs if provided
        let villageIds: number[] = [];
        if (row.village_ids && row.role === 'admin') {
          try {
            villageIds = row.village_ids
              .split(',')
              .map((id: string) => parseInt(id.trim()))
              .filter((id: number) => !isNaN(id));
          } catch (e) {
            throw new Error('Invalid village_ids format. Expected comma-separated numbers.');
          }
        }

        // Create user object
        const userData = {
          name: row.name,
          email: row.email,
          password: row.password || undefined,
          phone_number: row.phone_number || undefined,
          role: row.role,
          is_active: isActive,
          village_ids: villageIds.length > 0 ? villageIds : undefined,
          passport_number: row.passport_number || undefined,
          passport_expiry_date: row.passport_expiry_date || undefined,
          address: row.address || undefined,
          next_of_kin_name: row.next_of_kin_name || undefined,
          next_of_kin_phone: row.next_of_kin_phone || undefined,
          next_of_kin_email: row.next_of_kin_email || undefined,
          next_of_kin_address: row.next_of_kin_address || undefined,
          next_of_kin_will: row.next_of_kin_will || undefined
        };

        // Call API to create user
        await userService.createUser(userData);
        results.success++;
      } catch (error) {
        results.errors.push({
          row: rowIndex,
          email: row.email || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

export const excelService = new ExcelService();
