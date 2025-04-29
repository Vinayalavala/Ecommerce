
import User from '../models/user.js';
import Address from '../models/Address.js';

export const addAddress = async (req, res) => {
    try {
        const { address,userId } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.json({
                success: false,
                message: "User not found"
            });
        }
        await Address.create({
            ...address,
            userId,
        });
        res.json({
            success: true,
            message: "Address added successfully"
        });
    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
};

export const getAddress = async (req, res) => {
    try {
        // Get userId from query parameters instead of the body
        const { userId } = req.query;

        if (!userId) {
            return res.json({
                success: false,
                message: "User ID is required"
            });
        }

        const addresses = await Address.find({ userId });

        if (addresses.length === 0) {
            return res.json({
                success: false,
                message: "Address not found"
            });
        }

        res.json({
            success: true,
            addresses
        });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
}
