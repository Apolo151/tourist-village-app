import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // This migration documents the renaming of Bills to Invoices
  // Bills are a virtual entity that aggregates payments, service_requests, and utility_readings
  // No actual database table changes are needed since Bills don't have a physical table
  
  // This migration serves as documentation for the API endpoint changes:
  // - /api/bills/summary -> /api/invoices/summary
  // - /api/bills/apartment/:id -> /api/invoices/apartment/:id
  // - /api/bills/user/:id -> /api/invoices/user/:id
  // - /api/bills/previous-years -> /api/invoices/previous-years
  // - /api/bills/renter-summary/:apartmentId -> /api/invoices/renter-summary/:apartmentId
  
  console.log('Bills entity renamed to Invoices - API endpoints updated');
}

export async function down(knex: Knex): Promise<void> {
  // This migration documents the renaming of Invoices back to Bills
  // No actual database table changes are needed since this is a virtual entity
  
  console.log('Invoices entity renamed back to Bills - API endpoints reverted');
} 