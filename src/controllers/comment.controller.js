import mongoose, {Schema} from "mongoose"
import { Comment } from "../models/comment.models.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {

    //TODO: get all comments for a video

    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId)

    if( !video ) {
        return ApiError(404, " Video not found. ")
    }

    const commentAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "user",
                // from: "user" → the collection you're joining from (probably meant to be "users" in your schema).
                
                localField: "owner",
                // localField: "owner" → the field in the current document (e.g., comments.owner).

                foreignField: "_id",
                // foreignField: "_id" → the field in the user collection you're matching against.

                as: "owner"
                // as: "owner" → the name of the field where the resulting array of joined users will be stored.


                // It tells MongoDB:
                // “For each document in the current collection (e.g., comments), 
                // look into the user collection and find all documents where:
                // user._id === comment.owner
                // Then, embed those matched users as an array under the field owner.”

            }
        },
        {
            $lookup: {
                from: "likes",                
                // the foreign collection to join with ("likes" collection)

                localField: "_id",            
                // the field in the current collection (likely "comments") to match
                // localField: "_id" → refers to the _id of each comment.

                foreignField: "comment",      
                // the field in the "likes" collection to match against.
                // foreignField: "comment" → refers to the comment field inside the likes collection.

                as: "likes"                   
                // the name of the array field in the result that will contain matched documents
            }

            // likes.comment === comment._id
            // And placing the result in an array named 'likes' on each comment.
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
            // It sorts the documents in descending order of their createdAt timestamp — meaning:
            // Newest comments appear first
            // Oldest comments appear last
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
            // The $project stage in MongoDB is used to select specific fields to include or reshape in the final result.

            // 'content', 'createdAt', 'likesCount', and 'isLiked' will appear as-is in the output
            // 'owner' will be included, but only with these subfields: 'username', 'fullName', 'avatar.url'
            // All other fields in the document will be excluded by default.
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };
    // parseInt(page, 10):
    // Converts the page value (which is usually a string from query params, like "2") into a number.
    // The 10 is the radix/base (base 10 = decimal system).
    // So, "2" becomes 2.

    // parseInt(limit, 10):
    // Same as above. If limit = "10", it becomes 10.

    // page: which page number of results to return
    // limit: how many items per page to return


    const comments = await Comment.aggregatePaginate(
        commentAggregate,
        options
    );

    return res
        .status( 200 )
        .json( new ApiResponse( 200, comments, " Comments fetched successfully " ) );


})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const { videoId } = req.params;
    const { content } = req.body;

    if( !content ) {
        throw new ApiError(400, " Content is required. ");
    }

    const video = Video.findById(videoId)

    if( !video ) {
        throw new ApiError(404, " Video not foound. ");
    }

    const comment = await Comment.create({
        content, 
        video: videoId,
        owner: req.user?._id
    })
    // It creates a new comment document in the MongoDB database using the Mongoose model 'Comment'.

    // comment now exists in your database and is linked to:
    //     A video (videoId)
    //     A user (req.user._id)

    if( !comment ) {
        throw new ApiError(500, " Failed to add comment, please try again later. ")
    }

    return res
    .status(201)
    .json( 
        new ApiResponse(201, comment, " Comment has been successfully added. ")
    );

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const { commentId } = req.params;
    const { content } = req.body;

    if( !content ) {
        throw new ApiError( 400, " Content is not found. ");
    }

    const comment = await Comment.findById( commentId )

    if( !comment ) {
        throw new ApiError( 400, " Comment is not found. ");
    }

    if( comment?.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError( 400, " Only comment can their comments. " );
    }
    // It ensures that only the user who created the comment is allowed to update it.
    // comment?.owner: This is the owner field of the comment — 
    //      it refers to the user who originally posted the comment.
    //      This is usually stored as a MongoDB ObjectId.

    // .toString(): Since both are ObjectIds, converting them to strings ensures a proper comparison.

    // The !== checks if the logged-in user is not the comment owner.


    const updatedComment = await comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if( !updatedComment ) {
        throw new ApiError( 500, " Comment could not be updated. ");
    }

    res
    .status(200)
    .json(
        new ApiResponse( 200, updatedComment ," Comment successfully updated. " )
    );

})

const deleteComment = asyncHandler(async (req, res) => {
    
    // TODO: delete a comment

    const { commentId } = req.params;

    const comment = await comment.findById( commentId )

    if( !comment ) {
        throw new ApiError( 404, " Comment could not be found. " );
    }

    if( comment?.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError( 400, " You can only edit your own comment not others. ");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany(
        {
            comment: commentId,
            likedBy: req.user
        }
    );

    return res
    .status(200)
    .json(
        new ApiResponse( 200, { commentId }, " Comment deleted successfully. ")
    );

})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
