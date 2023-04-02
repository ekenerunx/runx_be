export function createTransactionPinMessage({
  email,
  firstName,
}: {
  email: string;
  firstName: string;
}) {
  const clientName = 'RunX';
  const emailMessage = {
    from: `runX <noreply@runx.com>`,
    to: `${email}`,
    subject: `Create Transaction Pin Success`,
    html: `    
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Transaction Pin Created Successfully</title>
    </head>
    <body>
      <p>Dear ${firstName}</p>
      <p>Your transaction pin has been successfully created.</p>
      <p>If you did not create this pin, please contact our customer support team immediately.</p>
      <br>
      <p>Thank you for choosing our service.</p>
      <p>Sincerely,</p>
      <p>${clientName} Team</p>
    </body>
    </html>
    
	
    `,
  };
  return emailMessage;
}
