export default function feedbackEmail(ticket, token) {
  const link = `${process.env.APP_URL}/feedback?token=${token}`;

  return `
    <h2>How was our support?</h2>
    <p>Ticket: <b>${ticket.subject}</b></p>

    <p>Please rate us:</p>

    <p>
      <a href="${link}&rating=5">⭐⭐⭐⭐⭐</a><br/>
      <a href="${link}&rating=4">⭐⭐⭐⭐</a><br/>
      <a href="${link}&rating=3">⭐⭐⭐</a><br/>
      <a href="${link}&rating=2">⭐⭐</a><br/>
      <a href="${link}&rating=1">⭐</a>
    </p>
  `;
}
