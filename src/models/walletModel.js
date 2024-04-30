
const mongoose = require('mongoose');

const walletSchema  = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    balance: {
        type: Number,
        default: 0,
    },
    transactions: [{
        amount: {
            type: Number,
            required: true,
        },
        mode: {
            type: String,
            enum: ['Debit', 'Credit'],
        },
        date:{
            type: Date,
            default: Date.now(),
        }
    }]
},{
    timestamps: true
});
const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = {
    Wallet,
    
}