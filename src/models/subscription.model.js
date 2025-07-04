import mongoose, {model, Schema} from "mongoose";

const subscriptionSchema = new Schema({

    subscriber: {
        type: Schema.Types.ObjectId,    // the one who's subscibing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,    // one who is being subscribed by 'subscriber'
        ref: "User"
    }

}, 
    { timestamps: true } 
)


export const Subscription = mongoose.model( "Subscription", subscriptionSchema )
