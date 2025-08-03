import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler( async ( req, res ) => {
    //TODO: create tweet

    const { content } = req.body;

    if( !content ) {
        throw new ApiError( 400, " This no content to tweet. " );
    }

    const tweet = await Tweet.create(
        {
            content,
            owner: req.user?._id
        }
    );

    if( !tweet ) {
        throw new ApiError( 500, " Failed to create new tweet. " );
    }

    return res
    .status(200)
    .json(
        new ApiResponse( 200, tweet, " Tweet has been created successfully. ")
    );

});

const getUserTweets = asyncHandler( async ( req, res ) => {

    // TODO: get user tweets

    const { userId } = req.params;

    if( !isValidObjectId( userId ) ) {
        throw new ApiError( 400, " Invalid userId " );
    }

    const tweets = await Tweet.aggregate([

        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },

        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",

                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],

            },
        },

        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",

                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],

            },
        },

        {
            $addFields: {

                likesCount: {
                    $size: "$likeDetails",
                },

                ownerDetails: {
                    $first: "$ownerDetails",
                },

                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likeDetails.likedBy"]},
                        then: true,
                        else: false
                    }
                }

            },
        },

        {
            $sort: {
                createdAt: -1
            }
        },

        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },

    ]);

    return res
    .status(200)
    .json(
        new ApiResponse( 200, tweets, " Fetched user tweets successfully. ")
    );

});

const updateTweet = asyncHandler( async ( req, res ) => {
    
    //TODO: update tweet

    const { content } = req.body;
    const { tweetId } = req.params;

    if( !content ) {
        throw new ApiError( 400, " No content in the given section. " );
    }

    if( !isValidObjectId( tweetId ) ) {
        throw new ApiError( 400, " Invalid tweetId. " );
    }

    const tweet = await Tweet.findById( tweetId );

    if( !tweet ) {
        throw new ApiError( 404, " Tweet not found. " );
    }

    if( tweet?.owner.toSting() !== req.user?._id.toSting() ) {
        throw new ApiError( 400, " Only owner can edit their own tweets. " );
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        {
            new: true
        },
    );

    if( !newTweet ) {
        throw new ApiError( 500, " Failed to edit tweet. " );
    }

    return res
    .status(200)
    .json(
        new ApiResponse( 200, newTweet, " Tweet has been updated successfully. " )
    );

});

const deleteTweet = asyncHandler( async ( req, res ) => {
    
    //TODO: delete tweet

    const { tweetId } = req.params;

    if( !isValidObjectId( tweetId ) ) {
        throw new ApiError( 400, " Invalid tweetId. " );
    }

    const tweet = await Tweet.findById( tweetId );

    if( !tweet ) {
        throw new ApiError( 404, " Tweet could not be found. " );
    }

    if( tweet?.owner.toSting() !== req.user?._id.toSting() ) {
        throw new ApiError( 400, " Only owner can delete their own tweet. " );
    }

    await Tweet.findByIdAndDelete( tweetId );

    return res
    .status(200)
    .json( 
        new ApiResponse( 200, { tweetId }, " Tweet deleted successfully. " ) 
    );

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}