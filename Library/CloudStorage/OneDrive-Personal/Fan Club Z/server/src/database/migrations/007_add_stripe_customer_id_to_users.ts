import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table: Knex.TableBuilder) => {
    table.string('stripe_customer_id').unique()
    table.index(['stripe_customer_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table: Knex.TableBuilder) => {
    table.dropColumn('stripe_customer_id')
  })
} 