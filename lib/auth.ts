'use server';

import { cookies } from 'next/headers';
import { getDb } from './db';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export async function signup(state: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const db = await getDb();
  
  // Check if email already exists
  const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email);
  if (existingUser) {
    return { error: 'Email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await db.run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      email,
      passwordHash
    );

    const userId = result.lastID;
    if (userId) {
      await createSession(userId);
    }
  } catch (e: any) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return { error: 'Email already exists' };
    }
    return { error: 'Failed to create user' };
  }

  redirect('/get-started');
}

export async function login(state: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);

  if (!user) {
    return { error: 'Invalid email or password' };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return { error: 'Invalid email or password' };
  }

  await createSession(user.id);
  redirect('/get-started');
}

async function createSession(userId: number) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days

  const db = await getDb();
  await db.run(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    sessionId,
    userId,
    expiresAt
  );

  const cookieStore = await cookies();
  cookieStore.set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  if (sessionId) {
    const db = await getDb();
    await db.run('DELETE FROM sessions WHERE id = ?', sessionId);
  }

  cookieStore.delete('session');
  redirect('/');
}

export async function getUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  if (!sessionId) {
    return null;
  }

  const db = await getDb();
  const session = await db.get(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ?',
    sessionId,
    Date.now()
  );

  if (!session) {
    return null;
  }

  const user = await db.get('SELECT id, email FROM users WHERE id = ?', session.user_id);
  return user;
}
