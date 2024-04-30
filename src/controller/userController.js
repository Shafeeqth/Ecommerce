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
const {calculateDistance} = require('../helpers/calculateDeliveryCharge');


const loadHome = asyncHandler(async (req, res) => {
    let user = req.session.user ? req.session.user : null;

    res.status(200).render('user/homePage', { user });


})


const loadShop = asyncHandler(async (req, res) => {
    console.log(req.query)



    let user = req.session.user ? req.session.user : null;

    let page = parseInt(req.query.page) -1 || 0;
    let limit = parseInt(req.query.limit) || 7;
    let category = req.query.Category || 'All';
    let size = req.query.size || 'All';
    let brand = req.query.brand || 'All'
    

    let categories = await Category.find({})
    console.log('category', categories)

    let inventory = await Inventory.aggregate([
        {
            $lookup: {
                from: 'products', 
                localField: 'product',
                foreignField: '_id',
                as: 'product'
            }
        },
        {
            $match: {
                'product.isListed': true
            }
        },
        {
            $unwind: '$product'
        }
    ])
        

    //     {
    //         $match: {
    //             isListed: true
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: 'inventories',
    //             localField: '_id',
    //             foreignField: 'product',
    //             as: 'inventory'
    //         }
    //     },
    //     {
    //         $unwind: '$inventory'
    //     }, 
        
    //     {
    //         $group: {
    //             _id: '$_id',
    //             title: { $first: '$title'},
    //             category: { $first: '$category'},
    //             mrpPrice: { $first: '$mrpPrice'},
    //             price: {$first: '$price'},
    //             description: {$first: '$description'},
    //             color: {$first: '$color'},
    //             images: {$first: '$images'},
    //             soldCount: {$first: '$soldCount'},
    //             productReviews: {$first: '$productReviews'},
    //             totalStock: {$sum : '$inventory.sizeVariant'}

    //         }
    //     }

    // ])

        
    //     {
    //         $lookup: {
    //             from: 'product',
    //             foreignField: '_id',
    //             localField: 'product',
    //             as: 'product'
    //         },

    //     },
            
    //     {
    //         $match : {
    //             'product.isListed': true
    //         },
    //     },
        
    //     {
    //         $unwind: '$sizeVariant'
    //     },
    //     {
    //         $unwind: '$sizeVariant.sizeVariant'
    //     },
    //     // {$group: {
    //     //     _id: '$_id',
    //     //     totalStock: {$sum: '$sizeVariant.stock'}

    //     // }},

    //     {
    //         $project: {
    //             title: 1,
    //             category: '$category.Brands',
    //             mrpPrice: 1,
    //             price: 1,
    //             description: 1,
    //             color: 1,
    //             images: 1,
    //             soldCount:1,
    //             productReviews: 1,
    //             sizeVariant: 1
               


    //         }
    //     }
        

    // ])
    console.log(inventory)


    let count = await Product.find().count()
    if (req.query.sort) {
        let sort = req.query.sort == 'low-to-High' ?
            { 'product.price': 1 } : req.query.sort == 'high to Low' ?
                { 'product.price': -1 } : req.query.sort == 'date' ?
                    { 'product.createdAt': -1 } : null

        let products = await Inventory.aggregate([
            
            {
                $lookup: {
                    from: "products",
                    localField: "product",
                    foreignField: "_id",
                    as: "product",
                    pipeline: [
                       
                        {
                            $match: {
                                isListed: true
                            }
                        },
                        {
                            $project: {
                                product: 1,
                                category: 'product.category.Brands',
                                

                            }
                        }
                       


                    ]
                }
            },
            

        ])
        console.log(inventory)


        return res.render('user/shopPage', { user, products, count });

    }



    // let products = await Product.find({ isListed: true, })


    res.render('user/shopPage', { user, inventory, count , categories});



})

const loadWishlist = asyncHandler(async (req, res) => {


    let user = req.session.user ? req.session.user : null;
    let wishlist;
    if (user) {
        wishlist = await Wishlist.find({ user: user._id }).populate('product');


        res.render('user/wishlistPage', { user, wishlist });


    } else {
        wishlist = null;

        res.render('user/wishlistPage', { user, wishlist });

    }



})

const loadCart = asyncHandler(async (req, res) => {

    let user = req.session.user ? req.session.user : null;
    let cart = await Cart.findOne({ user }).populate('products.product');
    console.log((cart))

    res.render('user/cartPage', { user, cart });


})

const loadCheckout = asyncHandler(async (req, res) => {

    let user = req.session.user ? req.session.user : null;

    if (user) {
        let cartData = await Cart.findOne({ user }).populate('products.product')
        let address = await Address.find({ user });
        console.log(cartData, address)
        res.render('user/checkoutPage', { user, cartData, address });

    }



})

const loadProductDetail = asyncHandler(async (req, res) => {


    let user = req.session.user ? req.session.user : null;
    let product = await Inventory.findOne({ product: req.query.id })
                .populate('product');
    console.log(product)

    res.status(200).render('user/productDetail', { user, product });



})


const loadProfile = asyncHandler(async (req, res, next) => {

    let user = req.session.user ? req.session.user : null;
    if (user) {


        let userProfile = await User.aggregate([
            {
                $match: {
                    email: user.email
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




        console.log('user1', userProfile)

        res.render("user/userProfile", { user, userProfile })
    } else {

    }


})

const loadAddAddress = asyncHandler(async (req, res) => {
    let user = req.session.user ?? null;
    res.render('user/addAddress', { user });

})

const editAddress = asyncHandler(async (req, res) => {

    let user = req.session.user ? req.session.user : null
    if (user) {
        let id = req.query.id
        req.session.user.editAddressId = id

        let address = await Address.findById({ _id: id })
        console.log(address)
        res.render('user/editAddress', { user, address })
    } else {


    }



})

const loadOrderSuccess = asyncHandler(async (req, res) => {

    let user = req.session?.user ?? null
    let currentOrder = await Order.findById({
        _id: req.session.user.currentOrderId
    })
        .populate('user')
        .populate('address')
    console.log(currentOrder)

    res.render('user/orderSuccess', { user, currentOrder })


})

const loadMyOrders = asyncHandler(async (req, res) => {

    let user = req.session?.user;
    if (!user) return res.redirect('/api/v1/')

    let order = await Order.find({
        user: user._id
    })
        .populate('address')
        .populate('orderedItems.product')
        .sort({createdAt: -1})
    console.log('my order ==========================================',JSON.stringify(order))

    res
        .render('user/myOrders',
            {
                order,
                user,
            })


})

const loadSingleOrderDetails = asyncHandler(async (req, res, next) => {
    let user = req.session.user
    let id = req.query.id;
    let order = await Order.findById({ _id: id })
        .populate('user')
        .populate('orderedItems.product')
        .sort({ createdAt: -1 });
    console.log(order)
    res.render('user/singleOrderDetails',{user, order})
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
    loadMyOrders,
    loadSingleOrderDetails,


}
