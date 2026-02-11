import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from './schema';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

const SALT_ROUNDS = 12;

// Initial user data
const seedUsers = [
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', // Fixed UUID for user1
    email: 'user1@leadnex.com',
    password: 'ChangeMe123!', // Will be hashed
    firstName: 'John',
    lastName: 'Doe',
    role: 'user' as const,
  },
  {
    id: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', // Fixed UUID for user2
    email: 'user2@leadnex.com',
    password: 'ChangeMe123!', // Will be hashed
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'user' as const,
  },
  {
    id: 'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', // Fixed UUID for admin
    email: 'admin@leadnex.com',
    password: 'Admin@123!', // Will be hashed
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
  },
];

async function seedUsersTable() {
  console.log('🌱 Starting user seed...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    console.log('🔐 Hashing passwords...');
    
    // Hash all passwords
    const usersWithHashedPasswords = await Promise.all(
      seedUsers.map(async (user) => {
        const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
        return {
          id: user.id,
          email: user.email,
          passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: 'active' as const,
        };
      })
    );

    console.log('✅ Passwords hashed successfully\n');

    // Insert users
    console.log('👥 Inserting users...');
    for (const user of usersWithHashedPasswords) {
      try {
        await db.insert(users).values(user);
        console.log(`  ✅ ${user.email} (${user.role})`);
      } catch (error: any) {
        if (error.code === '23505') {
          // Unique constraint violation - user already exists
          console.log(`  ⚠️  ${user.email} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n📊 Seed Summary:');
    console.log('================');
    console.log('User Credentials (save these!):');
    console.log('--------------------------------');
    console.log('User 1:');
    console.log(`  Email: ${seedUsers[0].email}`);
    console.log(`  Password: ${seedUsers[0].password}`);
    console.log(`  ID: ${seedUsers[0].id}`);
    console.log('');
    console.log('User 2:');
    console.log(`  Email: ${seedUsers[1].email}`);
    console.log(`  Password: ${seedUsers[1].password}`);
    console.log(`  ID: ${seedUsers[1].id}`);
    console.log('');
    console.log('Admin:');
    console.log(`  Email: ${seedUsers[2].email}`);
    console.log(`  Password: ${seedUsers[2].password}`);
    console.log(`  ID: ${seedUsers[2].id}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords after first login!');
    console.log('================\n');

    console.log('✅ User seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedUsersTable()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
