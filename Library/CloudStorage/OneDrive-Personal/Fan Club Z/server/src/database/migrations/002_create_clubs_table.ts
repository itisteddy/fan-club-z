import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('clubs', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.string('name').notNullable()
    table.text('description').notNullable()
    table.text('category').notNullable().checkIn(['sports', 'crypto', 'entertainment', 'politics', 'technology', 'finance', 'gaming', 'pop', 'custom'])
    table.uuid('creator_id').references('id').inTable('users').onDelete('CASCADE')
    table.integer('member_count').defaultTo(0)
    table.boolean('is_private').defaultTo(false)
    table.string('image_url')
    table.text('rules')
    table.json('settings').defaultTo('{}') // Club-specific settings
    table.boolean('is_active').defaultTo(true)
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['creator_id'])
    table.index(['category'])
    table.index(['is_private'])
    table.index(['created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('clubs')
} 