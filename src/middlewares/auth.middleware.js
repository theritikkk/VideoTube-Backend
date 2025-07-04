
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt, { decode } from "jsonwebtoken";


export const verifyJWT = asyncHandler( async( req, res, next ) => {
    
    // sometimes res is not repesent then _ is used it its place

    try {

        const token = req.cookies?.accessToken || req.header
        ("Authorization")?.replace("Bearer", "")
    
        if( !token ) {
            throw new ApiError( 401, " Unauthorized request " )
        }
        
        const decodedToken = jwt.verify( token, process.env.ACCESS_TOKEN_SECRET )
    
        const user = await User.findById( decodedToken?._id ).select("-password -refeshToken")
    
        if( !user ) {
            throw new ApiError( 401, " Invalid Access Token " )
        }
    
        req.user = user;

        next()

    } catch (error) {

        throw new ApiError( 401, error?.message || " Invalid access token ")
    }




} )