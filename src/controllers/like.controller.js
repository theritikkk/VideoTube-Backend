import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {

    //TODO: toggle like on video

    const { videoId } = req.params;

    if( !isValidObjectId(videoId) ) {
        throw new ApiError( 400, " Invalid videoId ")
    }

    const isLikedAlready = await Like.findOne(
        {
            video: videoId,
            likedBy: req.user?._id,
        }
    );

    if( isLikedAlready ) {
        
        await Like.findByIdAndDelete(isLikedAlready._id)


        res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked: false }
            )
        );
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    res
    .status(200)
    .json(
        new ApiResponse(
            200, { isLiked: true }
        )
    );

});

const toggleCommentLike = asyncHandler(async (req, res) => {

    //TODO: toggle like on comment

    const { commentId } = req.params

    if( !isValidObjectId(commentId) ) {
        throw new ApiError( 400, " Invalid commentId. ")
    }

    const likedAlready = await Like.findOne(
        {
            comment: commentId,
            likedBy: req.user?._id,
        }
    );
    
    if( likedAlready ) {
        
        await Like.findByIdAndDelete( likedAlready?._id );

        return res
        .status(200)
        .json(
            new ApiResponse( 200, { isLiked: false } )
        );
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    })

    return res
    .status(200)
    .json( 
        new ApiResponse( 200, { isLiked: true } ) 
    );

});

const toggleTweetLike = asyncHandler(async (req, res) => {

    //TODO: toggle like on tweet

    const { tweetId } = req.params

    if( !isValidObjectId(tweetId) ) {
        throw new ApiError( 400, " twwetId is invalid. " );
    }

    const likedAlready = await Like.findOne(
        {
            tweet: tweetId,
            likedBy: req.user?._id
        }
    )

    if( likedAlready ) {
        
        await Like.findByIdAndDelete(likedAlready?._id)

        res
        .status(200)
        .json(
            new ApiResponse( 200, { tweetId, isLiked: false } )
        );
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    });

    return res
    .status(200)
    .json(
        new ApiResponse( 200, { isLiked: true } )
    );

}
)

const getLikedVideos = asyncHandler(async (req, res) => {

    //TODO: get all liked videos


    // This code:
    // Finds all videos liked by the current user.
    // Fetches those video details from the videos collection.
    // Gets owner info for each video.
    // Sorts by like time (newest first).
    // Projects only the fields needed.
    // Returns this data to the frontend.


    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                
                // Joins each liked video's details from the videos collection (Like.video == Video._id).
                // The result is stored in likedVideo.

                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ]

                // It also performs a nested lookup to get the video owner’s details:
                // Joins users collection where Video.owner == User._id.
                // ownerDetails now contains the video creator's username, avatar, etc.
            }
        },

        {
            $unwind: "$likedVideo",
        },
        // $unwind flattens the ownerDetails array into a single object.
        // an object — required because $lookup always returns an array, even with one result.
        
        {
            $sort: {
                createdAt: -1,
            },
            // This createdAt refers to the Like document’s timestamp (i.e., when the user liked that video).
        },

        // This selects only the fields you want to return to the frontend.
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
                // It removes the outer _id (from Like).
                // Inside likedVideo, it includes only key video details + ownerDetails.
            },
        }
    ]);



    // to modify your aggregation pipeline to group by the first letter of the title
    // const likedVideosAggregateA_to_Z_Alphabatically = await Like.aggregate([    
    //     {
    //         $match: {
    //             likedBy: new mongoose.Types.ObjectId(req.user?._id),
    //         },
    //     },

    //     {
    //         $lookup: {
    //             from: "videos",
    //             localField: "video",
    //             foreignField: "_id",
    //             as: "likedVideo",
    //             pipeline: [
    //                 {
    //                     $lookup: {
    //                         from: "users",
    //                         localField: "owner",
    //                         foreignField: "_id",
    //                         as: "ownerDetails",
    //                     },
    //                 },

    //                 {
    //                     $unwind: "$ownerDetails",
    //                 },
    //             ],
    //         },
    //     },

    //     {
    //         $unwind: "$likedVideo",
    //     },

    //     {
    //         $addFields: {
    //             firstLetter: {
    //                 $toUpper: {
    //                     $substrCP: ["$likedVideo.title", 0, 1],
    //                 },
    //             },
    //         },
    //     },

    //     {
    //         $group: {
    //             _id: "$firstLetter",
    //             videos: {
    //                 $push: {
    //                     _id: "$likedVideo._id",
    //                     title: "$likedVideo.title",
    //                     description: "$likedVideo.description",
    //                     videoFile: "$likedVideo.videoFile.url",
    //                     thumbnail: "$likedVideo.thumbnail.url",
    //                     views: "$likedVideo.views",
    //                     duration: "$likedVideo.duration",
    //                     createdAt: "$likedVideo.createdAt",
    //                     isPublished: "$likedVideo.isPublished",
    //                     ownerDetails: {
    //                         username: "$likedVideo.ownerDetails.username",
    //                         fullName: "$likedVideo.ownerDetails.fullName",
    //                         avatar: "$likedVideo.ownerDetails.avatar.url",
    //                     },
    //                 },
    //             },
    //         },
    //     },

    //     {
    //         $sort: {
    //             _id: 1, // A-Z
    //         },
    //     }
    // ]);



    // sort videos within each alphabetical group, we’ll modify the pipeline 
    // so that each group (A, B, C, etc.) contains a sorted list of liked videos, 
    // ordered by a field like createdAt (newest first) or views (most viewed first).
    // const likedVideosAggregate = await Like.aggregate([
    //     {
    //         $match: {
    //             likedBy: new mongoose.Types.ObjectId(req.user?._id),
    //         },
    //     },
        
    //     {
    //         $lookup: {
    //             from: "videos",
    //             localField: "video",
    //             foreignField: "_id",
    //             as: "likedVideo",
                
    //             pipeline: [
    //                 {
    //                     $lookup: {
    //                         from: "users",
    //                         localField: "owner",
    //                         foreignField: "_id",
    //                         as: "ownerDetails",
    //                     },
    //                 },
    //                 { 
    //                     $unwind: "$ownerDetails" 
    //                 },
    //             ],
    //         },
    //     },
        
    //     { 
    //         $unwind: "$likedVideo" 
    //     },

    //     {
    //         $addFields: {
    //             firstLetter: {
    //                 $toUpper: {
    //                     $substrCP: ["$likedVideo.title", 0, 1],
    //                 },
                        // $substrCP: [ <string>, <start>, <length> ]
                        // <string>: The string you want to extract from.
                        // <start>: The starting position (0-based).
                        // <length>: How many Unicode code points to extract.
    //             },
    //         },
    //     },

    //     {
    //         $group: {
    //             _id: "$firstLetter",
    //             videos: {
    //                 $push: {
    //                     _id: "$likedVideo._id",
    //                     title: "$likedVideo.title",
    //                     description: "$likedVideo.description",
    //                     videoFile: "$likedVideo.videoFile.url",
    //                     thumbnail: "$likedVideo.thumbnail.url",
    //                     views: "$likedVideo.views",
    //                     duration: "$likedVideo.duration",
    //                     createdAt: "$likedVideo.createdAt",
    //                     isPublished: "$likedVideo.isPublished",
    //                     ownerDetails: {
    //                         username: "$likedVideo.ownerDetails.username",
    //                         fullName: "$likedVideo.ownerDetails.fullName",
    //                         avatar: "$likedVideo.ownerDetails.avatar.url",
    //                     },
    //                 },
    //             },
    //         },
    //     },

    //     {
    //         $project: {
    //             _id: 1,
    //             videos: {
    //                 $sortArray: {
    //                     input: "$videos",
    //                     sortBy: { 
    //                         createdAt: -1 
    //                     }, // Newest first
    //                 },
    //             },
    //         },
    //     },

    //     { 
    //         $sort: { _id: 1 } 
    //     }, // A-Z group order
    // ]);
    //      sortBy: { views: -1 }       // Most viewed first

    // $substrCP: ["$likedVideo.title", 0, 1]
    // extracts the first character of the video title, no matter what language or 
    // character it starts with — ensuring grouping like A–Z is accurate even for non-ASCII titles.

    
    // $substrCP: [ <string>, <start>, <length> ]
    // <string>: The string you want to extract from.
    // <start>: The starting position (0-based).
    // <length>: How many Unicode code points to extract.



    // To sort by views, just change this inside the $sortArray:
    // firstLetter: {
    //     $cond: {
    //         if: {
    //             $regexMatch: {

    //                 input: { 
    //                     $substrCP: ["$likedVideo.title", 0, 1] 
    //                 },

    //                 regex: /^[A-Za-z]$/
    //             }
    //         },

    //         then: {
    //             $toUpper: { 
    //                 $substrCP: ["$likedVideo.title", 0, 1] 
    //             }
    //         },

    //         else: "#"
    //     }
    // }




    return res
    .status(200)
    .json(
        new ApiResponse( 200, likedVideosAggregate, " liked videos fetched successfully " )
    );

    // Returns a clean response containing the user's liked videos, with all needed video and creator info.

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}