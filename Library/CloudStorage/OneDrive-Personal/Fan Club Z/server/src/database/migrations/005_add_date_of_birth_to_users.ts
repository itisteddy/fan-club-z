import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table: Knex.TableBuilder) => {
    table.date('date_of_birth').notNullable().defaultTo('1900-01-01')
    table.index(['date_of_birth'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table: Knex.TableBuilder) => {
    table.dropColumn('date_of_birth')
  })
} 