import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table: Knex.TableBuilder) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('email').unique().notNullable()
    table.string('username').unique().notNullable()
    table.string('password_hash').notNullable()
    table.string('first_name').notNullable()
    table.string('last_name').notNullable()
    table.string('phone').notNullable()
    table.string('wallet_address').unique().notNullable()
    table.enum('kyc_level', ['none', 'basic', 'verified', 'premium']).defaultTo('none')
    table.decimal('wallet_balance', 15, 2).defaultTo(0)
    table.string('profile_image_url')
    table.string('cover_image_url')
    table.text('bio')
    table.boolean('is_active').defaultTo(true)
    table.boolean('is_verified').defaultTo(false)
    table.timestamp('email_verified_at')
    table.timestamp('phone_verified_at')
    table.timestamp('last_login_at')
    table.string('last_login_ip')
    table.jsonb('preferences').defaultTo('{}')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // Indexes for performance
    table.index(['email'])
    table.index(['username'])
    table.index(['wallet_address'])
    table.index(['kyc_level'])
    table.index(['created_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users')
} 