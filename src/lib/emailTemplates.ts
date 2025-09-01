import type { SESEmailTemplate } from "./aws-ses";

export const EMAIL_TEMPLATES: Record<string, SESEmailTemplate> = {
  order_confirmed: {
    subject: "🎉 Order Confirmed! Your purchase is being processed",
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #059669; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your purchase</p>
          </div>
          <div class="content">
            <h2>Hi {{buyer_name}},</h2>
            <p>Great news! Your order has been confirmed and is being processed.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> {{order_id}}</p>
              <p><strong>Product:</strong> {{product_title}}</p>
              <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
              <p><strong>Status:</strong> <span style="color: #059669;">Confirmed</span></p>
            </div>
            
            <p>We'll notify you when your order ships. You can track your order status anytime.</p>
            
            <a href="{{action_url}}" class="button">View Order Details</a>
            
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2025 SneakInMarket. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textTemplate: `
Order Confirmed!

Hi {{buyer_name}},

Great news! Your order has been confirmed and is being processed.

Order Details:
- Order ID: {{order_id}}
- Product: {{product_title}}
- Amount: {{currency}} {{amount}}
- Status: Confirmed

We'll notify you when your order ships. You can track your order status anytime.

View Order Details: {{action_url}}

If you have any questions, please don't hesitate to contact our support team.

© 2025 SneakInMarket. All rights reserved.
    `,
  },

  order_shipped: {
    subject: "📦 Your order has been shipped!",
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #059669; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Order Shipped!</h1>
            <p>Your package is on its way</p>
          </div>
          <div class="content">
            <h2>Hi {{buyer_name}},</h2>
            <p>Exciting news! Your order has been shipped and is on its way to you.</p>
            
            <div class="order-details">
              <h3>Shipping Details</h3>
              <p><strong>Order ID:</strong> {{order_id}}</p>
              <p><strong>Product:</strong> {{product_title}}</p>
              <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
              <p><strong>Estimated Delivery:</strong> {{estimated_delivery}}</p>
            </div>
            
            <p>Track your package to see real-time updates on its location.</p>
            
            <a href="{{action_url}}" class="button">Track Order</a>
            
            <p>Your package should arrive within the estimated delivery time. We'll notify you once it's delivered!</p>
          </div>
          <div class="footer">
            <p>© 2025 SneakInMarket. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textTemplate: `
Order Shipped!

Hi {{buyer_name}},

Exciting news! Your order has been shipped and is on its way to you.

Shipping Details:
- Order ID: {{order_id}}
- Product: {{product_title}}
- Tracking Number: {{tracking_number}}
- Estimated Delivery: {{estimated_delivery}}

Track your package to see real-time updates on its location.

Track Order: {{action_url}}

Your package should arrive within the estimated delivery time. We'll notify you once it's delivered!

© 2025 SneakInMarket. All rights reserved.
    `,
  },

  payment_received: {
    subject: "💰 Payment Received! New order to fulfill",
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #059669; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payment Received!</h1>
            <p>New order to fulfill</p>
          </div>
          <div class="content">
            <h2>Hi {{seller_name}},</h2>
            <p>Congratulations! You have a new order to fulfill. Payment has been received and is secure.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> {{order_id}}</p>
              <p><strong>Product:</strong> {{product_title}}</p>
              <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
              <p><strong>Buyer:</strong> {{buyer_name}}</p>
              <p><strong>Shipping Address:</strong> {{shipping_address}}</p>
            </div>
            
            <p>Please process and ship this order within 24-48 hours to maintain good seller ratings.</p>
            
            <a href="{{action_url}}" class="button">View Order Details</a>
            
            <p>Remember to update the order status once shipped. Thank you for being part of our marketplace!</p>
          </div>
          <div class="footer">
            <p>© 2025 SneakInMarket. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textTemplate: `
Payment Received!

Hi {{seller_name}},

Congratulations! You have a new order to fulfill. Payment has been received and is secure.

Order Details:
- Order ID: {{order_id}}
- Product: {{product_title}}
- Amount: {{currency}} {{amount}}
- Buyer: {{buyer_name}}
- Shipping Address: {{shipping_address}}

Please process and ship this order within 24-48 hours to maintain good seller ratings.

View Order Details: {{action_url}}

Remember to update the order status once shipped. Thank you for being part of our marketplace!

© 2025 SneakInMarket. All rights reserved.
    `,
  },

  order_delivered: {
    subject: "✅ Your order has been delivered!",
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #059669; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Order Delivered!</h1>
            <p>Your package has arrived</p>
          </div>
          <div class="content">
            <h2>Hi {{buyer_name}},</h2>
            <p>Great news! Your order has been successfully delivered.</p>
            
            <div class="order-details">
              <h3>Delivery Details</h3>
              <p><strong>Order ID:</strong> {{order_id}}</p>
              <p><strong>Product:</strong> {{product_title}}</p>
              <p><strong>Delivery Date:</strong> {{delivery_date}}</p>
            </div>
            
            <p>We hope you love your purchase! Please take a moment to review the product and seller.</p>
            
            <a href="{{action_url}}" class="button">Review Product</a>
            
            <p>Your feedback helps other buyers make informed decisions and helps sellers improve their products.</p>
          </div>
          <div class="footer">
            <p>© 2025 SneakInMarket. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textTemplate: `
Order Delivered!

Hi {{buyer_name}},

Great news! Your order has been successfully delivered.

Delivery Details:
- Order ID: {{order_id}}
- Product: {{product_title}}
- Delivery Date: {{delivery_date}}

We hope you love your purchase! Please take a moment to review the product and seller.

Review Product: {{action_url}}

Your feedback helps other buyers make informed decisions and helps sellers improve their products.

© 2025 SneakInMarket. All rights reserved.
    `,
  },

  order_cancelled: {
    subject: "❌ Order Cancelled",
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6B7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #6B7280; }
          .button { display: inline-block; background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Order Cancelled</h1>
            <p>We're sorry to see you go</p>
          </div>
          <div class="content">
            <h2>Hi {{buyer_name}},</h2>
            <p>Your order has been cancelled as requested.</p>
            
            <div class="order-details">
              <h3>Cancelled Order</h3>
              <p><strong>Order ID:</strong> {{order_id}}</p>
              <p><strong>Product:</strong> {{product_title}}</p>
              <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
              <p><strong>Refund Status:</strong> Processing</p>
            </div>
            
            <p>If you paid for this order, a refund will be processed according to our refund policy.</p>
            
            <a href="{{action_url}}" class="button">View Refund Status</a>
            
            <p>We hope to see you again soon! If you have any questions about this cancellation, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2025 SneakInMarket. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textTemplate: `
Order Cancelled

Hi {{buyer_name}},

Your order has been cancelled as requested.

Cancelled Order:
- Order ID: {{order_id}}
- Product: {{product_title}}
- Amount: {{currency}} {{amount}}
- Refund Status: Processing

If you paid for this order, a refund will be processed according to our refund policy.

View Refund Status: {{action_url}}

We hope to see you again soon! If you have any questions about this cancellation, please contact our support team.

© 2025 SneakInMarket. All rights reserved.
    `,
  },
};

export default EMAIL_TEMPLATES;
