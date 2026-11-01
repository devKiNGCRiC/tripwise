/**
 * lekha.ts (service) — a Toli's money, as the routes need it:
 *   peopleOf       name cards for the people an expense mentions (also those who have left)
 *   expenseViews   expenses as a member sees them (who paid, who shared what, may I delete it)
 *   memberBalance  one member's net position (positive = gets money back), after settlements
 *   settlementViews / lekhaSummary   payments back, and everything the Lekha tab shows
 * The maths itself lives in lekhaRules.ts, shared with the website's demo mock.
 */
import { Itinerary, ToliExpense, ToliSettlement, User, type ToliDoc } from '../db/models/index.js';
import { avatarUrl } from '../db/toPublic.js';
import { balances, settleUp, totals, upiLink, type Category, type PayMethod } from './lekhaRules.js';
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

/** Everyone's net position in the Toli, after settlements. */
async function netOf(toliId: string) {
  const [expenses, settlements] = await Promise.all([groupExpenses(toliId), ToliSettlement.find({ toliId }).sort({ createdAt: -1, _id: -1 })]);
  const net = balances(
    expenses.map((e) => ({ paidBy: e.paidBy, parts: partsOf(e) })),
    settlements.map((s) => ({ from: s.from, to: s.to, amount: s.amount })),
  );
  return { expenses, settlements, net };
}

/** One member's net position in the Toli (0 = settled). */
export async function memberBalance(toliId: string, userId: string): Promise<number> {
  return (await netOf(toliId)).net[userId] ?? 0;
}

/** A payment back as members see it. */
export interface SettlementView {
  id: string;
  from: Person;
  to: Person;
  amount: number;
  method: PayMethod;
  recordedBy: Person;
  createdAt: string;
}

/** Stored settlements as members see them. */
export async function settlementViews(settlements: InstanceType<typeof ToliSettlement>[]): Promise<SettlementView[]> {
  const person = await peopleOf(settlements.flatMap((s) => [s.from, s.to, s.recordedBy]));
  return settlements.map((s) => ({
    id: s._id.toString(),
    from: person(s.from),
    to: person(s.to),
    amount: s.amount,
    method: s.method as PayMethod,
    recordedBy: person(s.recordedBy),
    createdAt: s.createdAt.toISOString(),
  }));
}

/** Everything the Lekha tab shows, as `viewerId` sees it (their personal spending only to them). */
export async function lekhaSummary(toli: ToliDoc, viewerId: string) {
  const toliId = toli._id.toString();
  const { expenses, settlements, net } = await netOf(toliId);
  const memberIds = toli.members.map((m) => m.userId.toString());
  const person = await peopleOf([...memberIds, ...Object.keys(net)]);
  const t = totals(expenses.map((e) => ({ amount: e.amount, category: e.category as Category, parts: partsOf(e) })));
  const mineOnly = await ToliExpense.find({ toliId, personal: true, addedBy: viewerId, deletedAt: { $exists: false } }, { amount: 1 }).lean();
  const personal = mineOnly.reduce((sum, e) => sum + e.amount, 0);
  const trip = toli.tripId ? await Itinerary.findById(toli.tripId, { 'estimatedCost.total': 1 }).lean() : null;
  // A Pay-with-UPI link only when the one being paid shared a UPI ID with this Toli.
  const upiOf = new Map(toli.members.flatMap((m) => (m.upi ? [[m.userId.toString(), m.upi] as const] : [])));
  const share = t.perPerson[viewerId] ?? 0;

  return {
    // Largest owed first.
    balances: memberIds.map((id) => ({ person: person(id), net: net[id] ?? 0 })).sort((a, b) => b.net - a.net || a.person.name.localeCompare(b.person.name)),
    settleUp: settleUp(net).map((p) => {
      const upi = upiOf.get(p.to);
      return {
        from: person(p.from),
        to: person(p.to),
        amount: p.amount,
        ...(upi ? { upiLink: upiLink({ upi, name: person(p.to).name, amount: p.amount, note: `${toli.name} · TripWise` }) } : {}),
      };
    }),
    totals: {
      total: t.total,
      byCategory: t.byCategory,
      perPerson: memberIds.map((id) => ({ person: person(id), share: t.perPerson[id] ?? 0 })),
      mine: { share, personal, total: share + personal },
      // The planner's estimate is in whole rupees; the Lekha counts paise.
      estimate: trip?.estimatedCost?.total !== undefined ? trip.estimatedCost.total * 100 : null,
    },
    settlements: await settlementViews(settlements),
  };
}
