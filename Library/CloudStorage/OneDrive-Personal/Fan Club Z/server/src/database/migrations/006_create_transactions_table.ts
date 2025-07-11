import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.enum('type', ['deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost', 'refund', 'bonus', 'fee']).notNullable()
    table.decimal('amount', 15, 2).notNullable()
    table.decimal('balance_before', 15, 2).notNullable()
    table.decimal('balance_after', 15, 2).notNullable()
    table.enum('status', ['pending', 'completed', 'failed', 'cancelled']).defaultTo('pending')
    table.string('reference_id') // External reference (payment processor, bet ID, etc.)
    table.string('description').notNullable()
    table.jsonb('metadata').defaultTo('{}') // Additional transaction data
    table.string('ip_address')
    table.string('user_agent')
    table.timestamp('processed_at')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['user_id'])
    table.index(['type'])
    table.index(['status'])
    table.index(['reference_id'])
    table.index(['created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('transactions')
} 