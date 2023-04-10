import { ServiceRequest } from 'src/entities/service-request.entity';
import { User } from 'src/entities/user.entity';

export function completeProposal({
  serviceProvider,
  serviceRequest,
  client,
}: {
  serviceProvider: User;
  serviceRequest: ServiceRequest;
  client: User;
}) {
  const clientName = 'RunX';
  const emailMessage = {
    from: `runX <noreply@runx.com>`,
    to: `${client.email}`,
    subject: `RUNX - Service Request Completed`,
    html: `    
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Service request Proposal</title>
              </head>
              <body>
                <h2>Hi ${client.first_name},</h2>
                <p>${serviceProvider.first_name} has marked your service request - <strong>${serviceRequest.description}
                </strong> as completed login to runX to acknowledge and release funds</p>
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
