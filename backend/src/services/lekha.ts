/**
 * lekha.ts (service) — a Toli's money, as the routes need it:
 *   peopleOf       name cards for the people an expense mentions (also those who have left)
 *   expenseViews   expenses as a member sees them (who paid, who shared what, may I delete it)
 *   memberBalance  one member's net position (positive = gets money back), group expenses only
 * The maths itself lives in lekhaRules.ts, shared with the website's demo mock.
 */
import { ToliExpense, User } from '../db/models/index.js';
import { avatarUrl } from '../db/toPublic.js';
import { balances, type Category, type PayMethod } from './lekhaRules.js';
import { isLeader, type ToliRole } from './toliRules.js';

/** Someone named in the Lekha. */
export interface Person {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

/** An expense as a member sees it. */
export interface ExpenseView {
  id: string;
  title: string;
  amount: number;
  category: Category;
  method: PayMethod;
  day?: number;
  personal: boolean;
  paidBy: Person;
  shares: { person: Person; amount: number }[];
  addedBy: Person;
  canDelete: boolean;
  createdAt: string;
}

/** A stored expense. */
type ExpenseDoc = InstanceType<typeof ToliExpense>;

/** Name cards for these user ids (someone no longer on TripWise shows as a former Sahyatri). */
export async function peopleOf(ids: string[]): Promise<(id: string) => Person> {
  const users = await User.find({ _id: { $in: [...new Set(ids)] } }, { name: 1, username: 1, avatar: 1 }).lean();
  const byId = new Map(
    users.map((u) => [u._id.toString(), { id: u._id.toString(), name: u.name, username: u.username ?? '', ...(u.avatar ? { avatarUrl: avatarUrl(u._id.toString(), u.avatar.version) } : {}) }]),
  );
  return (id) => byId.get(id) ?? { id, name: 'Former Sahyatri', username: '' };
}

/** Each part of an expense, in the order it was split. */
export function partsOf(e: ExpenseDoc): Record<string, number> {
  return Object.fromEntries(e.parts ?? new Map());
}

/** Expenses as `viewerId` (with `role`) sees them. */
export async function expenseViews(expenses: ExpenseDoc[], viewerId: string, role: ToliRole): Promise<ExpenseView[]> {
  const person = await peopleOf(expenses.flatMap((e) => [e.paidBy, e.addedBy, ...Object.keys(partsOf(e))]));
  return expenses.map((e) => ({
    id: e._id.toString(),
    title: e.title,
    amount: e.amount,
    category: e.category as Category,
    method: e.method as PayMethod,
    ...(e.day ? { day: e.day } : {}),
    personal: e.personal,
    paidBy: person(e.paidBy),
    shares: Object.entries(partsOf(e)).map(([id, amount]) => ({ person: person(id), amount })),
    addedBy: person(e.addedBy),
    // Group: whoever added it, or leaders. Personal: only ever shown to its owner.
    canDelete: e.personal || e.addedBy === viewerId || isLeader(role),
    createdAt: e.createdAt.toISOString(),
  }));
}

/** The group expenses still counted (not deleted). */
export async function groupExpenses(toliId: string) {
  return ToliExpense.find({ toliId, personal: false, deletedAt: { $exists: false } }).sort({ createdAt: 1 });
}

/** One member's net position in the Toli (0 = settled). */
export async function memberBalance(toliId: string, userId: string): Promise<number> {
  const net = balances(
    (await groupExpenses(toliId)).map((e) => ({ paidBy: e.paidBy, parts: partsOf(e) })),
    [],
  );
  return net[userId] ?? 0;
}
