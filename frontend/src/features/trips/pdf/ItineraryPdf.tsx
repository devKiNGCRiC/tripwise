/**
 * ItineraryPdf.tsx — the printable trip (A4) made with @react-pdf/renderer: a title band,
 * dates and travellers, each day with its timed stops and transfers, the cost breakdown,
 * tips and the packing list. Uses the PDF built-in Helvetica (no font download), which
 * has no ₹ glyph — so money is written "Rs. 10,900".
 * Only ever loaded on demand by downloadPdf.ts (kept out of the main bundle).
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Itinerary } from '@/lib/api/types';
import { dayLabel, PACE_LABEL, rangeLabel, transferLabel, TRAVELLER_LABEL } from '../format';

/** "Rs. 10,900" (Indian digit grouping, PDF-safe). */
const rupees = (amount: number) => `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;

/** Colours and spacing for the printed page. */
const ink = '#121417';
const soft = '#55595f';
const accent = '#2f6f9f';
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10.5, color: ink, lineHeight: 1.45 },
  band: { borderBottomWidth: 2, borderBottomColor: accent, paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 9, color: accent, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold' },
  meta: { color: soft, marginTop: 4 },
  summary: { marginTop: 8 },
  day: { marginBottom: 14 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#cfd3d8', paddingBottom: 3, marginBottom: 6 },
  dayTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: accent },
  row: { flexDirection: 'row', marginBottom: 2 },
  time: { width: 46, fontFamily: 'Helvetica-Bold' },
  what: { flex: 1 },
  bold: { fontFamily: 'Helvetica-Bold' },
  transfer: { marginLeft: 46, color: soft, fontSize: 9, marginBottom: 4 },
  section: { marginTop: 10 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 4 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', maxWidth: 260 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: soft, textAlign: 'center' },
});

/** The trip as a PDF document. */
export function ItineraryPdf({ itinerary }: { itinerary: Itinerary }) {
  const { request, estimatedCost: cost } = itinerary;
  return (
    <Document title={itinerary.title} author="TripWise" creator="TripWise">
      <Page size="A4" style={styles.page}>
        <View style={styles.band}>
          <Text style={styles.brand}>TRIPWISE · YOUR ITINERARY</Text>
          <Text style={styles.title}>{itinerary.title}</Text>
          <Text style={styles.meta}>
            {rangeLabel(request.startDate, request.endDate)} · {TRAVELLER_LABEL[request.travellers]} · {PACE_LABEL[request.pace]}
          </Text>
          <Text style={styles.summary}>{itinerary.summary}</Text>
        </View>

        {itinerary.days.map((day) => (
          <View key={day.dayNumber} style={styles.day} wrap={false}>
            <View style={styles.dayHead}>
              <Text style={styles.dayTitle}>
                Day {day.dayNumber} · {dayLabel(day.date)}
              </Text>
              <Text style={{ color: soft }}>{day.theme}</Text>
            </View>
            {day.activities.map((activity, i) => (
              <View key={i}>
                <View style={styles.row}>
                  <Text style={styles.time}>{activity.startTime ?? activity.time}</Text>
                  <Text style={styles.what}>
                    <Text style={styles.bold}>{activity.title}</Text> — {activity.description}
                    {activity.estCost ? ` (${rupees(activity.estCost)})` : ''}
                  </Text>
                </View>
                {activity.transfer && <Text style={styles.transfer}>→ {transferLabel(activity.transfer)}</Text>}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>ESTIMATED COST · {rupees(cost.total)}</Text>
          {(['stay', 'food', 'transport', 'activities'] as const).map((part) => (
            <View key={part} style={styles.costRow}>
              <Text>{part[0].toUpperCase() + part.slice(1)}</Text>
              <Text>{rupees(cost.breakdown[part])}</Text>
            </View>
          ))}
        </View>
        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>GOOD TO KNOW</Text>
          {itinerary.tips.map((tip) => (
            <Text key={tip}>• {tip}</Text>
          ))}
        </View>
        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>PACKING LIST</Text>
          <Text>{itinerary.packingList.join(' · ')}</Text>
        </View>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Planned with TripWise · page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
