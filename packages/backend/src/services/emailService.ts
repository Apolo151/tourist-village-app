import { db } from '../database/connection';
import {
  Email,
  CreateEmailRequest,
  UpdateEmailRequest,
  EmailFilters,
  PaginatedResponse,
  PublicUser,
  Apartment,
  Booking
} from '../types';

export class EmailService {
  
  /**
   * Get all emails with filtering, sorting, and pagination
   */
  async getEmails(filters: EmailFilters = {}): Promise<PaginatedResponse<Email & { 
    apartment?: Apartment; 
    booking?: Booking;
    created_by_user?: PublicUser;
  }>> {
    const {
      apartment_id,
      booking_id,
      village_id,
      type,
      date_from,
      date_to,
      from,
      to,
      created_by,
      search,
      page = 1,
      limit = 10,
      sort_by = 'date',
      sort_order = 'desc'
    } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    let query = db('emails as e')
      .leftJoin('apartments as a', 'e.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'e.booking_id', 'b.id')
      .leftJoin('users as creator', 'e.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
      .select(
        'e.*',
        // Apartment details
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.owner_id as apartment_owner_id',
        'a.paying_status as apartment_paying_status',
        'a.created_by as apartment_created_by',
        'a.created_at as apartment_created_at',
        'a.updated_at as apartment_updated_at',
        // Village details
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at',
        // Apartment owner details
        'owner.name as owner_name',
        'owner.email as owner_email',
        'owner.phone_number as owner_phone',
        'owner.role as owner_role',
        'owner.is_active as owner_is_active',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
        // Booking details (if exists)
        'b.user_id as booking_user_id',
        'b.user_type as booking_user_type',
        'b.arrival_date as booking_arrival_date',
        'b.leaving_date as booking_leaving_date',
        'b.status as booking_status',
        'b.notes as booking_notes',
        'b.created_by as booking_created_by',
        'b.created_at as booking_created_at',
        'b.updated_at as booking_updated_at',
        // Booking user details
        'booking_user.name as booking_user_name',
        'booking_user.email as booking_user_email',
        'booking_user.phone_number as booking_user_phone',
        'booking_user.role as booking_user_role',
        'booking_user.is_active as booking_user_is_active',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      );

    // Apply filters
    if (apartment_id) {
      query = query.where('e.apartment_id', apartment_id);
    }

    if (booking_id) {
      query = query.where('e.booking_id', booking_id);
    }

    if (village_id) {
      query = query.where('a.village_id', village_id);
    }

    if (type) {
      query = query.where('e.type', type);
    }

    if (created_by) {
      query = query.where('e.created_by', created_by);
    }

    if (date_from) {
      query = query.where('e.date', '>=', new Date(date_from));
    }

    if (date_to) {
      query = query.where('e.date', '<=', new Date(date_to));
    }

    if (from) {
      query = query.where('e.from', 'ilike', `%${from}%`);
    }

    if (to) {
      query = query.where('e.to', 'ilike', `%${to}%`);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.where(function() {
        this.where('e.from', 'ilike', `%${searchTerm}%`)
            .orWhere('e.to', 'ilike', `%${searchTerm}%`)
            .orWhere('e.subject', 'ilike', `%${searchTerm}%`)
            .orWhere('e.content', 'ilike', `%${searchTerm}%`)
            .orWhere('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('owner.name', 'ilike', `%${searchTerm}%`)
            .orWhere('booking_user.name', 'ilike', `%${searchTerm}%`);
      });
    }

    // Get total count for pagination
    const countQuery = db('emails as e')
      .leftJoin('apartments as a', 'e.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'e.booking_id', 'b.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id');

    // Apply the same filters to count query
    if (apartment_id) countQuery.where('e.apartment_id', apartment_id);
    if (booking_id) countQuery.where('e.booking_id', booking_id);
    if (village_id) countQuery.where('a.village_id', village_id);
    if (type) countQuery.where('e.type', type);
    if (created_by) countQuery.where('e.created_by', created_by);
    if (date_from) countQuery.where('e.date', '>=', new Date(date_from));
    if (date_to) countQuery.where('e.date', '<=', new Date(date_to));
    if (from) countQuery.where('e.from', 'ilike', `%${from}%`);
    if (to) countQuery.where('e.to', 'ilike', `%${to}%`);
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.where(function() {
        this.where('e.from', 'ilike', `%${searchTerm}%`)
            .orWhere('e.to', 'ilike', `%${searchTerm}%`)
            .orWhere('e.subject', 'ilike', `%${searchTerm}%`)
            .orWhere('e.content', 'ilike', `%${searchTerm}%`)
            .orWhere('a.name', 'ilike', `%${searchTerm}%`)
            .orWhere('v.name', 'ilike', `%${searchTerm}%`)
            .orWhere('owner.name', 'ilike', `%${searchTerm}%`)
            .orWhere('booking_user.name', 'ilike', `%${searchTerm}%`);
      });
    }

    const [{ count }] = await countQuery.count('e.id as count');
    const total = parseInt(count as string);

    // Apply sorting
    const validSortFields = ['date', 'type', 'from', 'to', 'subject', 'apartment_name', 'village_name', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'date';
    const validSortOrder = sort_order === 'desc' ? 'desc' : 'asc';
    
    if (sortField === 'apartment_name') {
      query = query.orderBy('a.name', validSortOrder);
    } else if (sortField === 'village_name') {
      query = query.orderBy('v.name', validSortOrder);
    } else {
      query = query.orderBy(`e.${sortField}`, validSortOrder);
    }

    // Apply pagination
    const offset = (validatedPage - 1) * validatedLimit;
    query = query.limit(validatedLimit).offset(offset);

    const emails = await query;

    // Transform data
    const transformedEmails = emails.map((email: any) => ({
      id: email.id,
      apartment_id: email.apartment_id,
      booking_id: email.booking_id || undefined,
      date: new Date(email.date),
      from: email.from,
      to: email.to,
      subject: email.subject,
      content: email.content,
      type: email.type,
      created_by: email.created_by,
      created_at: new Date(email.created_at),
      updated_at: new Date(email.updated_at),
      apartment: {
        id: email.apartment_id,
        name: email.apartment_name,
        village_id: email.apartment_village_id,
        phase: email.apartment_phase,
        owner_id: email.apartment_owner_id,
        paying_status: email.apartment_paying_status,
        created_by: email.apartment_created_by,
        created_at: new Date(email.apartment_created_at),
        updated_at: new Date(email.apartment_updated_at),
        village: {
          id: email.apartment_village_id,
          name: email.village_name,
          electricity_price: parseFloat(email.village_electricity_price),
          water_price: parseFloat(email.village_water_price),
          phases: email.village_phases,
          created_at: new Date(email.village_created_at),
          updated_at: new Date(email.village_updated_at)
        },
        owner: email.owner_name ? {
          id: email.apartment_owner_id,
          name: email.owner_name,
          email: email.owner_email,
          phone_number: email.owner_phone || undefined,
          role: email.owner_role,
          is_active: Boolean(email.owner_is_active),
          created_at: new Date(email.owner_created_at),
          updated_at: new Date(email.owner_updated_at)
        } : undefined
      },
      booking: email.booking_arrival_date ? {
        id: email.booking_id,
        apartment_id: email.apartment_id,
        user_id: email.booking_user_id,
        user_type: email.booking_user_type,
        arrival_date: new Date(email.booking_arrival_date),
        leaving_date: new Date(email.booking_leaving_date),
        status: email.booking_status,
        notes: email.booking_notes || undefined,
        created_by: email.booking_created_by,
        created_at: new Date(email.booking_created_at),
        updated_at: new Date(email.booking_updated_at),
        number_of_people: email.booking_number_of_people || 0,
        user: email.booking_user_name ? {
          id: email.booking_user_id,
          name: email.booking_user_name,
          email: email.booking_user_email,
          phone_number: email.booking_user_phone || undefined,
          role: email.booking_user_role,
          is_active: Boolean(email.booking_user_is_active),
          created_at: email.booking_user_created_at ? new Date(email.booking_user_created_at) : new Date(0),
          updated_at: email.booking_user_updated_at ? new Date(email.booking_user_updated_at) : new Date(0)
        } : undefined
      } : undefined,
      created_by_user: email.creator_name ? {
        id: email.created_by,
        name: email.creator_name,
        email: email.creator_email,
        phone_number: email.creator_phone || undefined,
        role: email.creator_role,
        is_active: Boolean(email.creator_is_active),
        created_at: email.creator_created_at ? new Date(email.creator_created_at) : new Date(0),
        updated_at: email.creator_updated_at ? new Date(email.creator_updated_at) : new Date(0)
      } : undefined
    }));

    return {
      data: transformedEmails,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        total_pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  /**
   * Get email by ID
   */
  async getEmailById(id: number): Promise<(Email & { 
    apartment?: Apartment; 
    booking?: Booking;
    created_by_user?: PublicUser;
  }) | null> {
    if (!id || id <= 0) {
      return null;
    }

    const email = await db('emails as e')
      .leftJoin('apartments as a', 'e.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .leftJoin('bookings as b', 'e.booking_id', 'b.id')
      .leftJoin('users as creator', 'e.created_by', 'creator.id')
      .leftJoin('users as owner', 'a.owner_id', 'owner.id')
      .leftJoin('users as booking_user', 'b.user_id', 'booking_user.id')
      .select(
        'e.*',
        // Apartment details
        'a.name as apartment_name',
        'a.village_id as apartment_village_id',
        'a.phase as apartment_phase',
        'a.owner_id as apartment_owner_id',
        'a.paying_status as apartment_paying_status',
        'a.created_by as apartment_created_by',
        'a.created_at as apartment_created_at',
        'a.updated_at as apartment_updated_at',
        // Village details
        'v.name as village_name',
        'v.electricity_price as village_electricity_price',
        'v.water_price as village_water_price',
        'v.phases as village_phases',
        'v.created_at as village_created_at',
        'v.updated_at as village_updated_at',
        // Apartment owner details
        'owner.name as owner_name',
        'owner.email as owner_email',
        'owner.phone_number as owner_phone',
        'owner.role as owner_role',
        'owner.is_active as owner_is_active',
        'owner.created_at as owner_created_at',
        'owner.updated_at as owner_updated_at',
        // Booking details (if exists)
        'b.user_id as booking_user_id',
        'b.user_type as booking_user_type',
        'b.arrival_date as booking_arrival_date',
        'b.leaving_date as booking_leaving_date',
        'b.status as booking_status',
        'b.notes as booking_notes',
        'b.created_by as booking_created_by',
        'b.created_at as booking_created_at',
        'b.updated_at as booking_updated_at',
        // Booking user details
        'booking_user.name as booking_user_name',
        'booking_user.email as booking_user_email',
        'booking_user.phone_number as booking_user_phone',
        'booking_user.role as booking_user_role',
        'booking_user.is_active as booking_user_is_active',
        // Creator details
        'creator.name as creator_name',
        'creator.email as creator_email',
        'creator.phone_number as creator_phone',
        'creator.role as creator_role',
        'creator.is_active as creator_is_active',
        'creator.created_at as creator_created_at',
        'creator.updated_at as creator_updated_at'
      )
      .where('e.id', id)
      .first();

    if (!email) {
      return null;
    }

    return {
      id: email.id,
      apartment_id: email.apartment_id,
      booking_id: email.booking_id || undefined,
      date: new Date(email.date),
      from: email.from,
      to: email.to,
      subject: email.subject,
      content: email.content,
      type: email.type,
      created_by: email.created_by,
      created_at: new Date(email.created_at),
      updated_at: new Date(email.updated_at),
      apartment: {
        id: email.apartment_id,
        name: email.apartment_name,
        village_id: email.apartment_village_id,
        phase: email.apartment_phase,
        owner_id: email.apartment_owner_id,
        paying_status: email.apartment_paying_status,
        created_by: email.apartment_created_by,
        created_at: new Date(email.apartment_created_at),
        updated_at: new Date(email.apartment_updated_at),
        village: {
          id: email.apartment_village_id,
          name: email.village_name,
          electricity_price: parseFloat(email.village_electricity_price),
          water_price: parseFloat(email.village_water_price),
          phases: email.village_phases,
          created_at: new Date(email.village_created_at),
          updated_at: new Date(email.village_updated_at)
        },
        owner: email.owner_name ? {
          id: email.apartment_owner_id,
          name: email.owner_name,
          email: email.owner_email,
          phone_number: email.owner_phone || undefined,
          role: email.owner_role,
          is_active: Boolean(email.owner_is_active),
          created_at: new Date(email.owner_created_at),
          updated_at: new Date(email.owner_updated_at)
        } : undefined
      },
      booking: email.booking_arrival_date ? {
        id: email.booking_id,
        apartment_id: email.apartment_id,
        user_id: email.booking_user_id,
        user_type: email.booking_user_type,
        arrival_date: new Date(email.booking_arrival_date),
        leaving_date: new Date(email.booking_leaving_date),
        status: email.booking_status,
        notes: email.booking_notes || undefined,
        created_by: email.booking_created_by,
        created_at: new Date(email.booking_created_at),
        updated_at: new Date(email.booking_updated_at),
        number_of_people: email.booking_number_of_people || 0,
        user: email.booking_user_name ? {
          id: email.booking_user_id,
          name: email.booking_user_name,
          email: email.booking_user_email,
          phone_number: email.booking_user_phone || undefined,
          role: email.booking_user_role,
          is_active: Boolean(email.booking_user_is_active),
          created_at: email.booking_user_created_at ? new Date(email.booking_user_created_at) : new Date(0),
          updated_at: email.booking_user_updated_at ? new Date(email.booking_user_updated_at) : new Date(0)
        } : undefined
      } : undefined,
      created_by_user: email.creator_name ? {
        id: email.created_by,
        name: email.creator_name,
        email: email.creator_email,
        phone_number: email.creator_phone || undefined,
        role: email.creator_role,
        is_active: Boolean(email.creator_is_active),
        created_at: email.creator_created_at ? new Date(email.creator_created_at) : new Date(0),
        updated_at: email.creator_updated_at ? new Date(email.creator_updated_at) : new Date(0)
      } : undefined
    };
  }

  /**
   * Create new email
   */
  async createEmail(data: CreateEmailRequest, createdBy: number): Promise<Email> {
    // Input validation
    if (!data.apartment_id || !data.date || !data.from || !data.to || !data.subject || !data.content || !data.type) {
      throw new Error('Apartment, date, from, to, subject, content, and type are required');
    }

    if (!['complaint', 'inquiry', 'other'].includes(data.type)) {
      throw new Error('Type must be complaint, inquiry, or other');
    }

    // Validate date
    const emailDate = new Date(data.date);
    if (isNaN(emailDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.from)) {
      throw new Error('Invalid from email address');
    }
    if (!emailRegex.test(data.to)) {
      throw new Error('Invalid to email address');
    }

    // Validate apartment exists
    const apartment = await db('apartments').where('id', data.apartment_id).first();
    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Validate booking if provided
    if (data.booking_id) {
      const booking = await db('bookings')
        .where('id', data.booking_id)
        .where('apartment_id', data.apartment_id)
        .first();
      if (!booking) {
        throw new Error('Booking not found or does not belong to the specified apartment');
      }
    }

    // Validate content length
    if (data.subject.length > 255) {
      throw new Error('Subject must not exceed 255 characters');
    }

    if (data.content.length > 10000) {
      throw new Error('Content must not exceed 10,000 characters');
    }

    try {
      const [emailId] = await db('emails')
        .insert({
          apartment_id: data.apartment_id,
          booking_id: data.booking_id || null,
          date: emailDate,
          from: data.from.toLowerCase().trim(),
          to: data.to.toLowerCase().trim(),
          subject: data.subject.trim(),
          content: data.content.trim(),
          type: data.type,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('id');

      const id = typeof emailId === 'object' ? emailId.id : emailId;
      
      const email = await this.getEmailById(id);
      if (!email) {
        throw new Error('Failed to create email');
      }

      return email;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to apartment or booking');
      }
      throw new Error(`Failed to create email: ${error.message}`);
    }
  }

  /**
   * Update email
   */
  async updateEmail(id: number, data: UpdateEmailRequest): Promise<Email> {
    if (!id || id <= 0) {
      throw new Error('Invalid email ID');
    }

    // Check if email exists
    const existingEmail = await this.getEmailById(id);
    if (!existingEmail) {
      throw new Error('Email not found');
    }

    // Validate updates
    if (data.apartment_id !== undefined) {
      const apartment = await db('apartments').where('id', data.apartment_id).first();
      if (!apartment) {
        throw new Error('Apartment not found');
      }
    }

    if (data.booking_id !== undefined && data.booking_id !== null) {
      const apartmentId = data.apartment_id || existingEmail.apartment_id;
      const booking = await db('bookings')
        .where('id', data.booking_id)
        .where('apartment_id', apartmentId)
        .first();
      if (!booking) {
        throw new Error('Booking not found or does not belong to the specified apartment');
      }
    }

    if (data.type !== undefined && !['complaint', 'inquiry', 'other'].includes(data.type)) {
      throw new Error('Type must be complaint, inquiry, or other');
    }

    // Validate date
    let emailDate: Date | undefined;
    if (data.date !== undefined) {
      emailDate = new Date(data.date);
      if (isNaN(emailDate.getTime())) {
        throw new Error('Invalid date format');
      }
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.from !== undefined && !emailRegex.test(data.from)) {
      throw new Error('Invalid from email address');
    }
    if (data.to !== undefined && !emailRegex.test(data.to)) {
      throw new Error('Invalid to email address');
    }

    // Validate content length
    if (data.subject !== undefined && data.subject.length > 255) {
      throw new Error('Subject must not exceed 255 characters');
    }

    if (data.content !== undefined && data.content.length > 10000) {
      throw new Error('Content must not exceed 10,000 characters');
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date() };

    if (data.apartment_id !== undefined) updateData.apartment_id = data.apartment_id;
    if (data.booking_id !== undefined) updateData.booking_id = data.booking_id || null;
    if (emailDate) updateData.date = emailDate;
    if (data.from !== undefined) updateData.from = data.from.toLowerCase().trim();
    if (data.to !== undefined) updateData.to = data.to.toLowerCase().trim();
    if (data.subject !== undefined) updateData.subject = data.subject.trim();
    if (data.content !== undefined) updateData.content = data.content.trim();
    if (data.type !== undefined) updateData.type = data.type;

    try {
      await db('emails').where('id', id).update(updateData);

      const updatedEmail = await this.getEmailById(id);
      if (!updatedEmail) {
        throw new Error('Failed to update email');
      }

      return updatedEmail;
    } catch (error: any) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw new Error('Invalid reference to apartment or booking');
      }
      throw new Error(`Failed to update email: ${error.message}`);
    }
  }

  /**
   * Delete email
   */
  async deleteEmail(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid email ID');
    }

    // Check if email exists
    const email = await this.getEmailById(id);
    if (!email) {
      throw new Error('Email not found');
    }

    try {
      await db('emails').where('id', id).del();
    } catch (error: any) {
      throw new Error(`Failed to delete email: ${error.message}`);
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(): Promise<{
    total_emails: number;
    by_type: { type: string; count: number }[];
    by_village: { village_name: string; count: number }[];
    recent_activity: { date: string; count: number }[];
    top_senders: { from: string; count: number }[];
    top_recipients: { to: string; count: number }[];
  }> {
    // Total emails
    const [{ count: totalEmails }] = await db('emails').count('id as count');

    // By type
    const byType = await db('emails')
      .select('type')
      .count('id as count')
      .groupBy('type');

    // By village
    const byVillage = await db('emails as e')
      .leftJoin('apartments as a', 'e.apartment_id', 'a.id')
      .leftJoin('villages as v', 'a.village_id', 'v.id')
      .select('v.name as village_name')
      .count('e.id as count')
      .groupBy('v.id', 'v.name')
      .orderBy('count', 'desc');

    // Recent activity (last 30 days)
    const recentActivity = await db('emails')
      .select(db.raw('DATE(date) as date'))
      .count('id as count')
      .where('date', '>=', db.raw("CURRENT_DATE - INTERVAL '30 days'"))
      .groupBy(db.raw('DATE(date)'))
      .orderBy('date', 'desc')
      .limit(30);

    // Top senders
    const topSenders = await db('emails')
      .select('from')
      .count('id as count')
      .groupBy('from')
      .orderBy('count', 'desc')
      .limit(10);

    // Top recipients
    const topRecipients = await db('emails')
      .select('to')
      .count('id as count')
      .groupBy('to')
      .orderBy('count', 'desc')
      .limit(10);

    return {
      total_emails: parseInt(totalEmails as string),
      by_type: byType.map(item => ({
        type: String(item.type),
        count: parseInt(item.count as string)
      })),
      by_village: byVillage.map(item => ({
        village_name: String(item.village_name) || 'Unknown',
        count: parseInt(item.count as string)
      })),
      recent_activity: recentActivity.map((item: any) => ({
        date: String(item.date),
        count: parseInt(item.count as string)
      })),
      top_senders: topSenders.map(item => ({
        from: String(item.from),
        count: parseInt(item.count as string)
      })),
      top_recipients: topRecipients.map(item => ({
        to: String(item.to),
        count: parseInt(item.count as string)
      }))
    };
  }
} 