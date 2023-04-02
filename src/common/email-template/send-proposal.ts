import { ServiceRequest } from 'src/entities/service-request.entity';
import { User } from 'src/entities/user.entity';

export function sendProposal({
  email,
  firstName,
  serviceRequest,
  sp,
}: {
  email: string;
  firstName: string;
  serviceRequest: ServiceRequest;
  sp: User;
}) {
  const clientName = 'RunX';
  const emailMessage = {
    from: `runX <noreply@runx.com>`,
    to: `${email}`,
    subject: `Service Request Proposal`,
    html: `    
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Service request Proposal</title>
              </head>
              <body>
                <h2>Hi ${firstName},</h2>
                <p>You have recieved a proposal from ${sp.last_name} to your job posting <strong>${serviceRequest.description}
                </strong></p>
                <p>Please use the following token to activate your account:</p>
                <p><b></b></p>
                <p>If you have any questions, please do not hesitate to reach out to us at support@your-site.com</p>
                <br>
                <p>Best regards,</p>
                <p>${clientName} Team</p>  
              </body>
            </html>
	
    `,
  };
  return emailMessage;
}
