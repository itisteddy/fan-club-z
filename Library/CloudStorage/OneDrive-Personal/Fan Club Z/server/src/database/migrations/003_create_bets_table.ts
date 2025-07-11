import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('bets', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('creator_id').references('id').inTable('users').onDelete('CASCADE')
    table.string('title').notNullable()
    table.text('description').notNullable()
    table.enum('type', ['binary', 'multi', 'pool']).notNullable()
    table.enum('category', ['sports', 'pop', 'custom', 'crypto', 'politics']).notNullable()
    table.jsonb('options').notNullable() // Array of bet options
    table.enum('status', ['open', 'closed', 'settled', 'cancelled']).defaultTo('open')
    table.decimal('stake_min', 10, 2).notNullable()
    table.decimal('stake_max', 10, 2).notNullable()
    table.decimal('pool_total', 15, 2).defaultTo(0)
    table.timestamp('entry_deadline').notNullable()
    table.enum('settlement_method', ['auto', 'manual']).defaultTo('auto')
    table.boolean('is_private').defaultTo(false)
    table.uuid('club_id').references('id').inTable('clubs').onDelete('SET NULL')
    table.integer('likes_count').defaultTo(0)
    table.integer('comments_count').defaultTo(0)
    table.integer('shares_count').defaultTo(0)
    table.integer('entries_count').defaultTo(0)
    table.jsonb('metadata').defaultTo('{}') // Additional bet data
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