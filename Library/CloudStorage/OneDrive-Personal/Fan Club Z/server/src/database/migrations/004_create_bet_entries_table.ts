import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('bet_entries', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('bet_id').references('id').inTable('bets').onDelete('CASCADE')
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.string('selected_option').notNullable() // ID of the selected option
    table.decimal('stake_amount', 10, 2).notNullable()
    table.decimal('potential_winnings', 10, 2).notNullable()
    table.enum('status', ['active', 'won', 'lost', 'cancelled']).defaultTo('active')
    table.decimal('winnings_paid', 10, 2).defaultTo(0)
    table.timestamp('paid_at')
    table.jsonb('metadata').defaultTo('{}') // Additional entry data
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['bet_id'])
    table.index(['user_id'])
    table.index(['status'])
    table.index(['created_at'])
    
    // Unique constraint to prevent duplicate entries
    table.unique(['bet_id', 'user_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('bet_entries')
} 