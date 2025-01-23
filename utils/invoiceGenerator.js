const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateInvoice(order) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            
            // Create invoice directory if it doesn't exist
            const invoiceDir = path.join(__dirname, '../public/invoices');
            if (!fs.existsSync(invoiceDir)) {
                fs.mkdirSync(invoiceDir, { recursive: true });
            }

            const invoicePath = path.join(invoiceDir, `invoice-${order._id}.pdf`);
            const writeStream = fs.createWriteStream(invoicePath);

            // Pipe PDF to writeStream
            doc.pipe(writeStream);

            // Add logo
            doc.image(path.join(__dirname, '../public/img/GamerOo_project_fdfd-removebg-preview.png'), 50, 45, { width: 100 })
               .fontSize(20)
               .text('INVOICE', 275, 50)
               .moveDown();

            // Add company info
            doc.fontSize(10)
               .text('GamerOo', 50, 100)
               .text('Kochi', 50, 115)
               .text('Kerala', 50, 130)
               .text('India', 50, 145)
               .moveDown();

            // Add customer info
            doc.text(`Invoice Number: #${order.orderId}`, 50)
               .text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, 50)
               .text(`Customer: ${order.shippingAddress.name}`, 50)
               .text(`Address: ${order.shippingAddress.address}`, 50)
               .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`, 50)
               .text(`Phone: ${order.shippingAddress.phone}`, 50)
               .moveDown();

            // Add table header
            const tableTop = 300;
            doc.font('Helvetica-Bold');
            doc.text('Item', 50, tableTop)
               .text('Quantity', 250, tableTop)
               .text('Price', 350, tableTop)
               .text('Total', 450, tableTop);

            // Add items
            let position = tableTop + 25;
            doc.font('Helvetica');
            
            order.items.forEach(item => {
                doc.text(item.product.name, 50, position)
                   .text(item.quantity.toString(), 270, position)
                   .text(`RS:${item.price.toFixed(2)}`, 350, position)
                   .text(`RS:${(item.quantity * item.price).toFixed(2)}`, 450, position);
                position += 25;
            });

            // Add total
            const totalPosition = position + 25;
            doc.moveTo(50, totalPosition).lineTo(550, totalPosition).stroke();
            position = totalPosition + 10;

            doc.font('Helvetica-Bold');
            if (order.discount > 0) {
                doc.text('Subtotal:', 350, position)
                   .text(`RS:${(order.totalAmount + order.discount).toFixed(2)}`, 450, position);
                position += 25;
                doc.text('Discount:', 350, position)
                   .text(`-RS:${order.discount.toFixed(2)}`, 450, position);
                position += 25;
            }
            
            if (order.shippingCost > 0) {
                doc.text('Shipping:', 350, position)
                   .text(`RS:${order.shippingCost.toFixed(2)}`, 450, position);
                position += 25;
            }

            doc.text('Total:', 350, position)
               .text(`RS:${order.totalAmount.toFixed(2)}`, 450, position);

            // Add footer
            doc.fontSize(10)
               .text(
                   'Thank you for shopping with GamerOo. For any queries, please contact support@gameroo.com',
                   50,
                   700,
                   { align: 'center' }
               );

            // Finalize PDF
            doc.end();

            writeStream.on('finish', () => {
                resolve(invoicePath);
            });

            writeStream.on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateInvoice };
