import nodemailer from 'nodemailer';

// Helper to create mail transporter
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

/**
 * Send branded order confirmation email to customer
 * @param {Object} order - Complete order document
 */
export const sendOrderConfirmationEmail = async (order) => {
  try {
    const transporter = createTransporter();

    // Format items list
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6da;">
            <strong style="color: #2A2220; font-size: 15px;">${item.name}</strong><br/>
            <span style="color: #666; font-size: 13px;">Size: ${item.size || 'Standard'} | Color: ${item.color || 'As Shown'}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6da; text-align: center; color: #2A2220;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0e6da; text-align: right; color: #731F26; font-weight: bold;">
            ₹${item.subtotal?.toLocaleString('en-IN')}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 20px; color: #2A2220; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #D9AE79; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: #731F26; padding: 30px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 26px; letter-spacing: 2px; font-weight: 700; }
          .header p { margin: 6px 0 0; font-size: 14px; color: #D9AE79; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 30px; }
          .order-badge { background: #F2E8DC; color: #731F26; padding: 6px 14px; border-radius: 20px; display: inline-block; font-weight: bold; font-size: 13px; margin-bottom: 15px; }
          .address-card { background: #FDFBF8; border: 1px solid #EBE4DC; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.5; }
          .totals-table { width: 100%; margin-top: 15px; border-collapse: collapse; }
          .totals-table td { padding: 6px 12px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #731F26; border-top: 2px solid #731F26; }
          .footer { background: #F2E8DC; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KALAVATRI</h1>
            <p>Handcrafted Leather Juttis</p>
          </div>
          <div class="content">
            <span class="order-badge">Order Confirmed</span>
            <h2 style="margin-top: 0; color: #2A2220;">Thank you for your order, ${order.customer?.name}!</h2>
            <p style="color: #555; line-height: 1.6;">
              We have received your order <strong>#${order.orderNumber}</strong>. Our artisans are now crafting your footwear with utmost care and heritage craftsmanship.
            </p>

            <div class="address-card">
              <strong style="color: #731F26;">📍 Delivery Address:</strong><br/>
              ${order.customer?.name}<br/>
              ${order.shippingAddress?.addressLine1}<br/>
              ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br/>' : ''}
              ${order.shippingAddress?.city}, ${order.shippingAddress?.state} — ${order.shippingAddress?.pincode}<br/>
              Phone: +91 ${order.customer?.phone}
            </div>

            <h3 style="margin-bottom: 10px; border-bottom: 1px solid #D9AE79; padding-bottom: 6px; color: #731F26;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #FDFBF8; color: #666; font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 8px 12px; text-align: left;">Item</th>
                  <th style="padding: 8px 12px; text-align: center;">Qty</th>
                  <th style="padding: 8px 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="text-align: right; color: #666;">Subtotal:</td>
                <td style="text-align: right; width: 100px;">₹${order.subtotal?.toLocaleString('en-IN')}</td>
              </tr>
              ${
                order.discount > 0
                  ? `<tr>
                      <td style="text-align: right; color: #16a34a;">Discount:</td>
                      <td style="text-align: right; color: #16a34a;">-₹${order.discount?.toLocaleString('en-IN')}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="text-align: right; color: #666;">Delivery:</td>
                <td style="text-align: right; color: #16a34a; font-weight: bold;">FREE</td>
              </tr>
              <tr class="grand-total">
                <td style="text-align: right; padding-top: 12px;">Total Paid:</td>
                <td style="text-align: right; padding-top: 12px;">₹${order.totalAmount?.toLocaleString('en-IN')}</td>
              </tr>
            </table>

            <p style="margin-top: 30px; font-size: 13px; color: #777; line-height: 1.5;">
              <strong>Courier Dispatch:</strong> Your order will be dispatched within 2–4 business days. You will receive an SMS and courier tracking update as soon as the package is handed over to the courier partner.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0;">KALAVATRI | support@kalavatri.in | kalavatri.in</p>
            <p style="margin: 5px 0 0; color: #888;">Handcrafted in India with pure artisan pride.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (transporter) {
      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Kalavatri'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
        to: order.customer.email,
        subject: `Your KALAVATRI Order Confirmation #${order.orderNumber}`,
        html: htmlContent,
      });
      console.log(`[Email] Order confirmation sent successfully to ${order.customer.email}`);
    } else {
      console.log(`[Email Stub] SMTP not configured. Order confirmation prepared for ${order.customer.email} (Order #${order.orderNumber})`);
    }
  } catch (error) {
    console.error(`[Email Error] Failed to send order confirmation email:`, error.message);
  }
};
