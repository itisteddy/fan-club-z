import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_interactions', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.uuid('from_user_id').references('id').inTable('users').onDelete('CASCADE')
    table.uuid('to_user_id').references('id').inTable('users').onDelete('CASCADE')
    table.enum('type', ['like', 'comment', 'share', 'reputation_vote']).notNullable()
    table.uuid('bet_id').references('id').inTable('bets').onDelete('CASCADE')
    table.text('content') // For comments
    table.integer('rating') // For reputation votes (1-5)
    table.text('metadata').defaultTo('{}') // Additional interaction data as JSON string
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['from_user_id'])
    table.index(['to_user_id'])
    table.index(['type'])
    table.index(['bet_id'])
    table.index(['created_at'])
    
    // Unique constraint to prevent duplicate interactions
    table.unique(['from_user_id', 'to_user_id', 'type', 'bet_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_interactions')
} 