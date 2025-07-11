import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create KYC verifications table
  await knex.schema.createTable('kyc_verifications', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
    table.string('first_name').notNullable()
    table.string('last_name').notNullable()
    table.date('date_of_birth').notNullable()
    table.jsonb('address').notNullable() // { street, city, state, zipCode, country }
    table.string('phone_number').notNullable()
    table.enum('status', ['pending', 'verified', 'rejected']).defaultTo('pending')
    table.timestamp('submitted_at').defaultTo(knex.fn.now())
    table.timestamp('verified_at')
    table.text('rejection_reason')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['user_id'])
    table.index(['status'])
    table.index(['submitted_at'])
    
    // Unique constraint - one KYC per user
    table.unique(['user_id'])
  })

  // Create KYC documents table
  await knex.schema.createTable('kyc_documents', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
    table.enum('type', ['passport', 'drivers_license', 'national_id', 'utility_bill']).notNullable()
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending')
    table.string('document_url').notNullable()
    table.timestamp('uploaded_at').defaultTo(knex.fn.now())
    table.timestamp('verified_at')
    table.text('rejection_reason')
    table.jsonb('metadata').defaultTo('{}') // Additional document data
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['user_id'])
    table.index(['type'])
    table.index(['status'])
    table.index(['uploaded_at'])
  })

  // Add KYC-related columns to users table if they don't exist
  const hasKycLevel = await knex.schema.hasColumn('users', 'kyc_level')
  if (!hasKycLevel) {
    await knex.schema.alterTable('users', (table: Knex.TableBuilder) => {
      table.enum('kyc_level', ['none', 'basic', 'enhanced']).defaultTo('none')
      table.timestamp('kyc_verified_at')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('kyc_documents')
  await knex.schema.dropTableIfExists('kyc_verifications')
  
  // Remove KYC columns from users table
  await knex.schema.alterTable('users', (table: Knex.TableBuilder) => {
    table.dropColumn('kyc_level')
    table.dropColumn('kyc_verified_at')
  })
} 