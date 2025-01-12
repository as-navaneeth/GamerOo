const Order = require('../../models/orderSchema');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Helper function to format date range
const getDateRange = (type) => {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    now.setHours(23,59,59,999)
    console.log(now);
    
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

        console.log(req.query);

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
            }
        })
        let totalAmount = 0;
        let totalDiscount = 0;

        orders.forEach(order => {
            totalAmount += order.totalAmount;
            if (order.discount) {
                totalDiscount += order.discount;
            }
        });

        const totalPages=Math.ceil(totalOrdersCount/itemPerPage);

        res.render('salesReport', {
            orders,
            totalOrders:totalOrdersCount,
            totalAmount,
            totalDiscount,
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

        // Add data
        orders.forEach(order => {
            worksheet.addRow([
                order._id,
                order.createdAt.toLocaleDateString(),
                order.shippingAddress.name,
                order.items.map(item => `${item.product.name} (${item.quantity})`).join(', '),
                order.totalAmount,
                order.discount || 0,
                order.finalAmount
            ]);
        });

        // Style the worksheet
        worksheet.getRow(1).font = { bold: true };
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);

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

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.pdf`);
        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();

        // Add summary
        let totalAmount = 0;
        let totalDiscount = 0;
        orders.forEach(order => {
            totalAmount += order.totalAmount;
            totalDiscount += order.discount || 0;
        });

        doc.fontSize(14).text('Summary');
        doc.fontSize(12).text(`Total Orders: ${orders.length}`);
        doc.text(`Total Amount: ₹${totalAmount}`);
        doc.text(`Total Discount: ₹${totalDiscount}`);
        doc.text(`Net Amount: ₹${totalAmount - totalDiscount}`);
        doc.moveDown();

        // Add order details
        doc.fontSize(14).text('Order Details');
        doc.moveDown();

        orders.forEach(order => {
            doc.fontSize(12).text(`Order ID: ${order._id}`);
            doc.text(`Date: ${order.createdAt.toLocaleDateString()}`);
            doc.text(`Customer: ${order.shippingAddress.name}`);
            doc.text(`Amount: ₹${order.totalAmount}`);
            doc.text(`Discount: ₹${order.discount || 0}`);
            doc.text(`Final Amount: ₹${order.finalAmount}`);
            doc.moveDown();
        });

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
