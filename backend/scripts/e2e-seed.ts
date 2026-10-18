/**
 * e2e-seed.ts — for end-to-end testing only: give a test account one *finished* trip (the
 * planner rightly refuses past dates), so journals, stamps and marks can be tried for real.
 *
 *   npx tsx scripts/e2e-seed.ts someone@example.com
 *
 * Refuses to run in production.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Itinerary, User } from '../src/db/models/index.js';

if (process.env.NODE_ENV === 'production') {
  console.error('e2e-seed is for testing only and refuses to run in production.');
  process.exit(1);
}

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npx tsx scripts/e2e-seed.ts <email>');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI!);
const user = await User.findOne({ email });
if (!user) {
  console.error(`No account for ${email}`);
  process.exit(1);
}

/** "YYYY-MM-DD" n days from today. */
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const activity = (time: 'morning' | 'afternoon' | 'evening', startTime: string, title: string, last = false) => ({
  time,
  startTime,
  title,
  description: `Time at ${title}.`,
  estCost: 300,
  ...(last ? {} : { transfer: { mode: 'auto', minutes: 15 } }),
});

const trip = await Itinerary.create({
  ownerId: user._id,
  request: { destination: 'Goa', startDate: day(-30), endDate: day(-28), budget: { amount: 3000, currency: 'INR' }, travellers: 'couple', interests: ['food', 'relaxation'], pace: 'balanced' },
  title: '3 days in Goa',
  summary: 'Beaches, bebinca and Fontainhas.',
  days: [0, 1, 2].map((i) => ({
    dayNumber: i + 1,
    date: day(-30 + i),
    theme: ['Old Goa and Fontainhas', 'South Goa beaches', 'Markets and sunsets'][i],
    activities: [activity('morning', '09:00', 'Basilica of Bom Jesus'), activity('afternoon', '13:00', 'Fontainhas'), activity('evening', '18:00', 'Miramar Beach', true)],
  })),
  estimatedCost: { total: 21000, breakdown: { stay: 9000, food: 6000, transport: 3000, activities: 3000 }, currency: 'INR' },
  tips: ['Rent a scooter.'],
  packingList: ['Sunscreen'],
  provider: 'gemini',
  source: 'ai',
  region: 'konkan',
});
console.log(`Added a finished Goa trip (${trip._id}) for ${email}.`);
await mongoose.disconnect();
