import mongoose, {isValidObjectId} from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    
    // TODO: toggle subscription

    const { channelId } = req.params;

    if( !isValidObjectId( channelId ) ) {
        throw new ApiError( 400, " Invalid channelId " );
    }

    const isSubscribed = await Subscription.findOne(
        {
            subscriber: req.user?._id,
            channel: channelId
        }
    );

    if( isSubscribed ) {
        await Subscription.findByIdAndDelete( isSubscribed?._id );


        return res
        .status(200)
        .json(
            new ApiResponse( 200, { subscribed: false }, " Successfully unsubscribed. " )
        );
    }

    await Subscription.create(
        {
            subscriber: req.user?._id,
            channel: channelId
        }
    );

    return res
    .status(200)
    .json(
        new ApiResponse( 200, { subscribed: true}, " Channel subscribed successfully. " )
    );

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    if( !isValidObjectId( channelId ) ) {
        throw new ApiError( 400, " Invalid channelId. " );
    }

    channelId = new mongoose.Types.ObjectId( channelId );

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: channelId
            }
            // $match: Filter for the current channel's subscribers
            // Filters the subscriptions collection to get entries where people have subscribed to this channel.
            // These documents look like: { channel: <this_channel_id>, subscriber: <user_id> }
        },
        {
            // $lookup: Fetch full subscriber info from users collection
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [

                    {
                        // $lookup: Check if this channel follows back each subscriber
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        }
                        // For each subscriber, checks whom they are subscribed to.
                        //  Goal is to check: 
                        // "Is the current channel (channelId) one of the people this user has subscribed to?"
                    },

                    {
                        $addFields: {

                            // subscribedToSubscriber: true if this channel (channelId) is 
                            // in the subscriber's subscriptions (i.e., they follow back).
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },

                            // subscribersCount: Number of users following this subscriber.
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },

                        },
                    },
                ],
            },
        },
        
        // $unwind: Flatten the 'subscriber' array from $lookup
        {
            $unwind: "$subscriber",
        },
        // Converts subscriber: [ {...} ] into subscriber: { ... }
        // flattening :- turning an array of objects into individual documents -
        // essentially breaking apart the array so each item gets its own document in the result.

        // $project: shows the output
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1,
                },
            },
        },
        // returning only the necessary fields for each subscriber.

    ]);

    return res
    .status(200)
    .json(
        new ApiResponse( 200, subscribers, " Got subscribers successfully. " )
    );

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    
    // To fetch:
    //   1)  All channels this user has subscribed to.
    //   2)  Each channel's user info.
    //   3)  And their latest video.

    const { subscriberId } = req.params

    const subscribedChannels = await Subscription.aggregate([
    
    {
        // $match — Find Subscriptions of the 'User'
        $match: {
            subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
        // Filters the subscriptions collection to find all entries 
        // where the user (subscriberId) is following someone.
        // You get documents like: { subscriber: subscriberId, channel: someChannelId }
    },

    {
        // $lookup — Get Channel (User) Info
        $lookup: {
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "subscribedChannel",

            // Joins the 'users' collection to fetch info about each channel.
            // Adds a 'subscribedChannel' array with the matched 'user' document.

            // The inner pipeline is used to do further lookups for that user.
            pipeline: [

                {
                    // $lookup — Get Only Published Videos of That Channel
                    $lookup: {
                        from: "videos",
                        let: { userId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$owner", "$$userId"] }, // match by owner
                                            { $eq: ["$isPublished", true] }  // only published videos
                                        ]
                                    }
                                }
                            },
                            { $sort: { createdAt: -1 } } // sort by newest first
                        ],
                        as: "videos",
                    },
                    // For each user (channel), it fetches their published videos,
                    // sorted by createdAt in descending order.
                },

                {
                    // $addFields — Gets the Latest Video
                    $addFields: {
                        latestVideo: {
                            $first: "$videos", // picks the latest (first) video after sorting
                        },
                    },
                    // Adds a latestVideo field to the user (channel),
                    // by getting the first video from their 'videos' array.
                },

            ],
        },
    },

    // $unwind — Flatten the Channel
    {
        $unwind: "$subscribedChannel",
    },
    // Converts subscribedChannel: [ {...} ] into a direct object.
    // Makes it easier to project its fields.

    // $project — Clean the Output
    // Returns only the necessary fields for frontend display.
    {
        $project: {

            _id: 0,
            
            subscribedChannel: {
                _id: 1,
                username: 1,
                fullName: 1,
                "avatar.url": 1,

                latestVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },

            },

        },
    },
]);

    return res
    .status(200)
    .json(
        new ApiResponse( 200, subscribedChannels, " Subscribed channels fetched successfully. " )
    );

});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}