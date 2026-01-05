export default function feedbackEmail(ticket, token) {
  const baseUrl =
    process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";

  const feedbackLink = `${baseUrl}/feedback?token=${token}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f6f9;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:32px 12px;">

<!-- CARD -->
<table width="100%" cellpadding="0" cellspacing="0" style="
  max-width:560px;
  background:#ffffff;
  border-radius:14px;
  box-shadow:0 10px 30px rgba(0,0,0,0.08);
  overflow:hidden;
">

<!-- HEADER -->
<tr>
<td style="
  background:linear-gradient(135deg,#0b5ed7,#2563eb);
  padding:28px;
  text-align:center;
  color:#ffffff;
">
  <h2 style="margin:0;font-size:22px;font-weight:700;">
    Rate Your Support Experience
  </h2>
  <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">
    Your feedback helps us improve
  </p>
</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:28px;color:#1f2937;">

<p style="margin:0 0 16px;font-size:15px;">
Hello,<br/>
We’d really appreciate your feedback on the support you received.
</p>

<!-- TICKET DETAILS -->
<table width="100%" cellpadding="10" cellspacing="0" style="
  background:#f9fafb;
  border-radius:10px;
  margin-bottom:20px;
  font-size:14px;
">
<tr>
  <td><b>Ticket ID:</b> ${ticket.ticketNo || ticket.name}</td>
</tr>
<tr>
  <td><b>Subject:</b> ${ticket.subject}</td>
</tr>
</table>

<!-- AGENT -->
<table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="padding-right:12px;">
<img src="${ticket.agent?.photo || "https://via.placeholder.com/56"}"
  width="56" height="56"
  style="border-radius:50%;display:block;"
/>
</td>
<td>
<div style="font-weight:600;font-size:15px;">
${ticket.agent?.name || "Support Agent"}
</div>
<div style="font-size:13px;color:#6b7280;">
Handled your request
</div>
</td>
</tr>
</table>

<p style="
  font-weight:600;
  font-size:15px;
  margin-bottom:12px;
">
How satisfied are you?
</p>

<!-- STAR RATING -->
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

${ratingStar(5, "Excellent", feedbackLink)}
${ratingStar(4, "Good", feedbackLink)}
${ratingStar(3, "Average", feedbackLink)}
${ratingStar(2, "Poor", feedbackLink)}
${ratingStar(1, "Very Poor", feedbackLink)}

</td>
</tr>
</table>

<p style="
  margin-top:20px;
  font-size:12px;
  color:#6b7280;
  text-align:center;
">
Click a rating to add optional comments.<br/>
No login required.
</p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="
  background:#f3f4f6;
  padding:16px;
  text-align:center;
  font-size:12px;
  color:#6b7280;
">
© ${new Date().getFullYear()} Support Team • Thank you for your time
</td>
</tr>

</table>
<!-- END CARD -->

</td>
</tr>
</table>

</body>
</html>
`;
}

/* ============================
   Modern Email-safe Star Button
============================ */
function ratingStar(stars, label, link) {
  return `
<a href="${link}&rating=${stars}"
style="
  display:inline-block;
  width:92%;
  max-width:420px;
  margin:6px 0;
  padding:14px;
  background:#ffffff;
  border:1px solid #e5e7eb;
  border-radius:12px;
  text-decoration:none;
  color:#111827;
">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-size:20px;">
${"⭐".repeat(stars)}
</td>
<td align="right" style="font-size:13px;color:#6b7280;">
${label}
</td>
</tr>
</table>
</a>
`;
}




// export default function feedbackEmail(ticket, token) {
//   const baseUrl =
//     process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";

//   const feedbackLink = `${baseUrl}/feedback?token=${token}`;

//   return `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="UTF-8" />
// </head>

// <body style="
//   margin:0;
//   padding:0;
//   background:#f4f6f8;
//   font-family: Arial, Helvetica, sans-serif;
// ">

// <table width="100%" cellpadding="0" cellspacing="0">
//   <tr>
//     <td align="center" style="padding:30px 10px;">

//       <!-- CARD -->
//       <table width="100%" cellpadding="0" cellspacing="0" style="
//         max-width:560px;
//         background:#ffffff;
//         border-radius:10px;
//         box-shadow:0 4px 10px rgba(0,0,0,0.08);
//         overflow:hidden;
//       ">

//         <!-- HEADER -->
//         <tr>
//           <td style="
//             background:#0b5ed7;
//             color:#ffffff;
//             padding:22px;
//             text-align:center;
//           ">
//             <h2 style="margin:0;font-size:22px;">
//               How was our support?
//             </h2>
//           </td>
//         </tr>

//         <!-- BODY -->
//         <tr>
//           <td style="padding:26px;color:#333333;">

//             <p style="margin:0 0 14px;">
//               We’d love to hear your feedback on your recent support experience.
//             </p>

//             <!-- TICKET INFO -->
//             <table width="100%" cellpadding="6" cellspacing="0" style="
//               background:#f8f9fb;
//               border-radius:6px;
//               margin-bottom:18px;
//             ">
//               <tr>
//                 <td><b>Ticket No:</b> ${ticket.ticketNo || ticket.name}</td>
//               </tr>
//               <tr>
//                 <td><b>Subject:</b> ${ticket.subject}</td>
//               </tr>
//             </table>

//             <!-- AGENT INFO -->
//             <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
//               <tr>
//                 <td style="padding-right:10px;">
//                   <img
//                     src="${ticket.agent?.photo || "https://via.placeholder.com/48"}"
//                     width="48"
//                     height="48"
//                     style="border-radius:50%;display:block;"
//                   />
//                 </td>
//                 <td style="vertical-align:middle;">
//                   <div style="font-weight:600;">
//                     ${ticket.agent?.name || "Support Agent"}
//                   </div>
//                   <div style="font-size:12px;color:#666;">
//                     Handled your request
//                   </div>
//                 </td>
//               </tr>
//             </table>

//             <p style="font-weight:600;margin-bottom:10px;">
//               Please rate your experience:
//             </p>

//             <!-- RATING BUTTONS -->
//             <table width="100%" cellpadding="6" cellspacing="0">
//               <tr>
//                 <td align="center">

//                   ${ratingBtn(5, "Excellent", feedbackLink)}
//                   ${ratingBtn(4, "Good", feedbackLink)}
//                   ${ratingBtn(3, "Average", feedbackLink)}
//                   ${ratingBtn(2, "Poor", feedbackLink)}
//                   ${ratingBtn(1, "Very Poor", feedbackLink)}

//                 </td>
//               </tr>
//             </table>

//             <p style="
//               font-size:12px;
//               color:#777;
//               text-align:center;
//               margin-top:18px;
//             ">
//               Clicking a rating will open a short comment form.<br/>
//               No login required.
//             </p>

//           </td>
//         </tr>

//         <!-- FOOTER -->
//         <tr>
//           <td style="
//             background:#f1f3f5;
//             padding:14px;
//             text-align:center;
//             font-size:12px;
//             color:#777;
//           ">
//             Thank you for choosing our support team
//           </td>
//         </tr>

//       </table>
//       <!-- END CARD -->

//     </td>
//   </tr>
// </table>

// </body>
// </html>
//   `;
// }

// /* ===========================
//    Email-safe rating button
// =========================== */
// function ratingBtn(stars, label, link) {
//   return `
//     <a href="${link}&rating=${stars}"
//       style="
//         display:inline-block;
//         margin:6px 4px;
//         padding:10px 14px;
//         text-decoration:none;
//         background:#ffffff;
//         border:1px solid #dee2e6;
//         border-radius:8px;
//         color:#212529;
//         font-size:13px;
//       ">
//       <div style="font-size:18px;line-height:20px;">
//         ${"⭐".repeat(stars)}
//       </div>
//       <div style="font-size:11px;color:#555;">
//         ${label}
//       </div>
//     </a>
//   `;
// }
