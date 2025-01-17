const Order = require('../../models/orderSchema');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');  
const fs = require('fs');

// Helper function to format date range
const getDateRange = (type) => {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    now.setHours(23,59,59,999)

    
    switch(type) {
        case 'daily':        
            start.setHours(0,0,0,0);
            break;
        case 'weekly':
            const dayOfWeek=now.getDay();
            const daysToMonday=dayOfWeek===0?6:dayOfWeek-1;
            start.setDate(now.getDate()-daysToMonday);
            start.setHours(0,0,0,0);
            break;
        case 'monthly':
            //start of the current month
            start.setDate(1);
            start.setHours(0,0,0,0);
            break;
        case 'yearly':
            start.setMonth(0);
            start.setDate(1);
            start.setHours(0,0,0,0);
            break;
        default:
            throw new Error(`Unknown report type: ${type}`)
    }
    
    return { start, end: now };
};

// Get sales report page
const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, reportType, page=1, limit=10 } = req.query;
        let dateRange;


        if (startDate && endDate) {
            dateRange = {
                start: new Date(startDate),
                end: new Date(endDate)
            };
        } else if (reportType) {
            dateRange = getDateRange(reportType);
        } else {
            dateRange = getDateRange('daily'); // Default to daily
        }

        //parse pagination parameters
        const currentPage=parseInt(page) || 1;
        const itemPerPage=parseInt(limit) ||10;

        const orders = await Order.find({
            createdAt: {
                $gte: dateRange.start,
                $lte: dateRange.end
            },
            status: 'Delivered' // Only count delivered orders
        }).populate('items.product')
        .skip((currentPage-1)*itemPerPage)
        .limit(itemPerPage);

        // Calculate statistics
        let totalOrdersCount = await Order.countDocuments({
            createdAt:{
                $gte:dateRange.start,
                $lte:dateRange.end
            },
            status:'Delivered'
        })
        let totalAmount = 0;
        let totalDiscount = 0;

        orders.forEach(order => {
            totalAmount += order.totalAmount;
            if (order.discount) {
                totalDiscount += order.discount;
            }
        });

        const totalAmountAfterDiscount=totalAmount-totalDiscount;

        const totalPages=Math.ceil(totalOrdersCount/itemPerPage);

        res.render('salesReport', {
            orders,
            totalOrders:totalOrdersCount,
            totalAmount,
            totalDiscount,
            totalAmountAfterDiscount,
            totalPages,
            currentPage,
            startDate: dateRange.start.toISOString().split('T')[0],
            endDate: dateRange.end.toISOString().split('T')[0],
            reportType: reportType || 'daily'
        });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).send('Error generating sales report');
    }
};

// Generate Excel report
const downloadExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await Order.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: 'Delivered'
        }).populate('items.product');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add headers
        worksheet.addRow([
            'Order ID',
            'Date',
            'Customer',
            'Products',
            'Amount',
            'Discount',
            'Final Amount'
        ]);

        // Initialize summary variables
        let totalSales = 0;
        let totalDiscounts = 0;
        let totalFinalAmount = 0;

        // Add data rows
        orders.forEach(order => {
            const finalAmount = order.totalAmount - (order.discount || 0);
            totalSales += order.totalAmount;
            totalDiscounts += order.discount || 0;
            totalFinalAmount += finalAmount;

            worksheet.addRow([
                order.orderId,
                order.createdAt.toLocaleDateString(),
                order.shippingAddress.name,
                order.items.map(item => `${item.product.name} (${item.quantity})`).join(', '),
                order.totalAmount,
                order.discount || 0,
                finalAmount
            ]);
        });

        // Add an empty row for spacing
        worksheet.addRow([]);
        
        // Add summary headers
        worksheet.addRow(['Summary']).font = { bold: true };
        
        // Add summary data
        worksheet.addRow(['Total Sales', totalSales]);
        worksheet.addRow(['Total Discounts', totalDiscounts]);
        worksheet.addRow(['Total Final Amount', totalFinalAmount]);

        // Style the worksheet
        worksheet.getRow(1).font = { bold: true }; // Make header row bold
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        // Adjust summary section styling
        worksheet.getRow(orders.length + 3).font = { bold: true }; // Summary title
        worksheet.getRow(orders.length + 4).font = { italic: true }; // Summary rows

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);

        // Write the Excel file to the response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).send('Error generating Excel report');
    }
};


// Generate PDF report
const downloadPDF = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orders = await Order.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: 'Delivered'
        }).populate('items.product');

        // Create a new PDF document with tables
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.pdf`);
        doc.pipe(res);

        // Add title and date range
        doc.font('Helvetica-Bold').fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();

        // Calculate summary
        let totalAmount = 0;
        let totalDiscount = 0;
        orders.forEach(order => {
            totalAmount += order.totalAmount;
            totalDiscount += order.discount || 0;
        });

        // Add summary table
        const summaryTable = {
            title: "Summary",
            headers: ["Total Orders", "Total Amount", "Total Discount", "Net Amount"],
            rows: [
                [
                    orders.length.toString(),
                    `₹${totalAmount.toFixed(2)}`,
                    `₹${totalDiscount.toFixed(2)}`,
                    `₹${(totalAmount - totalDiscount).toFixed(2)}`
                ]
            ]
        };

        // Add the summary table
        await doc.table(summaryTable, {
            width: 500,
            divider: {
                header: { disabled: false, width: 2, opacity: 1 },
                horizontal: { disabled: false, width: 1, opacity: 0.5 }
            },
            padding: 5,
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
            prepareRow: () => doc.font('Helvetica').fontSize(10)
        });

        doc.moveDown();

        // Prepare order details table
        const orderRows = orders.map(order => [
            order.orderId || order._id.toString().slice(-6),
            new Date(order.createdAt).toLocaleDateString(),
            order.shippingAddress.name,
            order.items.map(item => `${item.product.name} (${item.quantity})`).join('\n'),
            `₹${order.totalAmount.toFixed(2)}`,
            `₹${(order.discount || 0).toFixed(2)}`,
            `₹${(order.totalAmount - (order.discount || 0)).toFixed(2)}`
        ]);

        const orderTable = {
            title: "Order Details",
            headers: ["Order ID", "Date", "Customer", "Products", "Amount", "Discount", "Final Amount"],
            rows: orderRows
        };

        // Add the order details table
        await doc.table(orderTable, {
            width: 500,
            divider: {
                header: { disabled: false, width: 2, opacity: 1 },
                horizontal: { disabled: false, width: 1, opacity: 0.5 }
            },
            padding: 5,
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
            prepareRow: (row, indexRow) => {
                doc.font('Helvetica').fontSize(10);
                // Add zebra striping
                const backgroundColor = indexRow % 2 === 0 ? '#f5f5f5' : '#ffffff';
                return { backgroundColor };
            }
        });

        // Add footer
        doc.moveDown();
        doc.fontSize(8).text('Generated on: ' + new Date().toLocaleString(), { align: 'right' });

        doc.end();

    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).send('Error generating PDF report');
    }
};

module.exports = {
    getSalesReport,
    downloadExcel,
    downloadPDF
};
