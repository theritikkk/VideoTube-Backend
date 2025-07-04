import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { configDotenv } from "dotenv";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt, { decode } from "jsonwebtoken";



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

        throw new ApiError( 500 , " Something went wrong while generating refresh ans access token. ")

    }

}



const registerUser = asyncHandler( async (req, res) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exits : username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // if ( check for user creation )
    // return response 
    // else return error

    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if( req.files && Array.isArray( req.files.coverImage ) && req.files.coverImage.length > 0 ) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

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

    const {email, username, password} = req.body

    if( !username && !email ) {
        throw new ApiError( 400, " username or password is required. " )
    }

    const user = await User.findOne( {
        $or: [ {username}, {email} ]
    })

    if( !user ) {
        throw new ApiError( 404, "User does not exist." )
    }

    const isPasswordvalid = await user.isPasswordCorrect(password)

    if( !isPasswordvalid ) {
        throw new ApiError( 401, "Invalid user credentials." )
    }

    // at this stage the user and password both are correct and valid
    // make access and refresh token


    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens( user._id )

    const loggedInUser = await User.findById( user._id ).
    select("-password -refreshToken")
    // here we mentioned things we do not need i.e., password, and refreshToken

    const options = {
        httpOnly: true,
        secure: true
    }

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
    User.findByIdAndUpdate(

        req.user._id,

        {
            $set: {
                refreshToken: undefined
            }
        },

        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status( 200 )
    .clearCookie( "accessToken", options )
    .clearCookie( "refreshToken", options )
    .json( new ApiResponse( 200, {}, " User logged out " ) )


})



const refeshAccessToken = asyncHandler( async( req, res ) => {

    const incomingRefreshToken = req.cookie.
    refeshToken || req.body.refeshToken

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
    
    const coverImageLocalPath = rq.file?.path

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





export { 
    registerUser,
    loginUser,
    logoutUser,
    refeshAccessToken,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}