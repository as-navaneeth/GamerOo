const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');

const dashboardController = {
    // Get sales data based on timeframe
    getSalesData: async (req, res) => {
        try {
            
            const timeFrame = req.query.timeFrame || 'monthly';
            const currentDate = new Date();
                        

            let startDate = new Date(2025, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            let groupFormat;
            let dateFormat;

            switch(timeFrame) {
                case 'yearly':
                    groupFormat = { 
                        year: { $year: "$createdAt" }, 
                        month: { $month: "$createdAt" }
                    };
                    dateFormat = (date) => {
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return monthNames[date.month - 1];
                    };
                    break;

                case 'monthly':
                    groupFormat = { 
                        year: { $year: "$createdAt" }, 
                        month: { $month: "$createdAt" }
                    };
                    dateFormat = (date) => {
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return monthNames[date.month - 1];
                    };
                    break;

                case 'weekly':
                    // Get start of current week (Monday)
                    startDate = new Date(currentDate);
                    startDate.setDate(currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1));
                    startDate.setHours(0, 0, 0, 0);
                    
                    groupFormat = {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                        dayOfWeek: { $dayOfWeek: "$createdAt" }
                    };
                    dateFormat = (date) => {
                        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        return days[date.dayOfWeek - 1];
                    };
                    break;

                case 'daily':
                    // Last 7 days
                    startDate = new Date(currentDate);
                    startDate.setDate(currentDate.getDate() - 6);
                    startDate.setHours(0, 0, 0, 0);
                    
                    groupFormat = {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    };
                    dateFormat = (date) => {
                        const d = new Date(2025, date.month - 1, date.day);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };
                    break;

                default:
                    return res.status(400).json({ error: "Invalid timeFrame. Use 'yearly', 'monthly', 'weekly', or 'daily'" });
            }

            // Set end date to current date
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            

            // Generate date array based on timeFrame
            const dateArray = [];
            const tempDate = new Date(startDate);
            
            while (tempDate <= endDate) {
                switch(timeFrame) {
                    case 'yearly':
                    case 'monthly':
                        if (timeFrame === 'yearly' || tempDate.getMonth() <= currentDate.getMonth()) {
                            dateArray.push({
                                year: tempDate.getFullYear(),
                                month: tempDate.getMonth() + 1
                            });
                        }
                        tempDate.setMonth(tempDate.getMonth() + 1);
                        break;

                    case 'weekly':
                        if (tempDate <= endDate) {
                            dateArray.push({
                                year: tempDate.getFullYear(),
                                month: tempDate.getMonth() + 1,
                                day: tempDate.getDate(),
                                dayOfWeek: tempDate.getDay() === 0 ? 7 : tempDate.getDay()
                            });
                        }
                        tempDate.setDate(tempDate.getDate() + 1);
                        break;

                    case 'daily':
                        if (tempDate <= endDate) {
                            dateArray.push({
                                year: tempDate.getFullYear(),
                                month: tempDate.getMonth() + 1,
                                day: tempDate.getDate()
                            });
                        }
                        tempDate.setDate(tempDate.getDate() + 1);
                        break;
                }
            }

            

            const matchStage = {
                createdAt: { 
                    $gte: startDate,
                    $lte: endDate
                },
                status: "Delivered"
            };

           

            const salesData = await Order.aggregate([
                {
                    $match: matchStage
                },
                {
                    $group: {
                        _id: groupFormat,
                        count: { $sum: 1 }
                    }
                },
                { $sort: { 
                    "_id.year": 1, 
                    "_id.month": 1,
                    "_id.day": 1
                }}
            ]);


            // Format the response with zero counts for dates with no sales
            const formattedData = dateArray.map(date => {
                const matchingData = salesData.find(data => {
                    switch(timeFrame) {
                        case 'yearly':
                        case 'monthly':
                            return data._id.year === date.year && data._id.month === date.month;
                        case 'weekly':
                            return data._id.year === date.year && 
                                   data._id.month === date.month && 
                                   data._id.day === date.day;
                        case 'daily':
                            return data._id.year === date.year && 
                                   data._id.month === date.month && 
                                   data._id.day === date.day;
                    }
                });
                return {
                    _id: date,
                    count: matchingData ? matchingData.count : 0
                };
            });


            // Format the response
            const labels = formattedData.map(data => dateFormat(data._id));
            const values = formattedData.map(data => data.count);

            const response = { labels, values };

            res.json(response);
        } catch (error) {
            console.error('Error in getSalesData:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ 
                error: error.message,
                stack: error.stack 
            });
        }
    },

    // Get top 10 selling products
    getTopProducts: async (req, res) => {
        try {
            const topProducts = await Order.aggregate([
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.product",
                        totalQuantity: { $sum: "$items.quantity" }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $project: {
                        name: "$productDetails.name",
                        value: "$totalQuantity",
                        _id: 0
                    }
                }
            ]);

            res.json(topProducts);
        } catch (error) {
            console.error("Error fetching top-selling products:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // Get top 10 categories
    getTopCategories: async (req, res) => {
        try {
            const topCategories = await Order.aggregate([
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: "products",
                        localField: "items.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $lookup: {
                        from: "categories",
                        localField: "productDetails.category",
                        foreignField: "_id",
                        as: "categoryDetails"
                    }
                },
                { $unwind: "$categoryDetails" },
                {
                    $group: {
                        _id: "$categoryDetails._id",
                        name: { $first: "$categoryDetails.name" },
                        value: { $sum: "$items.quantity" }
                    }
                },
                { $sort: { value: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        value: 1,
                        _id: 0
                    }
                }
            ]);

            res.json(topCategories);
        } catch (error) {
            console.error("Error fetching top categories:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // Get top 10 brands
    getTopBrands: async (req, res) => {
        try {
            const topBrands = await Order.aggregate([
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: "products",
                        localField: "items.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $lookup: {
                        from: "brands",
                        localField: "productDetails.brand",
                        foreignField: "_id",
                        as: "brandDetails"
                    }
                },
                { $unwind: "$brandDetails" },
                {
                    $group: {
                        _id: "$brandDetails._id",
                        name: { $first: "$brandDetails.brandName" },
                        value: { $sum: "$items.quantity" }
                    }
                },
                { $sort: { value: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: 1,
                        value: 1,
                        _id: 0
                    }
                }
            ]);

            res.json(topBrands);
        } catch (error) {
            console.error("Error fetching top brands:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = dashboardController;
