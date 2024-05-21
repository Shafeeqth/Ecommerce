const mongoose = require('mongoose');
const ApiError = require('../utilities/apiError');
const ApiResponse = require('../utilities/apiResponse');
const asyncHandler = require('../utilities/asyncHandler');
const { Order, OrderReturn, Review } = require('../models/orderModels');
const Coupon = require('../models/couponModel');

const User = require('../models/userModel');
const Offer = require('../models/offerModel');
const Address = require('../models/addressModel');
const Category = require('../models/categoryModel');
const { Product, Inventory } = require('../models/productModels');
const { Cart, Wishlist } = require('../models/CartAndWishlistModel');
const { pipeline } = require('nodemailer/lib/xoauth2');
const Wallet = require('../models/walletModel');
const Banner = require('../models/bannerModel');
const Referrel = require('../models/referrelModel');
const Notification = require('../models/notificationModel');


const loadHome = asyncHandler(async (req, res) => {
    let user = req.session.user ? req.session.user : null;
    let banners = await Banner.find({ isListed: true })
    console.log(banners)

    res.status(200).render('user/homePage', {  banners });


})


const loadShop = asyncHandler(async (req, res) => {


    console.log(req.query)
    let user = req.session.user ? req.session.user : null;
    let page = parseInt(req.query.page) - 1 || 0;
    let limit = parseInt(req.query.limit) || 15;
    let category = (Array.isArray(req.query.Category) ? req.query.Category : req.query.Category?.split(' '));
    let size = req.query.size || [];
    let gender = (Array.isArray(req.query.Gender) ? req.query.Gender : req.query.Gender?.split(' '));
    let brand = (Array.isArray(req.query.Brands) ? req.query.Brands : req.query.Brands?.split(' '));
    let categor = [];
    if (gender) categor.push({ 'products.category.Gender': { $in: gender } });
    if (category) categor.push({ 'products.category.Category': { $in: category } })
    if (brand) categor.push({ 'products.category.Brands': { $in: brand } })
    let matchValue = {};
    let sort = req.query.sort?.trim() || ''

    let search = req.query.search ? String(req.query.search).trim() : ''
    search ? (search = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : (search = '')
    if (gender || category || brand) {
        matchValue = {
            $or: categor
        }
    }
    if (sort == 'high to Low') {
        sort = { 'minimumPrice': -1 }
    } else if (sort == 'low-to-High') sort = { 'minimumPrice': 1 }
    else if (sort == 'date') sort = { 'products.createdAt': -1 }
    else if (sort == 'rating' || sort == '') sort = { 'reviewAvg:': -1 }


    let categories = await Category.find({ isListed: true })

    let inventory = await Inventory.aggregate([
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'products',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }
        },
        {
            $unwind: '$products'
        },
        {
            $lookup: {
                from: 'reviews',
                localField: 'product',
                foreignField: 'product',
                as: 'reviews'
            }
        },
        {
            $lookup: {
                from: 'offers',
                localField: 'products._id',
                foreignField: 'productIds',
                as: 'productOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'offers',
                localField: 'products.category.Category',
                foreignField: 'appliedCategory',
                as: 'categoryOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }


        },
      
        {
            $addFields: {
                shouldUnwindCategory: {
                    $cond: [{
                        $eq: [{
                            $size: '$categoryOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                },
                shouldUnwindProduct: {
                    $cond: [{
                        $eq: [{
                            $size: '$productOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                }
            }

        },
        {
            $unwind: {
                path: '$productOffer',
                preserveNullAndEmptyArrays: true
            },
        },
        {
            $unwind: {
                path: '$categoryOffer',
                preserveNullAndEmptyArrays: true,
            }

        },
        {
            $addFields: {
                reviewAvg: {
                    $avg: '$reviews.rating'
                },
                totalStock: {
                    $sum: '$sizeVariant.stock'

                },

                categoryOfferPrice: {
                    $cond: [
                        '$shouldUnwindCategory',
                        {
                            $subtract: ['$products.price',
                                {
                                    $multiply: ['$products.price',
                                        {
                                            $divide: ['$categoryOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
                productOfferPrice: {
                    $cond: [
                        '$shouldUnwindProduct',
                        {
                            $subtract: ['$products.price',
                                {
                                    $multiply: ['$products.price',
                                        {
                                            $divide: ['$productOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
               
            }
        },
        {
            $addFields: {
                totalStock: {
                    $sum: '$sizeVariant.stock'
                },
                minimumPrice: {
                    $min: ['$productOfferPrice', '$categoryOfferPrice', '$products.price']
                },
                reviewAvg: {
                    $avg: '$reviews.rating'

                },
                category: {
                    $first: "$products.category.Gender"
                }


            }
        },
        {
            $project: {
                reviewCount: { $size: '$reviews' },
                reviewAvg: 1,
                sizeVariant: 1,
                totalStock: 1,
                category: 1,
                minimumPrice: 1,
                'products._id': 1,
                'products.title': 1,
                'products.category': 1,
                'products.mrpPrice': 1,
                'products.price': 1,
                'products.description': 1,
                'products.color': 1,
                'products.images': 1,
                'products.isListed': 1,
                'products.soldCount': 1,
                'products.avgRating': 1,
                'products.createdAt': 1,
                'products.updatedAt': 1
            }
        },     
        {
            $match: matchValue
        },
        {
            $match: {
                'products.title': { $regex: search, $options: "i" },

            }
        },
        {
            $sort: sort
        },
        {
            $skip: page * limit
        },
        {
            $limit: limit
        },
        
    ]);



    let count = await Product.countDocuments()

    res.render('user/shopPage', { inventory, count, categories });



})

const loadWishlist = asyncHandler(async (req, res) => {


    let user = req.session.user ? req.session.user : null;
    let wishlist = await Wishlist.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(user._id)

            }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'product'
            }

        },
       

        {
            $lookup: {
                from: 'offers',
                localField: 'product._id',
                foreignField: 'productIds',
                as: 'productOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'offers',
                localField: 'product.category.Category',
                foreignField: 'appliedCategory',
                as: 'categoryOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }


        },
        {
            $unwind: '$product'
        },
        {
            $addFields: {
                shouldUnwindCategory: {
                    $cond: [{
                        $eq: [{
                            $size: '$categoryOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                },
                shouldUnwindProduct: {
                    $cond: [{
                        $eq: [{
                            $size: '$productOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                }
            }

        },
        {
            $unwind: {
                path: '$productOffer',
                preserveNullAndEmptyArrays: true
            },
        },
        {
            $unwind: {
                path: '$categoryOffer',
                preserveNullAndEmptyArrays: true,
            }

        },
        {
            $addFields: {
              
                categoryOfferPrice: {
                    $cond: [
                        '$shouldUnwindCategory',
                        {
                            $subtract: ['$product.price',
                                {
                                    $multiply: ['$product.price',
                                        {
                                            $divide: ['$categoryOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
                productOfferPrice: {
                    $cond: [
                        '$shouldUnwindProduct',
                        {
                            $subtract: ['$product.price',
                                {
                                    $multiply: ['$product.price',
                                        {
                                            $divide: ['$productOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
               
            }
        },
        {
            $addFields: {
                minimumPrice: {
                    $min: ['$productOfferPrice', '$categoryOfferPrice', '$product.price']
                },
                
            },
           
        },
        
        {
            $project: {
                categoryOffer: 0,
                productOffer: 0,
                shouldUnwindCategory: 0,
                shouldUnwindProduct: 0

        
                
            }
        }

    ])


 

    res.render('user/wishlistPage', {  wishlist });





})

const loadCart = asyncHandler(async (req, res) => {


    let user = req.session.user ? req.session.user : null;
    let cart = await Cart.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(user._id)

            }
        },
        {
            $unwind: '$products'
        },
        {
            $lookup: {
                from: 'products',
                localField: 'products.product',
                foreignField: '_id',
                as: 'product',
            
            }

        },
       

        {
            $lookup: {
                from: 'offers',
                localField: 'product._id',
                foreignField: 'productIds',
                as: 'productOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'offers',
                localField: 'product.category.Category',
                foreignField: 'appliedCategory',
                as: 'categoryOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }


        },
        {
            $unwind: '$product'
        },
        {
            $addFields: {
                shouldUnwindCategory: {
                    $cond: [{
                        $eq: [{
                            $size: '$categoryOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                },
                shouldUnwindProduct: {
                    $cond: [{
                        $eq: [{
                            $size: '$productOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                }
            }

        },
        {
            $unwind: {
                path: '$productOffer',
                preserveNullAndEmptyArrays: true
            },
        },
        {
            $unwind: {
                path: '$categoryOffer',
                preserveNullAndEmptyArrays: true,
            }

        },
        {
            $addFields: {
              
                categoryOfferPrice: {
                    $cond: [
                        '$shouldUnwindCategory',
                        {
                            $subtract: ['$product.price',
                                {
                                    $multiply: ['$product.price',
                                        {
                                            $divide: ['$categoryOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
                productOfferPrice: {
                    $cond: [
                        '$shouldUnwindProduct',
                        {
                            $subtract: ['$product.price',
                                {
                                    $multiply: ['$product.price',
                                        {
                                            $divide: ['$productOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
               
            }
        },
        {
            $addFields: {
                minimumPrice: {
                    $round: [
                        {
                             $min: ['$productOfferPrice', '$categoryOfferPrice', '$product.price']
                            }
                        ]
                   
                },
                
            },
           
        },
        
        {
            $project: {
                categoryOffer: 0,
                productOffer: 0,
                shouldUnwindCategory: 0,
                shouldUnwindProduct: 0,
                

        
                
            }
        }

    ])
 

    res.render('user/cartPage', {  cart });


})

const loadCheckout = asyncHandler(async (req, res) => {
    // if(! req.session.allowedToCheckout) {
    //     return res.status(401)
    //     .redirect('/api/v1/')

    // }
    // const referrer = req.get('Referrer');
    // console.log(referrer)
    // if (!referrer || !referrer.includes('/cart')) {
    //     console.log('comes here');
    //     return res.status(401)
    //     .redirect('/api/v1/')

    // }


    let user = req.session.user ? req.session.user : null;

    if (user) {
        let cartData = await Cart.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(user._id)
    
                }
            },
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'product',
                
                }
    
            },
           
    
            {
                $lookup: {
                    from: 'offers',
                    localField: 'product._id',
                    foreignField: 'productIds',
                    as: 'productOffer',
                    pipeline: [
                        {
                            $match: {
                                isListed: true
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'offers',
                    localField: 'product.category.Category',
                    foreignField: 'appliedCategory',
                    as: 'categoryOffer',
                    pipeline: [
                        {
                            $match: {
                                isListed: true
                            }
                        }
                    ]
                }
    
    
            },
            {
                $unwind: '$product'
            },
            {
                $addFields: {
                    shouldUnwindCategory: {
                        $cond: [{
                            $eq: [{
                                $size: '$categoryOffer'
                            }, 0]
                        },
                            false,
                            true
                        ]
                    },
                    shouldUnwindProduct: {
                        $cond: [{
                            $eq: [{
                                $size: '$productOffer'
                            }, 0]
                        },
                            false,
                            true
                        ]
                    }
                }
    
            },
            {
                $unwind: {
                    path: '$productOffer',
                    preserveNullAndEmptyArrays: true
                },
            },
            {
                $unwind: {
                    path: '$categoryOffer',
                    preserveNullAndEmptyArrays: true,
                }
    
            },
            {
                $addFields: {
                  
                    categoryOfferPrice: {
                        $cond: [
                            '$shouldUnwindCategory',
                            {
                                $subtract: ['$product.price',
                                    {
                                        $multiply: ['$product.price',
                                            {
                                                $divide: ['$categoryOffer.discount', 100]
                                            }
                                        ]
                                    }
                                ]
    
                            },
                            null
                        ]
    
                    },
                    productOfferPrice: {
                        $cond: [
                            '$shouldUnwindProduct',
                            {
                                $subtract: ['$product.price',
                                    {
                                        $multiply: ['$product.price',
                                            {
                                                $divide: ['$productOffer.discount', 100]
                                            }
                                        ]
                                    }
                                ]
    
                            },
                            null
                        ]
    
                    },
                   
                }
            },
            {
                $addFields: {
                    minimumPrice: {
                        $round: [
                            {
                                 $min: ['$productOfferPrice', '$categoryOfferPrice', '$product.price']
                                }
                            ]
                       
                    },
                    
                },
               
            },
            
            {
                $project: {
                    categoryOffer: 0,
                    productOffer: 0,
                    shouldUnwindCategory: 0,
                    shouldUnwindProduct: 0,
                    
    
            
                    
                }
            }
    
        ])
     
        let address = await Address.find({ user });
        address = address ?? []
        let coupons = await Coupon.find({ isListed: true })
        let wallet = await Wallet.findOne({ user: user._id }).select('balance');
        coupons = coupons ?? []
        res.render('user/checkoutPage', {  cartData, address, coupons, wallet });

    }




})

const loadProductDetail = asyncHandler(async (req, res) => {

    let productId = req.query['id'];
    console.log(productId)

    let user = req.session.user ? req.session.user : null;
    let product = await Inventory.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId)

            }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'product'
            }

        },
        {
            $lookup: {
                from: 'reviews',
                localField: 'product._id',
                foreignField: 'product',
                as: 'reviews',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'user',
                            foreignField: '_id',
                            as: 'user',
                            pipeline: [{

                                $project: {
                                    name: 1
                                }
                            }]

                        }

                    },
                ]

            }
        },

        {
            $lookup: {
                from: 'offers',
                localField: 'product._id',
                foreignField: 'productIds',
                as: 'productOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'offers',
                localField: 'product.category.Category',
                foreignField: 'appliedCategory',
                as: 'categoryOffer',
                pipeline: [
                    {
                        $match: {
                            isListed: true
                        }
                    }
                ]
            }


        },
        {
            $unwind: '$product'
        },
        {
            $addFields: {
                shouldUnwindCategory: {
                    $cond: [{
                        $eq: [{
                            $size: '$categoryOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                },
                shouldUnwindProduct: {
                    $cond: [{
                        $eq: [{
                            $size: '$productOffer'
                        }, 0]
                    },
                        false,
                        true
                    ]
                }
            }

        },
        {
            $unwind: {
                path: '$productOffer',
                preserveNullAndEmptyArrays: true
            },
        },
        {
            $unwind: {
                path: '$categoryOffer',
                preserveNullAndEmptyArrays: true,
            }

        },
        {
            $addFields: {
                reviewAvg: {
                    $avg: '$reviews.rating'
                },
                totalStock: {
                    $sum: '$sizeVariant.stock'

                },

                categoryOfferPrice: {
                    $cond: [
                        '$shouldUnwindCategory',
                        {
                            $subtract: ['$product.price',
                                {
                                    $multiply: ['$product.price',
                                        {
                                            $divide: ['$categoryOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
                productOfferPrice: {
                    $cond: [
                        '$shouldUnwindProduct',
                        {
                            $subtract: ['$product.price',
                                {
                                    $multiply: ['$product.price',
                                        {
                                            $divide: ['$productOffer.discount', 100]
                                        }
                                    ]
                                }
                            ]

                        },
                        null
                    ]

                },
               
            }
        },
        {
            $addFields: {
                minimumPrice: {
                    $min: ['$productOfferPrice', '$categoryOfferPrice', '$product.price']
                },
                Category: {
                    $first: '$product.category.Category'
                },
                Brand: {
                    $first: '$product.category.Brands'
                },
                Gender: {
                    $first: '$product.category.Gender'
                }

            },
           
        },
        
        {
            $project: {
                categoryOffer: 0,
                productOffer: 0,
                shouldUnwindCategory: 0,
                shouldUnwindProduct: 0

        
                
            }
        }

    ])


    res.status(200).render('user/productDetail', { product: product[0] });



})


const loadProfile = asyncHandler(async (req, res, next) => {
    
    let user = req.session.user ? req.session.user : null;
    if (user) {
        let wallet = await Wallet.findOne({ user: user._id }).populate('user')
        wallet.transactions.sort((a, b) => b.date - a.date)
        let userProfile = await User.aggregate([
            {
                $match: {
                    email: user.email
                }
            },
            {
                $lookup: {
                    from: 'referrels',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'referrels'
                }

            },
            {
                $lookup: {
                    from: 'addresses',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'addresses'
                }
            },





        ])
        console.log(userProfile)
    
        res.render("user/userProfile", {  userProfile: userProfile[0], wallet })
    }




})

const loadAddAddress = asyncHandler(async (req, res) => {
    let user = req.session.user ?? null;
    res.render('user/addAddress');

})

const editAddress = asyncHandler(async (req, res) => {

    let user = req.session.user ? req.session.user : null
    if (user) {
        let id = req.query.id
        req.session.user.editAddressId = id

        let address = await Address.findById({ _id: id })
        res.render('user/editAddress', {address})
    }

})

const loadOrderSuccess = asyncHandler(async (req, res) => {

    let orderId = req.query['orderId'];
    let user = req.session?.user ?? null
    res.locals.orderId = orderId;
    let currentOrder = await Order.findById({
        _id: orderId
    })
        .populate('user')
        .populate('address')

    res.render('user/orderSuccess', {  currentOrder, orderId })


})




const loadWallet = asyncHandler(async (req, res) => {
    let user = req.session.user ?? null;


    res.render('user/userWallet', {  wallet })
})

const loadUserNotifications = asyncHandler(async (req, res) => {

    let user = req.session.user;
    if(!user) {
        res.redirect('/api/v1')
    }
    let notifications =  await Notification.find({recipient: user._id}).sort({createdAt: -1});
    console.log('notifications', notifications);
    res.render('user/notifications', {notifications, page: 0, total: 0})
})

const applyUserReferrel = asyncHandler(async (req, res, next) => {
     console.log('===========================',req.body);
     let code = req.body.code
     let referrel = await Referrel.findOne({code});
     if(!referrel) {
        return res.status(400)
            .json({
                error: true,
                success: false,
                message: 'Incorrect referrel code!'

        })
     }
     let user = req.session.user;

     await Wallet.findOneAndUpdate({
        user: referrel.user
     },
     {
        $inc: {
            balance: 500
        },
        $push: {
            transactions: {
                mode: 'Credit',
                amount: 500,
                description: 'Referrel Offer amount credited'

            }
        }
     }
    )

    await Wallet.findOneAndUpdate({
        user: user._id
     },
     {
        $inc: {
            balance: 200
        },
        $push: {
            transactions: {
                mode: 'Credit',
                amount: 200,
                description: 'Referrel Offer amount credited'

            }
        }
     }
    )

    return res.status(200)
        .json({
            success: true,
            error: false,
            message: 'Referrel applied successfully'
        })

})















module.exports = {
    loadHome,

    loadShop,
    loadWishlist,
    loadCart,
    loadCheckout,
    loadProductDetail,
    loadProfile,
    loadAddAddress,
    editAddress,
    loadOrderSuccess,
    loadUserNotifications,
    loadWallet,
    applyUserReferrel,
    





}
