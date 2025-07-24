import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('club_memberships', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.uuid('club_id').references('id').inTable('clubs').onDelete('CASCADE')
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.text('role').defaultTo('member').checkIn(['member', 'moderator', 'admin', 'owner'])
    table.text('status').defaultTo('active').checkIn(['pending', 'active', 'suspended', 'left'])
    table.timestamp('joined_at').defaultTo(knex.fn.now())
    table.timestamp('left_at')
    table.text('permissions').defaultTo('{}') // Role-specific permissions as JSON string
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['club_id'])
    table.index(['user_id'])
    table.index(['status'])
    table.index(['role'])
    table.index(['joined_at'])
    
    // Unique constraint to prevent duplicate memberships
    table.unique(['club_id', 'user_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('club_memberships')
} 