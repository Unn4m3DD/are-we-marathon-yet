'use server';

import { db } from '@/db';
import { users, athleteProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validate as validateUUID } from 'uuid';

export async function signIn(userId: string) {
  if (!validateUUID(userId)) {
    return { success: false, error: 'Invalid UUID' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  return { success: true, userId };
}

export async function signUp(userId: string) {
  if (!validateUUID(userId)) {
    return { success: false, error: 'Invalid UUID' };
  }

  try {
    await db.insert(users).values({
      id: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(athleteProfiles).values({
      userId,
      distanceUnit: 'km',
      minRunDaysPerWeek: 2,
      maxRunDaysPerWeek: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, userId };
  } catch (error) {
    return { success: false, error: 'Failed to create user' };
  }
}