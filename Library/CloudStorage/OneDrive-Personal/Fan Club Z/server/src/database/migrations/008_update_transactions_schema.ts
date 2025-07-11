import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Check if columns exist before adding them
  const hasCurrency = await knex.schema.hasColumn('transactions', 'currency')
  const hasReference = await knex.schema.hasColumn('transactions', 'reference')
  const hasFromUserId = await knex.schema.hasColumn('transactions', 'from_user_id')
  const hasToUserId = await knex.schema.hasColumn('transactions', 'to_user_id')
  const hasBetId = await knex.schema.hasColumn('transactions', 'bet_id')
  const hasPaymentIntentId = await knex.schema.hasColumn('transactions', 'payment_intent_id')

  return knex.schema.alterTable('transactions', (table: Knex.TableBuilder) => {
    // Add missing columns to match the expected schema
    if (!hasCurrency) {
      table.string('currency').defaultTo('USD')
    }
    if (!hasReference) {
      table.string('reference').notNullable().defaultTo('')
    }
    if (!hasFromUserId) {
      table.uuid('from_user_id').references('id').inTable('users')
    }
    if (!hasToUserId) {
      table.uuid('to_user_id').references('id').inTable('users')
    }
    if (!hasBetId) {
      table.uuid('bet_id').references('id').inTable('bets')
    }
    if (!hasPaymentIntentId) {
      table.string('payment_intent_id')
    }
    
    // Note: We'll skip the type column modification for now since it already exists
    // The type enum can be updated separately if needed
    
    // Add indexes for new columns (only if they were added)
    if (!hasCurrency) {
      table.index(['currency'])
    }
    if (!hasPaymentIntentId) {
      table.index(['payment_intent_id'])
    }
    if (!hasFromUserId) {
      table.index(['from_user_id'])
    }
    if (!hasToUserId) {
      table.index(['to_user_id'])
    }
    if (!hasBetId) {
      table.index(['bet_id'])
    }
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('transactions', (table: Knex.TableBuilder) => {
    table.dropColumn('currency')
    table.dropColumn('reference')
    table.dropColumn('from_user_id')
    table.dropColumn('to_user_id')
    table.dropColumn('bet_id')
    table.dropColumn('payment_intent_id')
    
    // Revert type enum
    table.dropColumn('type')
    table.enum('type', ['deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost', 'refund', 'bonus', 'fee']).notNullable()
  })
} 