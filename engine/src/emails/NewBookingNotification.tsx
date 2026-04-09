import { Html, Head, Preview, Body, Container, Section, Text, Hr, Button } from '@react-email/components';

interface Props {
  bookingId: string;
  customerName: string;
  venueName: string;
  date: string;
  totalPrice: number;
}

export default function NewBookingNotification({
  bookingId,
  customerName,
  venueName,
  date,
  totalPrice,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>New booking request received</Preview>
      <Body>
        <Container>
          <Section style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px' }}>
            <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>New Booking Request!</Text>

            <Text><strong>Booking ID:</strong> {bookingId}</Text>
            <Text><strong>Customer:</strong> {customerName}</Text>
            <Text><strong>Venue:</strong> {venueName}</Text>
            <Text><strong>Date:</strong> {date}</Text>
            <Text><strong>Total:</strong> SBD {totalPrice}</Text>

            <Hr />

            <Button href="https://yourdomain.com/dashboard/bookings" style={{ backgroundColor: '#000', color: '#fff', padding: '12px 24px', borderRadius: '6px' }}>
              Review in Dashboard
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}