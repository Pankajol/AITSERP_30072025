export default function feedbackEmail(ticket, token) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || "";
  const feedbackLink = `${baseUrl}/feedback?token=${token}`;
  
  // undefined fix karne ke liye variables
  const ticketIdDisplay = ticket.ticketNo || ticket._id.toString().slice(-6);
  const subjectDisplay = ticket.subject || "No Subject";
  const agentName = ticket.agentId?.name || "Support Team";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; background:#f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background:linear-gradient(135deg, #2563eb, #1d4ed8); padding:30px; text-align:center; color:#ffffff;">
              <h1 style="margin:0; font-size:24px; font-weight:700;">Ticket Resolved</h1>
              <p style="margin:8px 0 0; font-size:15px; opacity:0.9;">Ref: #${ticketIdDisplay}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:35px 30px; color:#334155;">
           <p style="margin:0 0 15px; font-size:16px;">Hello,</p>

<p style="margin:0 0 20px; font-size:15px; line-height:1.6;">
  Your support ticket has been successfully resolved and is now in <b>Closed</b> status.
</p>

<div style="background:#fff7ed; border-left:4px solid #f97316; padding:16px; margin-bottom:25px; border-radius:4px;">
  <p style="margin:0; font-size:14px; color:#9a3412; font-weight:700;">
    📩 How to Reopen?
  </p>
  <p style="margin:5px 0 0; font-size:13px; color:#c2410c; line-height:1.4;">
    If you are not satisfied or the issue still persists, please do not create a new ticket.
    Simply <b>reply to this email</b>, and this ticket will automatically reopen.
  </p>
</div>


              <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:25px; font-size:14px;">
                <tr>
                  <td style="color:#64748b; width:100px;">Ticket ID:</td>
                  <td style="font-weight:600; color:#1e293b;">#${ticketIdDisplay}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;">Subject:</td>
                  <td style="font-weight:600; color:#1e293b;">${subjectDisplay}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;">Agent:</td>
                  <td style="font-weight:600; color:#1e293b;">${agentName}</td>
                </tr>
              </table>

              <p style="text-align:center; font-weight:700; font-size:15px; margin-bottom:15px; color:#1e293b;">
                Hume batayein aapka experience kaisa raha:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    ${ratingRow(5, "Excellent", feedbackLink)}
                    ${ratingRow(4, "Good", feedbackLink)}
                    ${ratingRow(3, "Average", feedbackLink)}
                    ${ratingRow(2, "Poor", feedbackLink)}
                    ${ratingRow(1, "Very Poor", feedbackLink)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f1f5f9; padding:20px; text-align:center; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0;">
              © ${new Date().getFullYear()} Support Team • Reply to this email to reopen ticket.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function ratingRow(stars, label, link) {
  const goldStars = "⭐".repeat(stars);
  const grayStars = "☆".repeat(5 - stars);
  return `
    <a href="${link}&rating=${stars}" style="display:block; text-decoration:none; background:#ffffff; border:1px solid #cbd5e1; padding:12px 16px; margin-bottom:8px; border-radius:10px; color:#334155; transition: 0.2s;">
      <table width="100%">
        <tr>
          <td style="font-size:20px;">${goldStars}<span style="color:#cbd5e1;">${grayStars}</span></td>
          <td align="right" style="font-size:14px; font-weight:500;">${label}</td>
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
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
// </head>

// <body style="
//   margin:0;
//   padding:0;
//   background:#f4f6f9;
//   font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
// ">

// <table width="100%" cellpadding="0" cellspacing="0">
// <tr>
// <td align="center" style="padding:32px 12px;">

// <!-- CARD -->
// <table width="100%" cellpadding="0" cellspacing="0" style="
//   max-width:560px;
//   background:#ffffff;
//   border-radius:14px;
//   box-shadow:0 10px 30px rgba(0,0,0,0.08);
//   overflow:hidden;
// ">

// <!-- HEADER -->
// <tr>
// <td style="
//   background:linear-gradient(135deg,#0b5ed7,#2563eb);
//   padding:28px;
//   text-align:center;
//   color:#ffffff;
// ">
//   <h2 style="margin:0;font-size:22px;font-weight:700;">
//     Rate Your Support Experience
//   </h2>
//   <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">
//     Your feedback helps us improve
//   </p>
// </td>
// </tr>

// <!-- BODY -->
// <tr>
// <td style="padding:28px;color:#1f2937;">

// <p style="margin:0 0 16px;font-size:15px;">
// Hello,<br/>
// We’d really appreciate your feedback on the support you received.
// </p>

// <!-- TICKET DETAILS -->
// <table width="100%" cellpadding="10" cellspacing="0" style="
//   background:#f9fafb;
//   border-radius:10px;
//   margin-bottom:20px;
//   font-size:14px;
// ">
// <tr>
//   <td><b>Ticket ID:</b> ${ticket.ticketNo || ticket.name}</td>
// </tr>
// <tr>
//   <td><b>Subject:</b> ${ticket.subject}</td>
// </tr>
// </table>

// <!-- AGENT -->
// <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
// <tr>
// <td style="padding-right:12px;">
// <img src="${ticket.agent?.photo || "https://via.placeholder.com/56"}"
//   width="56" height="56"
//   style="border-radius:50%;display:block;"
// />
// </td>
// <td>
// <div style="font-weight:600;font-size:15px;">
// ${ticket.agent?.name || "Support Agent"}
// </div>
// <div style="font-size:13px;color:#6b7280;">
// Handled your request
// </div>
// </td>
// </tr>
// </table>

// <p style="
//   font-weight:600;
//   font-size:15px;
//   margin-bottom:12px;
// ">
// How satisfied are you?
// </p>

// <!-- STAR RATING -->
// <table width="100%" cellpadding="0" cellspacing="0">
// <tr>
// <td align="center">

// ${ratingStar(5, "Excellent", feedbackLink)}
// ${ratingStar(4, "Good", feedbackLink)}
// ${ratingStar(3, "Average", feedbackLink)}
// ${ratingStar(2, "Poor", feedbackLink)}
// ${ratingStar(1, "Very Poor", feedbackLink)}

// </td>
// </tr>
// </table>

// <p style="
//   margin-top:20px;
//   font-size:12px;
//   color:#6b7280;
//   text-align:center;
// ">
// Click a rating to add optional comments.<br/>
// No login required.
// </p>

// </td>
// </tr>

// <!-- FOOTER -->
// <tr>
// <td style="
//   background:#f3f4f6;
//   padding:16px;
//   text-align:center;
//   font-size:12px;
//   color:#6b7280;
// ">
// © ${new Date().getFullYear()} Support Team • Thank you for your time
// </td>
// </tr>

// </table>
// <!-- END CARD -->

// </td>
// </tr>
// </table>

// </body>
// </html>
// `;
// }

// /* ============================
//    Modern Email-safe Star Button
// ============================ */
// function ratingStar(stars, label, link) {
//   return `
// <a href="${link}&rating=${stars}"
// style="
//   display:inline-block;
//   width:92%;
//   max-width:420px;
//   margin:6px 0;
//   padding:14px;
//   background:#ffffff;
//   border:1px solid #e5e7eb;
//   border-radius:12px;
//   text-decoration:none;
//   color:#111827;
// ">
// <table width="100%" cellpadding="0" cellspacing="0">
// <tr>
// <td style="font-size:20px;">
// ${"⭐".repeat(stars)}
// </td>
// <td align="right" style="font-size:13px;color:#6b7280;">
// ${label}
// </td>
// </tr>
// </table>
// </a>
// `;
// }



