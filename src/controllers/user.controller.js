import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { configDotenv } from "dotenv";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt, { decode } from "jsonwebtoken";
import mongoose from "mongoose";



const generateAccessAndRefreshTokens = async(userId) => {

    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save( {validateBeforeSave: false} )
        // as the time of saving password always gets triggered,
        // so here the refreshToken is specified and the validateBeforeSave: false is used.

        return { accessToken, refreshToken }
        
    } catch (error) {

        throw new ApiError( 500 , " Something went wrong while generating refresh and access token. ")

    }

}



const registerUser = asyncHandler( async (req, res) => {

    // get user details from frontend   - 1
    // validation - not empty           - 2
    // check if user already exits : username, email     - 3
    // check for images, check for avatar       - 4 
    // upload them to cloudinary, avatar        - 5
    // create user object - create entry in db      - 6
    // remove password and refresh token field from response     - 7
    // if ( check for user creation )       - 8
    // return response 
    // else return error



    // get user details from frontend   - 1
    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);


    // validation that the given data is - not empty           - 2
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    // check if user already exits like : username, email       - 3
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError( 409, "User with email or username already exists" )
    }
    // console.log(req.files);


    // check for images, check for avatar                       - 4 
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // to find the path of cover image                          - 4
    let coverImageLocalPath;
    if( req.files && Array.isArray( req.files.coverImage ) && req.files.coverImage.length > 0 ) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    // checking the availabilty of the avatar's local path      - 4
    if (!avatarLocalPath) {
        throw new ApiError( 400, "Avatar file is required" )
    }


    // upload them to cloudinary, avatar        - 5
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // checking if the avatar file is uploaded on cloudinary or not
    if (!avatar) {
        throw new ApiError( 400, "Avatar file is required" )
    }
   

    // create user object - create entry in db 'User'.          - 6
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",      // safe fallback to ""
        email, 
        password,
        username: username.toLowerCase()
    })
    // therefore sending all the data to the DataBase of user.model.js

    // remove password and refresh token field from response     - 7
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    // if ( check for user creation )                             - 8
    // return response - res.status(201).json - meaning the user is successfuly created ( 201 )
    // else return error - ApiError
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }       // this is the else response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

    // return res.status(200).json({
    //     message: "hello ritik "
    // })

} )



const loginUser = asyncHandler( async ( req, res ) => {
    // req body -> data
    // username or email is used for login
    // find the user
    // password check
    // access and refresh token
    // send cookies

    
    // req body -> data
    const {email, username, password} = req.body

    if( !username && !email ) {
        throw new ApiError( 400, " username or password is required. " )
    }


    // username or email is used for login
    // find the user
    const user = await User.findOne( {
        $or: [ {username}, {email} ]
    })

    if( !user ) {
        throw new ApiError( 404, "User does not exist." )
    }


    // password check
    const isPasswordvalid = await user.isPasswordCorrect(password)

    if( !isPasswordvalid ) {
        throw new ApiError( 401, "Invalid user credentials." )
    }

    // at this stage the user and password both are correct and valid
    // make access and refresh token


    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens( user._id )

    const loggedInUser = await User.findById( user._id ).
    select("-password -refreshToken")
    // here we mentioned things we do not need i.e., password, and refreshToken

    const options = {
        httpOnly: true,
        secure: true
    }

    
    // send cookies
    return res
    .status( 200 )
    .cookie( "accessToken", accessToken, options )
    .cookie( "refreshToken", refreshToken, options )
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            " User logged In successfully "
        )
    )

})



const logoutUser = asyncHandler( async( req, res ) => {
    await User.findByIdAndUpdate(

        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document

                // refreshToken: 1 tells MongoDB to remove that field
            }
            // $unset removes a field from a MongoDB document.
        },

        {
            new: true
            // Returns the updated doc (not used here, but safe to include)
        }
    )

    // Cookie options for security
    const options = {
        
        httpOnly: true,     
        // Cookie not accessible via JS (helps prevent XSS) i.e., 
        // Prevents client-side JavaScript from accessing the cookie.
        // Protects against Cross-Site Scripting (XSS) attacks.
        // When this is set, the cookie cannot be accessed using document.cookie in the browser.

        secure: true
        // Only sent over HTTPS
        // The browser will not send the cookie over an insecure (HTTP) connection.
        // This protects the cookie from being intercepted over the network.

        // Always secure: true for production (HTTPS).
        // For localhost testing, you may temporarily set it to false.

    }

    return res
    .status( 200 )
    .clearCookie( "accessToken", options )
    .clearCookie( "refreshToken", options )
    .json( new ApiResponse( 200, {}, " User logged out " ) )


})



const refeshAccessToken = asyncHandler( async( req, res ) => {

    const incomingRefreshToken = req.cookie.
    refreshToken || req.body.refreshToken

    if( !incomingRefreshToken ) {

        throw new ApiError( 401, " Unauthorized request " )
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
    
        )
    
        const user = await User.findById( decodedToken?._id )
    
        if( !user ) {
    
            throw new ApiError( 401, " Invalid refresh token. " )
        }
    
        if( incomingRefreshToken !== user?.refeshToken ) {
            throw new ApiError( 401, " Refresh token is expired or used. " )
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens( user._id )
    
        return res
        .status(200)
        .cookie( "accessToken", accessToken, options )
        .cookie( "refershToken", newRefreshToken, options )
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken: new newRefreshToken},
                " Access Token refereshed. "
            )
        )
        
    } catch (error) {
        throw new ApiError( 401, error?.message || 
            " Invalid refresh token. "
        )
    }


})


const changeCurrentPassword = asyncHandler( async( req, res ) => {
    
    const { oldPassword, newPassword, confirmPassword } = req.body

    const user = await User.findById( req.user?._id )

    const isPasswordCorrect = await user.isPasswordCorrect( oldPassword )


    if( !isPasswordCorrect ) {
        throw new ApiError( 400, " Invalid old password. " )
    }

    user.password = newPassword
    user.save( {validateBeforeSave: false} )

    return res
    .status( 200 )
    .json( new ApiResponse(200, {}, " Password changed successfully. ") )



})


const getCurrentUser = asyncHandler( async(req, res) => {

    return res
    .status(200)
    .json( 200, req.user, " Current user fetched successfully. ")

})


const updateAccountDetails = asyncHandler( async( req, res ) => {
    
    const { fullName, email } = req.body

    if( !fullName || !email ) {
        throw new ApiError(400, " All fields are required. ")
    }

    const user = User.findByIdAndUpdate( 

        req.user?._id,

        {
            $set: {
                fullName,
                email: email
            }
        },

        { new: true }

    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse( 200, user, " Account details updated successfully. "))


    
});


const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})



const updateUserCoverImage = asyncHandler( async( req, res ) => {
    
    const coverImageLocalPath = req.file?.path

    if( !coverImageLocalPath ) {
        throw new ApiError( 400, " Cover image file is missing. ")
    }

    const coverImage = await uploadOnCloudinary( coverImageLocalPath )

    if( !coverImage.url ) {
        throw new ApiError( 400, " Error while uploading cover image. ")
    }

    const user = await User.findByIdAndUpdate(
        
        req.user?._id,
        
        {
            $set: {
                coverImage: coverImage.url
            }
        },

        { new: true }

    ).select( "-password" )

    return res
    .status(200)
    .json(
        new ApiResponse( 200, user, " Cover image updated successfully. ")
    )

})


const getUserChannelProfile = asyncHandler( async( req, res ) => {

    const { username } = req.params
    // req.body — Request payload ( mainly in POST / PUT / PATCH )
    // req.params — URL path parameters

    // Use req.params when value is in the URL path.
    // Use req.body when value is in the request body (POST/PUT).

    if( !username?.trim() ) {
        throw new ApiError( 400, " Username is missing. ")
    }

    const channel = await User.aggregate( [
        // first we matched the user
        {
            $match: {
                username: username?.toLowerCase()

            }
        },

        // then we counted the subscriber
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },

        // then we counted how many have we subscribed.
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },

        // then we added more fields in original user object.
        {
            $addFields: {

                subscribersCount: {
                    $size: "$subscribers"
                },

                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },

                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
                
            }
        },

        // one more pipeline where we have to use project.
        // gives selected things not all at once.
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
        // Your $project is a whitelist of fields you want to return.
        // Use it to selectively control what the frontend/client gets.

    ] )

    if( !channel?.length ) {
        throw new ApiError( 404, " Channel does not exist. ")
    }

    return res
    .status( 200 )
    .json(
        new ApiResponse( 200, channel[0], " User channel fetched successfully. " )
    )


})


const getWatchHistory = asyncHandler( async( req, res ) => {
    const user = await User.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },

        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                pipeline:[

                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",       // all the data is in owner's field
                            pipeline: [

                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }

                            ]
                        }
                    },

                    {   // since, lookup gives array, we try to get the first value.

                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }

                ]
            }
        }

    ])


    return res
    .status( 200 )
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            " Watch history fetched successfully. "
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refeshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}