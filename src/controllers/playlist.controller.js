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

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                video: videoId
            }
        },
        {
            new: true
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

    return res
    .status(200)
    .json(
        new ApiResponse( 200, updatedPlaylist, " Video has been successfully removed form this playlist. ")
    );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    
    // TODO: delete playlist

    const {playlistId} = req.params
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
        {
            $match: {
                "videos.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
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