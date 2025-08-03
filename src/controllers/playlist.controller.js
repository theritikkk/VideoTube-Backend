import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const createPlaylist = asyncHandler(async (req, res) => {

    //TODO: create playlist

    const { name, description } = req.body

    if( !name || !description ) {
        throw new ApiError( 400, " name or description are not mentioned. " );
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    })

    if( !playlist ) {
        throw new ApiError( 501, " Failed to create a playlist. " );
    }

    return res
    .status(200)
    .json(
        new ApiResponse( 200, playlist, " Playlist has been successfully created. ")
    );

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    
    //TODO: get user playlists

    const { name, description } = req.body;
    const { playlistId } = req.params;

    if( !name || !description ) {
        throw new ApiError( 400, " Neither name or description are changed. ");
    }

    if( !isValidObjectId(playlistId) ) {
        throw new ApiError( 400, " The 'playlistId' is not valid. ");
    }

    const playlist = await Playlist.findById( playlistId );

    if( !playlist ) {
        throw new ApiError( 404, " Playlist could not be found. " );
    }

    if( playlist.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError( 400, " Owner can not edit this playlist. As the owner can only edit their own playlist. ");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    );

    return res
    .status(200)
    .json(
        new ApiResponse( 200, updatedPlaylist, " Playlist has been updated. " )
    );

})

const getPlaylistById = asyncHandler(async (req, res) => {
    
    //TODO: get playlist by id

    const { playlistId } = req.params;
    
    if( !isValidObjectId(playlistId) ) {
        throw new ApiError( 400, " Invalid playlistId. ");
    }

    const playlist = await Playlist.findById( playlistId );

    if( !playlist ) {
        throw new ApiError( 404, " Playlist not found. " );
    }

    if( playlist.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError( 400, " Owner can only delete their own playlist. ");
    }

    await Playlist.findByIdAndDelete( playlist?._id )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            " Playlist has been successfully deleted. "
        )
    );

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    
    const { playlistId, videoId } = req.params

    if( !isValidObjectId( playlistId ) ) {
        throw new ApiError( 400, " Invalid playlistId. " );
    }

    if( !isValidObjectId( videoId ) ) {
        throw new ApiError( 400, " Invalid videoId. " );
    }

    const playlist = await Playlist.findById( playlistId );
    const video = await Video.findById( videoId );

    if( !playlist ) {
        throw new ApiError( 404, " Playlist not found. " );
    }

    if( !video ) {
        throw new ApiError( 404, " Video not found. " );
    }

    if( (playlist.owner?.toString() && video.owner.toString()) !== req.user?._id.toString() ) {
        throw new ApiError( 400, " Only owner can add video to this playlist. ");
    }

    // To add a video to a playlist, but only if it's not already in the playlist.

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                video: videoId
            }
            // '$addToSet' is a MongoDB operator that adds 'videoId' to the 'videos' array 
            // only if it's not already present.
            // If 'videoId' is already in the array, nothing happens — prevents duplicates.
        },
        {
            new: true
            // ensuring that the updated playlist document is returned, not the original one.
        }
    );

    if( !updatePlaylist ) {
        throw new ApiError( 400, " Failed to add the video to the playlist. ");
    }

    return res
    .status(200)
    .json(
        new ApiResponse( 200, updatePlaylist, " Added video to playlist successfully. " )
    );

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    
    // TODO: remove video from playlist

    const { playlistId, videoId } = req.params;

    if( !isValidObjectId(playlistId) ) {
        throw new ApiError( 400, " The playlistId is not valid. " );
    }

    if( !isValidObjectId( videoId ) ) {
        throw new ApiError( 400, " The videoId is not valid. " );
    }

    const playlist = await Playlist.findById( playlistId );
    const video = await Video.findById( videoId );

    if( !playlist ) {
        throw new ApiError( 404, " Playlist not found. " );
    }

    if( !video ) {
        throw new ApiError( 404, " Video not found. " );
    }

    if( ( playlist.owner?.toString() && video.owner.toString() ) !== req.user?._id.toString() ) {
        throw new ApiError( 404, " Only owner can remove the video forom this playlist. " );
    }

    const updatedPlaylist = await Playlist.findByIdAndDelete(
        playlistId,
        {
            $pull: {
                videos: videoId,
            },
        },
        {
            new: true,
        },
    );

    // $pull is a MongoDB operator that removes elements from 
    // an array that match a specified value or condition.

    // In this case, it's removing videoId 
    // from the 'videos' array field inside the playlist.

    // { new: true } ->  Ensures that the function returns the updated document, not the old one.
    // So updatedPlaylist will contain the new version with the video removed.


    return res
    .status(200)
    .json(
        new ApiResponse( 200, updatedPlaylist, " Video has been successfully removed form this playlist. ")
    );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    
    // TODO: delete playlist

    const { playlistId } = req.params;

    if( !isValidObjectId(playlistId) ) {
        throw new ApiError( 400, " Invalid playlistId " );
    }

    const playlist = await Playlist.findById( playlistId );

    if( !playlist ) {
        throw new ApiError( 404, " Playlist does not exist. ");
    }

    if( playlist.owner.toString() !== req.user?._id.toString() ) {
        throw new ApiError( 400, " Only the owner can delete this playlist. " );
    }

    await Playlist.findByIdAndDelete( playlistId?._id )

    return res
    .status(200)
    .json(
        new ApiResponse( 200, {}, " Playlist has been successfully deleted. " )
    );

})

const updatePlaylist = asyncHandler(async (req, res) => {
    
    //TODO: update playlist

    const { playlistId } = req.params

    if( !isValidObjectId(playlistId) ) {
        throw new ApiError( 400, " Invalid playlistId. ");
    }

    const playlist = await Playlist.findById( playlistId );

    if( !playlist ) {
        throw new ApiError( 404, " Playlist not found. " );
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId( playlistId )
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        // For each _id in the playlist’s videos array, fetches the corresponding Video document 
        // and puts it inside videos array.
        {
            $match: {
                "videos.isPublished": true
            }
            //  this '$match' is not filtering inside the array, 
            // it only removes entire playlist documents that don’t have any published video.
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
            // Joins the users collection to fetch playlist owner info like username, avatar, etc.
            // Result is in the owner array.
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
            // Adds:
            // 1)   totalVideos: count of videos in the playlist
                
            // 2)   totalViews: sum of views across all videos in the playlist

            // 3)   Flattens owner array to just a single object
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
            // Outputs :- Playlist metadata, Each video in the list by 'videos' , The playlist owner by 'owner' .
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse( 200, playlistVideos[0], " Playlist fetched successfully. " )
    );

})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}