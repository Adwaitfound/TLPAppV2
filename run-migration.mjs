import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function runMigration() {
    try {
        const migrationPath = path.join(process.cwd(), 'supabase/migrations/010_add_user_profile_fields.sql')
        const sql = fs.readFileSync(migrationPath, 'utf-8')

        console.log('Executing migration...')
        console.log(sql)

        const { error } = await supabase.rpc('exec', { sql })

        if (error) {
            console.error('Migration error:', error)
            process.exit(1)
        }

        console.log('Migration completed successfully!')
    } catch (err) {
        console.error('Error:', err)
        process.exit(1)
    }
}

runMigration()
