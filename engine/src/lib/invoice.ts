import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Simple styles
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 },
  header: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
});

export async function generateInvoicePDF(booking: any): Promise<Buffer> {
  return await (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text>National Sports Council - Invoice</Text>
          <Text>Honiara, Solomon Islands</Text>
        </View>

        <View style={styles.section}>
          <Text>Invoice #{booking.invoiceId}</Text>
          <Text>Date: {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text>Booking Details</Text>
          <View style={styles.row}>
            <Text>Venue:</Text>
            <Text>{booking.venueId.name} at {booking.facilityId.name}</Text>
          </View>
          <View style={styles.row}>
            <Text>Date/Time:</Text>
            <Text>{new Date(booking.startTime).toLocaleString()} - {new Date(booking.endTime).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text>Booked By:</Text>
            <Text>{booking.contactName} ({booking.contactEmail})</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>Pricing Summary</Text>
          <View style={styles.row}>
            <Text>Base Price ({Math.ceil((booking.endTime - booking.startTime) / 3600000} hours @ SBD {booking.venueId.pricePerHour}/hr):</Text>
            <Text>SBD {booking.basePrice.toFixed(2)}</Text>
          </View>
          {booking.selectedAmenities.length > 0 && (
            <View style={styles.row}>
              <Text>Amenity Surcharge:</Text>
              <Text>SBD {booking.amenitySurcharge.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text><strong>Total:</strong></Text>
            <Text><strong>SBD {booking.totalPrice.toFixed(2)}</strong></Text>
          </View>
        </View>

        <Text style={{ position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center' }}>
          Thank you for booking with NSC! For questions, contact admin@nsc.sb.
        </Text>
      </Page>
    </Document>
  ).toBuffer();  // Convert to PDF buffer
}