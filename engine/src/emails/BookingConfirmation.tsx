import { Html, Head, Preview, Body, Container, Section, Text, Hr } from '@react-email/components';

interface BookingConfirmationProps {
  bookingId: string;
  venueName: string;
  date: string;
  totalPrice: number;
}

export default function BookingConfirmation({
  bookingId,
  venueName,
  date,
  totalPrice,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Your booking request has been received</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ margin: '40px auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px' }}>
            <Text style={{ fontSize: '28px', fontWeight: 'bold' }}>Thank you!</Text>
            <Text>Your booking request has been successfully submitted.</Text>

            <Hr />

            <Text><strong>Booking ID:</strong> {bookingId}</Text>
            <Text><strong>Venue:</strong> {venueName}</Text>
            <Text><strong>Date:</strong> {date}</Text>
            <Text><strong>Total Amount:</strong> SBD {totalPrice}</Text>

            <Hr />

            <Text>We will review your request and get back to you within 24-48 hours.</Text>
            <Text>Thank you for choosing National Sports Council.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}