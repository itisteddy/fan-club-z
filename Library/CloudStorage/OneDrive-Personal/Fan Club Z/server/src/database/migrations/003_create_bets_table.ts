import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('bets', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.uuid('creator_id').references('id').inTable('users').onDelete('CASCADE')
    table.string('title').notNullable()
    table.text('description').notNullable()
    table.text('type').notNullable().checkIn(['binary', 'multi', 'pool'])
    table.text('category').notNullable().checkIn(['sports', 'pop', 'custom', 'crypto', 'politics'])
    table.json('options').notNullable() // Array of bet options
    table.text('status').defaultTo('open').checkIn(['open', 'closed', 'settled', 'cancelled'])
    table.decimal('stake_min', 10, 2).notNullable()
    table.decimal('stake_max', 10, 2).notNullable()
    table.decimal('pool_total', 15, 2).defaultTo(0)
    table.timestamp('entry_deadline').notNullable()
    table.text('settlement_method').defaultTo('auto').checkIn(['auto', 'manual'])
    table.boolean('is_private').defaultTo(false)
    table.uuid('club_id').references('id').inTable('clubs').onDelete('SET NULL')
    table.integer('likes_count').defaultTo(0)
    table.integer('comments_count').defaultTo(0)
    table.integer('shares_count').defaultTo(0)
    table.integer('entries_count').defaultTo(0)
    table.json('metadata').defaultTo('{}') // Additional bet data
    table.timestamp('settled_at')
    table.string('settled_by') // User ID who settled the bet
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['creator_id'])
    table.index(['status'])
    table.index(['category'])
    table.index(['entry_deadline'])
    table.index(['created_at'])
    table.index(['club_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('bets')
} 