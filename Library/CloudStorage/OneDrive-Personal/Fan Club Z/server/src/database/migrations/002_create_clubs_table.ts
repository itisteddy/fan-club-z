import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('clubs', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name').notNullable()
    table.text('description').notNullable()
    table.enum('category', ['sports', 'pop', 'custom', 'crypto', 'politics']).notNullable()
    table.uuid('creator_id').references('id').inTable('users').onDelete('CASCADE')
    table.integer('member_count').defaultTo(0)
    table.boolean('is_private').defaultTo(false)
    table.string('image_url')
    table.text('rules')
    table.jsonb('settings').defaultTo('{}') // Club-specific settings
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