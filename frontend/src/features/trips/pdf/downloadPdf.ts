/**
 * downloadPdf.ts — turn a trip into a PDF and save it ("TripWise-Goa-2026-12-12.pdf").
 * The PDF library (~500 KB) and the document are imported only now, when the traveller
 * asks for a PDF, so they never slow down the rest of the app.
 */
import { createElement } from 'react';
import type { Itinerary } from '@/lib/api/types';

/** Build the PDF in the browser and trigger a download. */
export async function downloadPdf(itinerary: Itinerary) {
  const [{ pdf }, { ItineraryPdf }] = await Promise.all([import('@react-pdf/renderer'), import('./ItineraryPdf')]);
  // react-pdf's types expect a <Document> element; ItineraryPdf renders one.
  const element = createElement(ItineraryPdf, { itinerary }) as unknown as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = itinerary.request.destination.replace(/[^\w-]+/g, '-');
  link.href = url;
  link.download = `TripWise-${safeName}-${itinerary.request.startDate}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the memory.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
