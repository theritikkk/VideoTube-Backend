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
            // $match — Filter Tweets by Owner
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
            // Retrieves tweets where owner === userId
            // Only that user’s tweets are processed in the pipeline
        },

        {
            // $lookup — Join with 'users' to Get 'owner' Details
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                // Joins the users collection to get 'user' info for each tweet's 'owner'
                // Adds 'ownerDetails' array to each tweet
                
                // Limits the fetched fields to 'username' and 'avatar.url'
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
            // $lookup — Get 'likes' Info from 'likes' Collection
            $lookup: {
                // Joins the likes collection to find all likes for the tweet
                // Adds them to 'likeDetails' array
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",

                pipeline: [
                    {
                        // Only keeps the likedBy field in each like document
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],

            },
        },

        {
            // $addFields — Add Calculated Fields
            $addFields: {
                
                // likesCount: total number of likes (by counting elements in likeDetails)
                likesCount: {
                    $size: "$likeDetails",
                },

                // ownerDetails: flattens the 'ownerDetails' array to a single object
                ownerDetails: {
                    $first: "$ownerDetails",
                },

                // isLiked: checks if the 'currently logged-in user' liked the 'tweet'
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
            // $sort — Most Recent First
            $sort: {
                createdAt: -1
            }
            // i.e., sorting tweets in descending order of 'time of creation'.
        },

        {
            // only the relevant fields for the frontend
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
        throw new ApiError( 400, " No content was given by the user. " );
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

    if( !isValidObjectId( tweetId ) ) {
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