import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('comments', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('target_type').notNullable() // 'bet', 'club', etc.
    table.uuid('target_id').notNullable() // ID of the bet, club, etc.
    table.text('content').notNullable()
    table.integer('likes_count').defaultTo(0)
    table.integer('replies_count').defaultTo(0)
    table.uuid('parent_id').references('id').inTable('comments').onDelete('CASCADE') // For nested comments
    table.boolean('is_edited').defaultTo(false)
    table.timestamp('edited_at')
    table.boolean('is_deleted').defaultTo(false)
    table.timestamp('deleted_at')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['target_type', 'target_id'])
    table.index(['author_id'])
    table.index(['parent_id'])
    table.index(['created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('comments')
} 