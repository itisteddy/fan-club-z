import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('bet_entries', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.uuid('bet_id').references('id').inTable('bets').onDelete('CASCADE')
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.string('selected_option').notNullable() // ID of the selected option
    table.decimal('stake_amount', 10, 2).notNullable()
    table.decimal('potential_winnings', 10, 2).notNullable()
    table.text('status').defaultTo('active').checkIn(['active', 'won', 'lost', 'cancelled'])
    table.decimal('winnings_paid', 10, 2).defaultTo(0)
    table.timestamp('paid_at')
    table.json('metadata').defaultTo('{}') // Additional entry data
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