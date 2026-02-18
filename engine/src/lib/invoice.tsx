// src/lib/invoice.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

// Define expected booking shape (adjust fields as needed)
interface BookingForInvoice {
  invoiceId: string;
  venueId: { name: string };
  facilityId: { name: string };
  startTime: string | Date;
  endTime: string | Date;
  contactName: string;
  contactEmail: string;
  basePrice: number;
  amenitySurcharge: number;
  totalPrice: number;
  selectedAmenities?: Array<{ name: string; surcharge: number }>;
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
});

// The PDF document component (this is the root)
function InvoiceDocument({ booking }: { booking: BookingForInvoice }) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text>National Sports Council - Invoice</Text>
          <Text>Honiara, Solomon Islands</Text>
        </View>

        {/* Invoice Info */}
        <View style={styles.section}>
          <Text>Invoice #{booking.invoiceId}</Text>
          <Text>Date: {new Date().toLocaleDateString()}</Text>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={{ fontSize: 14, marginBottom: 6 }}>Booking Details</Text>
          <View style={styles.row}>
            <Text>Venue:</Text>
            <Text>{booking.venueId.name} at {booking.facilityId.name}</Text>
          </View>
          <View style={styles.row}>
            <Text>Date/Time:</Text>
            <Text>
              {start.toLocaleString()} - {end.toLocaleString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Booked By:</Text>
            <Text>
              {booking.contactName} ({booking.contactEmail})
            </Text>
          </View>
        </View>

        {/* Pricing Summary */}
        <View style={styles.section}>
          <Text style={{ fontSize: 14, marginBottom: 6 }}>Pricing Summary</Text>
          <View style={styles.row}>
            <Text>
              Base Price ({hours} hours @ SBD {booking.venueId.pricePerHour || '—'}/hr):
            </Text>
            <Text>SBD {booking.basePrice.toFixed(2)}</Text>
          </View>

          {booking.selectedAmenities && booking.selectedAmenities.length > 0 && (
            <View style={styles.row}>
              <Text>Amenity Surcharge:</Text>
              <Text>SBD {booking.amenitySurcharge.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.bold}>Total:</Text>
            <Text style={styles.bold}>SBD {booking.totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for booking with NSC! For questions, contact admin@nsc.sb.
        </Text>
      </Page>
    </Document>
  );
}

// The export function that generates the PDF buffer
export async function generateInvoicePDF(booking: BookingForInvoice): Promise<Buffer> {
  const pdfInstance = pdf(<InvoiceDocument booking={booking} />);
  const buffer = await pdfInstance.toBuffer();
  return buffer;
}