import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import mongoose, { isValidObjectId } from "mongoose"


const healthcheck = asyncHandler(async (req, res) => {
    
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { message: " Everything is oK! " },
            "OK"
        )
    );
});

export {
    healthcheck
}
    