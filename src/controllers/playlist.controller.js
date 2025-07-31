import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {

    //TODO: create playlist

    const { name, description } = req.body


})

const getUserPlaylists = asyncHandler(async (req, res) => {
    
    //TODO: get user playlists

    const {userId} = req.params
})

const getPlaylistById = asyncHandler(async (req, res) => {
    
    //TODO: get playlist by id

    const {playlistId} = req.params
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    
    const {playlistId, videoId} = req.params

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    
    // TODO: remove video from playlist

    const {playlistId, videoId} = req.params

})

const deletePlaylist = asyncHandler(async (req, res) => {
    
    // TODO: delete playlist

    const {playlistId} = req.params
})

const updatePlaylist = asyncHandler(async (req, res) => {
    
    //TODO: update playlist

    const {playlistId} = req.params
    const {name, description} = req.body
    
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