import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_stats', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'))
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique()
    
    // Betting statistics
    table.integer('total_bets').defaultTo(0)
    table.integer('active_bets').defaultTo(0)
    table.integer('won_bets').defaultTo(0)
    table.integer('lost_bets').defaultTo(0)
    table.integer('cancelled_bets').defaultTo(0)
    table.decimal('total_staked', 15, 2).defaultTo(0)
    table.decimal('total_won', 15, 2).defaultTo(0)
    table.decimal('total_lost', 15, 2).defaultTo(0)
    table.decimal('net_profit', 15, 2).defaultTo(0)
    
    // Win rate calculation
    table.decimal('win_rate', 5, 2).defaultTo(0) // Percentage
    
    // Social statistics
    table.integer('clubs_joined').defaultTo(0)
    table.integer('bets_created').defaultTo(0)
    table.integer('total_likes_received').defaultTo(0)
    table.integer('total_comments_received').defaultTo(0)
    table.integer('total_shares_received').defaultTo(0)
    
    // Reputation system
    table.decimal('reputation_score', 5, 2).defaultTo(0) // 0-5 scale
    table.integer('reputation_votes').defaultTo(0)
    
    // Streaks and achievements
    table.integer('current_win_streak').defaultTo(0)
    table.integer('longest_win_streak').defaultTo(0)
    table.integer('current_loss_streak').defaultTo(0)
    table.integer('longest_loss_streak').defaultTo(0)
    
    // Activity tracking
    table.timestamp('last_bet_at')
    table.timestamp('last_win_at')
    table.timestamp('last_login_at')
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['user_id'])
    table.index(['win_rate'])
    table.index(['reputation_score'])
    table.index(['total_bets'])
    table.index(['net_profit'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_stats')
} 